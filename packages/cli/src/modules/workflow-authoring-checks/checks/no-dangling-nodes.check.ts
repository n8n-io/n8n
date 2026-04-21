import { Service } from '@n8n/di';
import { NodeConnectionTypes, getChildNodes, isTriggerNode } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

import { WORKFLOW_CHECK_TYPES } from '../workflow-authoring-checks.constants';
import type {
	WorkflowAuthoringCheckSeverity,
	WorkflowCheckConfigSchema,
	WorkflowCheckContext,
	WorkflowCheckType,
	WorkflowCheckViolation,
} from '../workflow-authoring-checks.types';

@Service()
export class NoDanglingNodesCheck implements WorkflowCheckType {
	readonly type = WORKFLOW_CHECK_TYPES.NoDanglingNodes;

	readonly static = true;

	readonly title = 'No dangling nodes';

	readonly description =
		'Every enabled node must be reachable from at least one enabled trigger via main connections.';

	readonly defaultSeverity: WorkflowAuthoringCheckSeverity = 'warning';

	readonly configSchema: WorkflowCheckConfigSchema = { fields: [] };

	constructor(private readonly nodeTypes: NodeTypes) {}

	validateConfig(_config: unknown): Record<string, never> {
		// static check doesn't have config
		return {};
	}

	async evaluate(ctx: WorkflowCheckContext): Promise<WorkflowCheckViolation[]> {
		const allTriggerNames = new Set<string>();
		const enabledTriggerNames = new Set<string>();
		for (const node of ctx.nodes) {
			if (!this.isTrigger(node.type, node.typeVersion)) continue;
			allTriggerNames.add(node.name);
			if (!node.disabled) enabledTriggerNames.add(node.name);
		}

		if (allTriggerNames.size === 0) return [];

		const reachable = new Set<string>(enabledTriggerNames);
		for (const triggerName of enabledTriggerNames) {
			const descendants = getChildNodes(ctx.connections, triggerName, NodeConnectionTypes.Main);
			for (const name of descendants) reachable.add(name);
		}

		const violations: WorkflowCheckViolation[] = [];
		for (const node of ctx.nodes) {
			if (node.disabled) continue;
			if (allTriggerNames.has(node.name)) continue;
			if (reachable.has(node.name)) continue;

			violations.push({
				message: `Node "${node.name}" (${node.type}) is not reachable from any trigger.`,
				nodeIds: [node.id],
				data: {
					nodeName: node.name,
					nodeType: node.type,
				},
			});
		}

		return violations;
	}

	private isTrigger(nodeType: string, typeVersion: number): boolean {
		try {
			const description = this.nodeTypes.getByNameAndVersion(nodeType, typeVersion).description;
			return isTriggerNode(description);
		} catch {
			return false;
		}
	}
}
