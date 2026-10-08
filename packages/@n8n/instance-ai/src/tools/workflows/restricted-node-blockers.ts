import { describeRestrictionScope } from '@n8n/ai-utilities/node-catalog';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { ValidationWarning } from './workflow-validation-warnings';
import type { InstanceAiContext, RestrictedNodeSummary } from '../../types';

export const NODE_TYPE_RESTRICTED_CODE = 'node_type_restricted';
export const NODE_TYPE_RESTRICTED_REASON = 'node_type_restricted';

/** Nothing was saved. The user decides the replacement, so the builder must not pick one. */
export const RESTRICTED_NODE_GUIDANCE =
	'Nothing was saved. A policy restricts these node types. Do not retry with the same types and do not swap in another node on your own. Tell the user which type is restricted and ask what to use instead, then build again with their choice.';

/**
 * The nodes of a built workflow whose type a policy denies. The save refuses these, so the
 * builder learns before the save and can ask the user what to use instead.
 *
 * Types the saved workflow already has pass, as at the save: a policy change never makes an
 * existing workflow uneditable.
 */
export async function findRestrictedNodeBlockers(
	context: InstanceAiContext,
	workflow: WorkflowJSON,
	savedWorkflow: WorkflowJSON | undefined,
): Promise<{ blocking: ValidationWarning[]; restricted: RestrictedNodeSummary[] }> {
	const none = { blocking: [], restricted: [] };
	if (!context.nodeService.listRestricted) return none;

	let restricted: RestrictedNodeSummary[];
	try {
		restricted = await context.nodeService.listRestricted();
	} catch {
		return none;
	}
	if (restricted.length === 0) return none;

	const restrictedByName = new Map(restricted.map((node) => [node.name, node]));
	const alreadySaved = new Set((savedWorkflow?.nodes ?? []).map((node) => node.type));

	const blocking: ValidationWarning[] = [];
	const found = new Map<string, RestrictedNodeSummary>();
	for (const node of workflow.nodes ?? []) {
		const match = restrictedByName.get(node.type);
		if (!match || alreadySaved.has(node.type)) continue;

		found.set(match.name, match);
		blocking.push({
			code: NODE_TYPE_RESTRICTED_CODE,
			message: `${match.displayName} (${match.name}) is restricted by ${describeRestrictionScope(match.scope)}.`,
			...(node.name ? { nodeName: node.name } : {}),
			severity: 'error',
		});
	}

	return { blocking, restricted: [...found.values()] };
}
