import { Logger } from '@n8n/backend-common';
import { NodesConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { NodeHelpers, normalizeNodeShape } from 'n8n-workflow';

import {
	DeprecatedNodesError,
	type DeprecatedNodeViolation,
} from '@/errors/response-errors/deprecated-nodes.error';
import { NodeTypes } from '@/node-types';

/**
 * Refuses adding a deprecated node or changing one in place. Removing a
 * deprecated node, or moving it to a non-deprecated type or version, is allowed.
 * Does nothing when `N8N_DEPRECATED_NODES_BLOCK` is off.
 */
@Service()
export class DeprecatedNodesValidationService {
	constructor(
		private readonly logger: Logger,
		private readonly nodesConfig: NodesConfig,
		private readonly nodeTypes: NodeTypes,
	) {}

	/** Throws if any node is deprecated. Use where there is no stored version to compare with. */
	validateOnCreate(nodes: INode[], workflowId?: string): void {
		if (!this.nodesConfig.blockDeprecated) return;

		const violations: DeprecatedNodeViolation[] = [];
		for (const node of nodes) {
			if (this.deprecatedDescription(node)) {
				violations.push({ kind: 'added', nodeName: node.name, nodeType: node.type });
			}
		}

		this.throwIfViolations(violations, workflowId);
	}

	/**
	 * Throws if a deprecated node is new, or differs from the stored node with the
	 * same id other than in position.
	 */
	validateOnUpdate(incomingNodes: INode[], existingNodes: INode[], workflowId?: string): void {
		if (!this.nodesConfig.blockDeprecated) return;

		const existingById = new Map(existingNodes.map((n) => [n.id, n]));
		const violations: DeprecatedNodeViolation[] = [];

		for (const incoming of incomingNodes) {
			const description = this.deprecatedDescription(incoming);
			if (!description) continue;

			const before = existingById.get(incoming.id);
			// A stored node that was not deprecated counts as adding one, so a node cannot be moved back onto a deprecated version.
			if (!before || !this.deprecatedDescription(before)) {
				violations.push({ kind: 'added', nodeName: incoming.name, nodeType: incoming.type });
				continue;
			}

			if (
				!isEqual(this.frozenFields(before, description), this.frozenFields(incoming, description))
			) {
				violations.push({ kind: 'edited', nodeName: incoming.name, nodeType: incoming.type });
			}
		}

		this.throwIfViolations(violations, workflowId);
	}

	/** Puts a node in the shape the editor saves, so a re-save of an untouched node compares equal. */
	private frozenFields(node: INode, description: INodeTypeDescription) {
		const {
			position: _position,
			notes,
			onError,
			continueOnFail,
			disabled,
			credentials,
			parameters,
			...rest
		} = normalizeNodeShape(node);

		return {
			...rest,
			parameters:
				NodeHelpers.getNodeParameters(
					description.properties,
					parameters,
					false,
					false,
					node,
					description,
				) ?? {},
			credentials: credentials ?? {},
			disabled: disabled === true,
			continueOnFail: continueOnFail === true,
			onError: onError ?? 'stopWorkflow',
			notes: notes ?? '',
		};
	}

	private throwIfViolations(violations: DeprecatedNodeViolation[], workflowId?: string) {
		if (violations.length === 0) return;

		this.logger.warn('Rejected deprecated nodes', {
			workflowId,
			violations: violations.map(({ kind, nodeType }) => ({ kind, nodeType })),
		});

		throw new DeprecatedNodesError(this.formatMessage(violations), { violations });
	}

	private deprecatedDescription(node: INode): INodeTypeDescription | undefined {
		try {
			const { description } = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			return description.deprecated === true ? description : undefined;
		} catch {
			// Unknown node types can't be deprecated by us; they're handled elsewhere.
			return undefined;
		}
	}

	private formatMessage(violations: DeprecatedNodeViolation[]): string {
		const lines = violations.map((v) => {
			const verb = v.kind === 'added' ? 'use a' : 'modify a';
			return `Cannot ${verb} "${v.nodeType}" node ("${v.nodeName}"): this node type is deprecated.`;
		});

		const suffix = ' Replace the node with a supported alternative or remove it from the workflow.';

		return lines.join(' ') + suffix;
	}
}
