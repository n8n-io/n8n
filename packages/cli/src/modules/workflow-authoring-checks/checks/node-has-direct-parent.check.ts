import { Service } from '@n8n/di';
import { NodeConnectionTypes, UserError, getParentNodes } from 'n8n-workflow';

import { WORKFLOW_CHECK_TYPES } from '../workflow-authoring-checks.constants';
import type {
	WorkflowAuthoringCheckSeverity,
	WorkflowCheckConfigSchema,
	WorkflowCheckContext,
	WorkflowCheckType,
	WorkflowCheckViolation,
} from '../workflow-authoring-checks.types';

export interface NodeHasDirectParentConfig {
	childNodeType: string;
	parentNodeType: string;
}

@Service()
export class NodeHasDirectParentCheck implements WorkflowCheckType {
	readonly type = WORKFLOW_CHECK_TYPES.NodeHasDirectParent;

	readonly title = 'Node has direct parent';

	readonly description =
		'Every enabled node of the configured child type must have a node of the configured parent type connected directly to its main input.';

	readonly defaultSeverity: WorkflowAuthoringCheckSeverity = 'warning';

	readonly configSchema: WorkflowCheckConfigSchema = {
		fields: [
			{
				name: 'childNodeType',
				label: 'Child node type',
				kind: 'nodeType',
				required: true,
				helpText: 'The node type whose direct main input will be validated.',
			},
			{
				name: 'parentNodeType',
				label: 'Parent node type',
				kind: 'nodeType',
				required: true,
				helpText: 'The node type that must be connected directly to the child node.',
			},
		],
	};

	validateConfig(config: unknown): NodeHasDirectParentConfig {
		if (typeof config !== 'object' || config === null) {
			throw new UserError('Check config must be an object.');
		}
		const { childNodeType, parentNodeType } = config as Record<string, unknown>;
		if (typeof childNodeType !== 'string' || childNodeType.length === 0) {
			throw new UserError('childNodeType must be a non-empty string.');
		}
		if (typeof parentNodeType !== 'string' || parentNodeType.length === 0) {
			throw new UserError('parentNodeType must be a non-empty string.');
		}
		return { childNodeType, parentNodeType };
	}

	async evaluate(ctx: WorkflowCheckContext, rawConfig: unknown): Promise<WorkflowCheckViolation[]> {
		const config = this.validateConfig(rawConfig);
		const violations: WorkflowCheckViolation[] = [];
		const nodesByName = new Map(ctx.nodes.map((n) => [n.name, n]));
		const children = ctx.nodes.filter((n) => n.type === config.childNodeType && !n.disabled);

		for (const child of children) {
			const directParents = getParentNodes(
				ctx.connectionsByDestination,
				child.name,
				NodeConnectionTypes.Main,
				1,
			);

			const hasParent = directParents.some((name) => {
				const parent = nodesByName.get(name);
				return parent?.type === config.parentNodeType && !parent.disabled;
			});

			if (!hasParent) {
				violations.push({
					message: `Node "${child.name}" (${config.childNodeType}) has no ${config.parentNodeType} node as its direct main input. Connect a ${config.parentNodeType} node directly to this node.`,
					nodeIds: [child.id],
					data: {
						childNodeName: child.name,
						childNodeType: config.childNodeType,
						parentNodeType: config.parentNodeType,
					},
				});
			}
		}

		return violations;
	}
}
