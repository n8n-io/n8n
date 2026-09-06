import type { LocationQuery, RouteLocationRaw } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	ensurePersonalProjectId,
	provisionLaunchedThread,
} from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import {
	INSTANCE_AI_SOURCE_QUERY,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_VIEW,
} from '@/features/ai/instanceAi/constants';

const WORKFLOW_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Guard body for `/assistant/new?workflowId=…`, returning `undefined` when the
 * query is not a workflow deep link. Fetches the workflow itself — that
 * validates access and supplies the name and home project. URL-supplied text
 * must never reach the agent prompt (same reasoning as the numeric-only
 * templateId validation).
 */
export async function launchWorkflowThread(
	query: LocationQuery,
): Promise<RouteLocationRaw | undefined> {
	const workflowIdRaw = query.workflowId;
	if (typeof workflowIdRaw !== 'string') return undefined;
	// Distinct from the guard above: a malformed id must stop here rather than
	// fall through to the templateId guard.
	if (!WORKFLOW_ID_PATTERN.test(workflowIdRaw)) return { name: INSTANCE_AI_VIEW };
	const workflowId = workflowIdRaw;
	const editorFallback = { name: VIEWS.WORKFLOW, params: { workflowId } };

	let name: string;
	let projectId: string | null | undefined;
	try {
		const workflow = await useWorkflowsListStore().fetchWorkflow(workflowId);
		name = workflow.name;
		// The response includes `homeProject` only when workflow sharing is licensed.
		// Without sharing, a user can open only their own workflows. Their personal
		// project is then the correct home.
		projectId = workflow.homeProject?.id ?? (await ensurePersonalProjectId());
	} catch {
		return editorFallback;
	}
	if (!projectId) return editorFallback;

	const source =
		query[INSTANCE_AI_SOURCE_QUERY] === 'workflow_list_button'
			? 'workflow_list_button'
			: 'workflow_list_auto';
	const threadId = await provisionLaunchedThread(
		projectId,
		{ message: '', attachments: [{ type: 'workflow', id: workflowId, name }] },
		{ source, origin: 'internal', sourceContext: { workflowId } },
	);
	if (!threadId) return editorFallback;

	return { name: INSTANCE_AI_THREAD_VIEW, params: { threadId } };
}
