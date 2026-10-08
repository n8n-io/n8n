import { describeRestrictionScope } from '@n8n/ai-utilities/node-catalog';

import type { InstanceAiContext, RestrictedNodeSummary } from '../../types';

/** What the model reads: it must not build with these types, and it knows why. */
export function describeRestricted(nodes: readonly RestrictedNodeSummary[]) {
	return nodes.map((node) => ({
		name: node.name,
		displayName: node.displayName,
		scope: node.scope,
		note: `Restricted by ${describeRestrictionScope(node.scope)}. Do not build with it.`,
	}));
}

/** Tells the host about the restricted types a tool call found. Never throws. */
export function reportRestricted(
	context: InstanceAiContext,
	toolCallId: string | undefined,
	nodes: readonly RestrictedNodeSummary[],
): void {
	if (!toolCallId || nodes.length === 0) return;

	try {
		context.onRestrictedNodes?.(toolCallId, [...nodes]);
	} catch {
		// The notice is a hint for the chat. A failure must not break the tool call.
	}
}

export async function findRestricted(
	context: InstanceAiContext,
	match: (restricted: readonly RestrictedNodeSummary[]) => RestrictedNodeSummary[],
): Promise<RestrictedNodeSummary[]> {
	if (!context.nodeService.listRestricted) return [];

	try {
		return match(await context.nodeService.listRestricted());
	} catch {
		// Discovery still works without the hint.
		return [];
	}
}

/** The restricted types among `nodeTypes`, by exact type name. */
export async function findRestrictedByName(
	context: InstanceAiContext,
	nodeTypes: readonly string[],
): Promise<RestrictedNodeSummary[]> {
	const wanted = new Set(nodeTypes);
	return await findRestricted(context, (restricted) =>
		restricted.filter((node) => wanted.has(node.name)),
	);
}
