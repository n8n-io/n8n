import type { WorkflowSuggestionSource, WorkflowSuggestionLifecycleResult } from '@n8n/api-types';
import isEqual from 'lodash/isEqual';
import { z } from 'zod';

import { ConflictError } from '@/errors/response-errors/conflict.error';

import type { WorkflowSuggestion } from './database/workflow-suggestion.entity';

export const suggestionSourceSchema = z
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

export function sourceOf(suggestion: WorkflowSuggestion): WorkflowSuggestionSource {
	return {
		sourceKey: suggestion.sourceKey,
		workflowId: suggestion.workflowId,
		backgroundUserId: suggestion.backgroundUserId,
		expectedBaseline: suggestion.expectedBaseline,
	};
}

export function assertSameSource(suggestion: WorkflowSuggestion, source: WorkflowSuggestionSource) {
	if (!isEqual(sourceOf(suggestion), source))
		throw new ConflictError('Suggestion source does not match.');
}

export function lifecycleResult(suggestion: WorkflowSuggestion): WorkflowSuggestionLifecycleResult {
	return {
		source: sourceOf(suggestion),
		suggestionId: suggestion.id,
		state: suggestion.state,
		submittedRevision: suggestion.submittedRevision,
		closedReason: suggestion.closedReason,
		content: suggestion.payload === null ? 'expired' : 'available',
	};
}

export function preparingContent(suggestion: WorkflowSuggestion, revision: number) {
	if (suggestion.state !== 'preparing' || suggestion.payload === null) {
		throw new ConflictError('Suggestion is no longer available for editing.');
	}
	if (suggestion.revision !== revision) throw new ConflictError('Suggestion revision has changed.');
	return suggestion.payload;
}

export function requireSubmittable(suggestion: WorkflowSuggestion, revision: number) {
	const payload = preparingContent(suggestion, revision);
	if (payload.validation?.revision !== revision || payload.validation.requiredChecks !== 'passed') {
		throw new ConflictError('Validate the selected suggestion revision before submission.');
	}
	if (
		isEqual(payload.original.nodes, payload.candidate.nodes) &&
		isEqual(payload.original.connections, payload.candidate.connections)
	) {
		throw new ConflictError('The suggestion has no workflow changes.');
	}
	return payload;
}
