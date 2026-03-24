import { getActivePinia } from 'pinia';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useAIGatewayStore } from './aiGateway.store';

/** Minimal execution shape for runData + workflow nodes (matches push `SimplifiedExecution`). */
type ExecutionForGatewayUsage = Pick<
	IExecutionResponse,
	'workflowId' | 'workflowData' | 'data' | 'id'
>;

const LM_CHAT_GATEWAY = 'lmChatN8nAiGateway';
const OPENROUTER_APP_GATEWAY = 'openRouterAiGateway';

function isAiGatewayNodeType(type: string): boolean {
	return type.endsWith(LM_CHAT_GATEWAY) || type.endsWith(OPENROUTER_APP_GATEWAY);
}

/**
 * Count AI Gateway nodes that produced run data in this execution (prototype usage).
 */
export function countAiGatewayNodesInExecution(execution: ExecutionForGatewayUsage): number {
	const runData = execution.data?.resultData?.runData;
	const nodes = execution.workflowData?.nodes;
	if (!runData || !nodes?.length) return 0;
	const byName = new Map(nodes.map((n) => [n.name, n]));
	let count = 0;
	for (const nodeName of Object.keys(runData)) {
		if (!runData[nodeName]?.length) continue;
		const node = byName.get(nodeName);
		if (node && isAiGatewayNodeType(node.type)) count++;
	}
	return count;
}

/**
 * First executed gateway node's `model` parameter, if any.
 */
export function firstGatewayModelFromExecution(
	execution: ExecutionForGatewayUsage,
): string | undefined {
	const runData = execution.data?.resultData?.runData;
	const nodes = execution.workflowData?.nodes;
	if (!runData || !nodes?.length) return undefined;
	const byName = new Map(nodes.map((n) => [n.name, n]));
	for (const nodeName of Object.keys(runData)) {
		if (!runData[nodeName]?.length) continue;
		const node = byName.get(nodeName);
		if (!node || !isAiGatewayNodeType(node.type)) continue;
		const model = node.parameters?.model;
		if (typeof model === 'string' && model.length > 0) return model;
	}
	return undefined;
}

/**
 * Records prototype usage + credit decrement on the server when gateway nodes ran.
 * No-op if Pinia is unavailable or no gateway activity.
 */
export async function recordAiGatewayPrototypeUsageFromExecution(
	execution: ExecutionForGatewayUsage,
): Promise<void> {
	const calls = countAiGatewayNodesInExecution(execution);
	if (calls === 0) return;

	const pinia = getActivePinia();
	if (!pinia) return;

	const store = useAIGatewayStore(pinia);
	await store.recordPrototypeUsage({
		resolvedModel: firstGatewayModelFromExecution(execution),
		calls,
		workflowId: execution.workflowId,
		executionId: execution.id,
	});
}
