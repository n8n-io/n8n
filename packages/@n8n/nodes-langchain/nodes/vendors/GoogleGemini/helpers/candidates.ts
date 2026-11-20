import { OperationalError, UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import type { GenerateContentResponse } from './interfaces';

export type Candidates = NonNullable<GenerateContentResponse['candidates']>;

const generateContentResponseSchema = z
	.object({
		promptFeedback: z
			.object({ blockReason: z.string().optional(), blockReasonMessage: z.string().optional() })
			.passthrough()
			.optional(),
		candidates: z
			.array(
				z
					.object({ content: z.object({ parts: z.array(z.unknown()) }).passthrough() })
					.passthrough(),
			)
			.optional(),
	})
	.passthrough();

export function assertGenerateContentResponse(
	response: unknown,
): asserts response is GenerateContentResponse {
	if (!generateContentResponseSchema.safeParse(response).success) {
		throw new OperationalError('Invalid response format from Gemini API');
	}
}

export function assertResponseHasCandidates(
	response: GenerateContentResponse,
): asserts response is GenerateContentResponse & { candidates: Candidates } {
	if (Array.isArray(response.candidates) && response.candidates.length) return;

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
