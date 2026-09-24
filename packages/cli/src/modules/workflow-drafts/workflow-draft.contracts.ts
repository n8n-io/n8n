import type { WorkflowDraftSource, WorkflowDraftLifecycleResult } from '@n8n/api-types';
import isEqual from 'lodash/isEqual';
import { z } from 'zod';

import { ConflictError } from '@/errors/response-errors/conflict.error';

import type { WorkflowDraft } from './database/workflow-draft.entity';

export const draftSourceSchema = z
	.object({
		sourceKey: z.string().min(1).max(255),
		workflowId: z.string().min(1).max(36),
		backgroundUserId: z.string().uuid(),
		expectedBaseline: z
			.object({
				savedVersionId: z.string().uuid(),
				publishedVersionId: z.string().uuid(),
				checksum: z.string().regex(/^[a-f0-9]{64}$/),
			})
			.strict(),
	})
	.strict();

export function sourceOf(draft: WorkflowDraft): WorkflowDraftSource {
	return {
		sourceKey: draft.sourceKey,
		workflowId: draft.workflowId,
		backgroundUserId: draft.backgroundUserId,
		expectedBaseline: draft.expectedBaseline,
	};
}

export function assertSameSource(draft: WorkflowDraft, source: WorkflowDraftSource) {
	if (!isEqual(sourceOf(draft), source)) throw new ConflictError('Draft source does not match.');
}

export function lifecycleResult(draft: WorkflowDraft): WorkflowDraftLifecycleResult {
	return {
		source: sourceOf(draft),
		draftId: draft.id,
		state: draft.state,
		submittedRevision: draft.submittedRevision,
		closedReason: draft.closedReason,
		content: draft.payload === null ? 'expired' : 'available',
	};
}

export function preparingContent(draft: WorkflowDraft, revision: number) {
	if (draft.state !== 'preparing' || draft.payload === null) {
		throw new ConflictError('Draft is no longer available for editing.');
	}
	if (draft.revision !== revision) throw new ConflictError('Draft revision has changed.');
	return draft.payload;
}

export function requireSubmittable(draft: WorkflowDraft, revision: number) {
	const payload = preparingContent(draft, revision);
	if (payload.validation?.revision !== revision || payload.validation.requiredChecks !== 'passed') {
		throw new ConflictError('Validate the selected draft revision before submission.');
	}
	if (
		isEqual(payload.original.nodes, payload.candidate.nodes) &&
		isEqual(payload.original.connections, payload.candidate.connections)
	) {
		throw new ConflictError('The draft has no workflow changes.');
	}
	return payload;
}
