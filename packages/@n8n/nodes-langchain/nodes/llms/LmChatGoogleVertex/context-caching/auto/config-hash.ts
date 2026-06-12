import type { BaseMessage } from '@langchain/core/messages';
import { createHash } from 'node:crypto';

import { getFirstSystemMessagePlainText, stableStringify } from '../utils';

export type InvocationParamsForHash = {
	model?: string;
	tools?: unknown;
	tool_choice?: unknown;
	allowed_function_names?: unknown;
};

export function buildHashPayload(
	messages: BaseMessage[],
	location: string,
	params: InvocationParamsForHash,
): Record<string, unknown> {
	return {
		allowed_function_names: params.allowed_function_names ?? null,
		location,
		model: params.model ?? '',
		systemInstructionText: getFirstSystemMessagePlainText(messages),
		tool_choice: params.tool_choice ?? null,
		tools: params.tools ?? null,
	};
}

export function computeConfigHash(
	messages: BaseMessage[],
	location: string,
	params: InvocationParamsForHash,
): string {
	const payload = buildHashPayload(messages, location, params);
	return createHash('sha256').update(stableStringify(payload)).digest('hex');
}
