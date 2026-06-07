import { NodesConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import type { INode } from 'n8n-workflow';

import {
	DeprecatedNodesError,
	type DeprecatedNodeViolation,
} from '@/errors/response-errors/deprecated-nodes.error';
import { NodeTypes } from '@/node-types';

/**
 * A deprecated node can only be removed or migrated off the deprecated
 * version — adding a new deprecated node, or modifying one in place, is
 * refused. Edits to other nodes in the workflow are unaffected.
 *
 * Gated by `N8N_DEPRECATED_NODES_BLOCK` (default off); a no-op when off.
 */
@Service()
export class DeprecatedNodesValidationService {
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

		const violations: DeprecatedNodeViolation[] = [];
		for (const node of nodes) {
			if (this.isDeprecated(node)) {
				violations.push({ kind: 'added', nodeName: node.name, nodeType: node.type });
			}
		}

		if (violations.length > 0) {
			throw new DeprecatedNodesError(this.formatMessage(violations), { violations });
		}
	}

	/**
	 * Throws if the incoming workflow adds a new deprecated node, or changes
	 * an existing one in any way. Identity is matched by node `id`.
	 *
	 * Allowed:
	 *  - keeping a deprecated node fully untouched
	 *  - replacing a deprecated node with a non-deprecated one at the same id
	 *    (the migration path for version-level deprecation)
	 *  - deleting a deprecated node entirely
	 *
	 * Blocked:
	 *  - adding a deprecated node
	 *  - any in-place change to a deprecated node (parameters, name, position,
	 *    typeVersion downgrade, etc.). The only way to "change" a deprecated
	 *    node is to remove it or upgrade it off the deprecated version.
	 */
	validateOnUpdate(incomingNodes: INode[], existingNodes: INode[]): void {
		if (!this.nodesConfig.blockDeprecated) return;

		const existingById = new Map(existingNodes.map((n) => [n.id, n]));
		const violations: DeprecatedNodeViolation[] = [];

		for (const incoming of incomingNodes) {
			if (!this.isDeprecated(incoming)) continue;

			const before = existingById.get(incoming.id);
			if (!before || !this.isDeprecated(before)) {
				// Node is new in this update, or its (type, typeVersion) tuple just
				// crossed into deprecated territory — either way, treated as adding.
				violations.push({ kind: 'added', nodeName: incoming.name, nodeType: incoming.type });
				continue;
			}

			if (!isEqual(before, incoming)) {
				violations.push({ kind: 'edited', nodeName: incoming.name, nodeType: incoming.type });
			}
		}

		if (violations.length > 0) {
			throw new DeprecatedNodesError(this.formatMessage(violations), { violations });
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

	private formatMessage(violations: DeprecatedNodeViolation[]): string {
		return violations
			.map((v) => {
				const verb = v.kind === 'added' ? 'add a new' : 'modify a';
				const replacement = this.getReplacementDisplayName(v.nodeType);
				const fix = replacement
					? `Replace it with the ${replacement} node or remove it from the workflow.`
					: 'Replace it with a supported alternative or remove it from the workflow.';
				return `Cannot ${verb} "${v.nodeType}" node ("${v.nodeName}"): this node type is deprecated. ${fix}`;
			})
			.join(' ');
	}

	/** Display name of the node type configured as this node's replacement, if any. */
	private getReplacementDisplayName(nodeType: string): string | undefined {
		try {
			const replacementType =
				this.nodeTypes.getByNameAndVersion(nodeType)?.description?.replacedByNodeType;
			if (!replacementType) return undefined;
			return this.nodeTypes.getByNameAndVersion(replacementType)?.description?.displayName;
		} catch {
			return undefined;
		}
	}
}
