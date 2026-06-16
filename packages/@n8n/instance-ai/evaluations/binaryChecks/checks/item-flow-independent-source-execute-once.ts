import type { WorkflowNodeResponse } from '../../clients/n8n-client';
import type { BinaryCheck, BinaryCheckContext } from '../types';
import { HTTP_REQUEST_TYPE, forEachConnection, isTriggerNode } from '../utils';

const SINGLE_EXECUTION_PROMPT_PATTERNS = [
	/fetch(?:ed)? only once/i,
	/fetch(?:ed)? .* once/i,
	/only once for the whole/i,
	/not once for each/i,
	/shared context/i,
	/execute once/i,
];

const MULTI_ITEM_ANCESTOR_HINTS = [
	/filter/i,
	/split/i,
	/loop/i,
	/item list/i,
	/items/i,
	/launch tasks/i,
	/due tasks/i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getItemFlowAnnotations(ctx: BinaryCheckContext): Record<string, unknown> {
	const itemFlow = ctx.annotations?.itemFlow;
	return isRecord(itemFlow) ? itemFlow : {};
}

function getStringArrayAnnotation(ctx: BinaryCheckContext, key: string): string[] {
	const value = getItemFlowAnnotations(ctx)[key];
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];
}

function requiresSingleExecution(ctx: BinaryCheckContext): boolean {
	const annotatedNodes = getStringArrayAnnotation(ctx, 'singleExecutionNodes');
	if (annotatedNodes.length > 0) return true;
	return SINGLE_EXECUTION_PROMPT_PATTERNS.some((pattern) => pattern.test(ctx.prompt));
}

function nodeHaystack(node: WorkflowNodeResponse): string {
	return `${node.name} ${node.type} ${JSON.stringify(node.parameters ?? {})}`;
}

function isIndependentSourceCandidate(
	node: WorkflowNodeResponse,
	ctx: BinaryCheckContext,
): boolean {
	const annotatedNodes = new Set(getStringArrayAnnotation(ctx, 'singleExecutionNodes'));
	if (annotatedNodes.has(node.name)) return true;

	const haystack = nodeHaystack(node).toLowerCase();
	return node.type === HTTP_REQUEST_TYPE && haystack.includes('release');
}

function collectParents(connections: Record<string, unknown>): Map<string, Set<string>> {
	const parents = new Map<string, Set<string>>();
	forEachConnection(connections, (source, _connectionType, link) => {
		const existing = parents.get(link.node) ?? new Set<string>();
		existing.add(source);
		parents.set(link.node, existing);
	});
	return parents;
}

function hasLikelyMultiItemAncestor(
	nodeName: string,
	nodeByName: Map<string, WorkflowNodeResponse>,
	parentsByNode: Map<string, Set<string>>,
	seen = new Set<string>(),
): boolean {
	const parents = parentsByNode.get(nodeName);
	if (!parents) return false;

	for (const parentName of parents) {
		if (seen.has(parentName)) continue;
		seen.add(parentName);

		const parent = nodeByName.get(parentName);
		if (!parent) continue;

		const haystack = nodeHaystack(parent);
		if (
			!isTriggerNode(parent.type) &&
			MULTI_ITEM_ANCESTOR_HINTS.some((pattern) => pattern.test(haystack))
		) {
			return true;
		}

		if (hasLikelyMultiItemAncestor(parentName, nodeByName, parentsByNode, seen)) {
			return true;
		}
	}

	return false;
}

export const itemFlowIndependentSourceExecuteOnce: BinaryCheck = {
	name: 'item_flow_independent_source_execute_once',
	description: 'Independent source fetches do not multiply across incoming items',
	kind: 'deterministic',
	dimension: 'parameter_correctness',
	run(workflow, ctx) {
		if (!requiresSingleExecution(ctx)) return { pass: true, applicable: false };

		const nodes = workflow.nodes ?? [];
		const nodeByName = new Map(nodes.map((node) => [node.name, node]));
		const parentsByNode = collectParents(workflow.connections ?? {});
		const issues = nodes
			.filter((node) => isIndependentSourceCandidate(node, ctx))
			.filter((node) => node.executeOnce !== true)
			.filter((node) => hasLikelyMultiItemAncestor(node.name, nodeByName, parentsByNode))
			.map(
				(node) =>
					`"${node.name}" is downstream of an item-producing path but executeOnce is not true`,
			);

		if (issues.length === 0) return { pass: true };

		return {
			pass: false,
			comment: `Independent item-flow sources should run once for shared context: ${issues.join('; ')}`,
		};
	},
};
