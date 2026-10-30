import {
	isSafeObjectKey,
	type InstanceAiWorkflowDraft,
	type InstanceAiWorkflowDraftPayload,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

/** An unsaved workflow the builder wrote, shown on the canvas until the save replaces it. */
export interface WorkflowDraft {
	filePath: string;
	/** The saved workflow the source file was bound to when the draft was made. */
	workflowId?: string;
	revision: number;
	workflow: InstanceAiWorkflowDraft;
	/** Set when a build saved this file. The saved canvas replaces the draft once it loads. */
	savedWorkflowId?: string;
}

export type WorkflowDraftsByFilePath = Record<string, WorkflowDraft>;

const DRAFT_TAB_PREFIX = 'draft:';

export function draftTabId(filePath: string): string {
	return `${DRAFT_TAB_PREFIX}${filePath}`;
}

/** The saved workflow a draft belongs to, if it has one yet. */
export function getDraftWorkflowId(draft: WorkflowDraft): string | undefined {
	return draft.savedWorkflowId ?? draft.workflowId;
}

export function applyWorkflowDraft(
	drafts: WorkflowDraftsByFilePath,
	payload: InstanceAiWorkflowDraftPayload,
): WorkflowDraftsByFilePath {
	if (!isSafeObjectKey(payload.filePath)) return drafts;
	const current = drafts[payload.filePath];
	if (current && current.revision >= payload.revision) return drafts;
	return { ...drafts, [payload.filePath]: { ...payload } };
}

function toSavedSource(result: unknown) {
	if (!isRecord(result) || result.success !== true) return undefined;
	const { filePath, workflowId } = result;
	return typeof filePath === 'string' && typeof workflowId === 'string'
		? { filePath, workflowId }
		: undefined;
}

/** Mark the draft of the file a successful build result saved. */
export function settleWorkflowDraft(
	drafts: WorkflowDraftsByFilePath,
	buildResult: unknown,
): WorkflowDraftsByFilePath {
	const saved = toSavedSource(buildResult);
	if (!saved || !Object.hasOwn(drafts, saved.filePath)) return drafts;
	const draft = drafts[saved.filePath];
	return { ...drafts, [saved.filePath]: { ...draft, savedWorkflowId: saved.workflowId } };
}

/** Remove the drafts that the saved workflow replaced. */
export function dismissWorkflowDrafts(
	drafts: WorkflowDraftsByFilePath,
	workflowId: string,
): WorkflowDraftsByFilePath {
	const entries = Object.entries(drafts);
	const remaining = entries.filter(([, draft]) => draft.savedWorkflowId !== workflowId);
	return remaining.length === entries.length ? drafts : Object.fromEntries(remaining);
}
