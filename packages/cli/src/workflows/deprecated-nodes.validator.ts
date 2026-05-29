import { NodesConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import type { INode } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NodeTypes } from '@/node-types';

type Violation =
	| { kind: 'added'; nodeName: string; nodeType: string }
	| { kind: 'edited'; nodeName: string; nodeType: string };

/**
 * Refuses workflow create/update operations that add new instances of a
 * deprecated node type, or that modify an existing deprecated node in place.
 *
 * Existing workflows continue to run unchanged — this validator only blocks
 * mutations. Deleting a deprecated node, moving it on the canvas, or replacing
 * it with a non-deprecated version are all allowed (the last case is the
 * intended migration path for version-level deprecation, e.g. Postgres v1 → v2).
 *
 * Gated by `N8N_DEPRECATED_NODES_BLOCK` (default on). When disabled the
 * validator is a no-op so operators can disable enforcement if needed.
 */
@Service()
export class DeprecatedNodesValidator {
	constructor(
		private readonly nodesConfig: NodesConfig,
		private readonly nodeTypes: NodeTypes,
	) {}

	/**
	 * Throws if the incoming workflow contains any deprecated node. Use on
	 * create and import paths where there is no prior workflow state.
	 */
	validateOnCreate(nodes: INode[]): void {
		if (!this.nodesConfig.blockDeprecated) return;

		const violations: Violation[] = [];
		for (const node of nodes) {
			if (this.isDeprecated(node)) {
				violations.push({ kind: 'added', nodeName: node.name, nodeType: node.type });
			}
		}

		if (violations.length > 0) {
			throw new BadRequestError(this.formatError(violations));
		}
	}

	/**
	 * Throws if the incoming workflow adds a new deprecated node, or modifies
	 * the configuration of an existing one. Identity is matched by node `id`.
	 *
	 * Allowed:
	 *  - keeping a deprecated node untouched (same content)
	 *  - moving a deprecated node on the canvas (position-only change)
	 *  - replacing a deprecated node with a non-deprecated one at the same id
	 *    (the migration path for version-level deprecation)
	 *  - deleting a deprecated node entirely
	 */
	validateOnUpdate(incomingNodes: INode[], existingNodes: INode[]): void {
		if (!this.nodesConfig.blockDeprecated) return;

		const existingById = new Map(existingNodes.map((n) => [n.id, n]));
		const violations: Violation[] = [];

		for (const incoming of incomingNodes) {
			if (!this.isDeprecated(incoming)) continue;

			const before = existingById.get(incoming.id);
			if (!before || !this.isDeprecated(before)) {
				// Node is new in this update, or its (type, typeVersion) tuple just
				// crossed into deprecated territory — either way, treated as adding.
				violations.push({ kind: 'added', nodeName: incoming.name, nodeType: incoming.type });
				continue;
			}

			if (this.hasMeaningfulChange(before, incoming)) {
				violations.push({ kind: 'edited', nodeName: incoming.name, nodeType: incoming.type });
			}
		}

		if (violations.length > 0) {
			throw new BadRequestError(this.formatError(violations));
		}
	}

	private isDeprecated(node: INode): boolean {
		try {
			const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			return nodeType?.description?.deprecated === true;
		} catch {
			// Unknown node types can't be deprecated by us — they're handled elsewhere.
			return false;
		}
	}

	private hasMeaningfulChange(before: INode, after: INode): boolean {
		// Position is purely visual — allow users to rearrange the canvas while
		// they're working towards removing the deprecated node.
		return !isEqual(this.stripIgnored(before), this.stripIgnored(after));
	}

	private stripIgnored(node: INode): Omit<INode, 'position'> {
		const { position: _position, ...rest } = node;
		return rest;
	}

	private formatError(violations: Violation[]): string {
		const lines = violations.map((v) => {
			const verb = v.kind === 'added' ? 'add a new' : 'modify a';
			return `Cannot ${verb} "${v.nodeType}" node ("${v.nodeName}"): this node type is deprecated.`;
		});

		const suffix =
			' Replace the node with a supported alternative (e.g. the "Code" node) or remove it from the workflow.';

		return lines.join(' ') + suffix;
	}
}
