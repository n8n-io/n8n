import { OperationalError, UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';

import type { GenerateContentResponse } from './interfaces';

export type Candidates = NonNullable<GenerateContentResponse['candidates']>;

export function assertResponseHasCandidates(
	response: GenerateContentResponse,
): asserts response is GenerateContentResponse & { candidates: Candidates } {
	if (response.candidates?.length) return;

	const feedback: unknown = response.promptFeedback;
	const blockReason = isRecord(feedback) ? feedback.blockReason : undefined;

	if (typeof blockReason !== 'string') {
		throw new OperationalError('Gemini returned an empty response');
	}

	const detail = isRecord(feedback) ? feedback.blockReasonMessage : undefined;

	throw new UserError(`Gemini blocked the prompt (reason: ${blockReason})`, {
		description: typeof detail === 'string' ? detail : undefined,
	});
}
