import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { NodeError, NodeApiError, NodeOperationError } from 'n8n-workflow';

import { useRootStore } from '@n8n/stores/useRootStore';
import { chatWithAssistant } from '@/features/ai/assistant/assistant.api';
import type { ChatRequest } from '@/features/ai/assistant/assistant.types';
import { useTelemetry } from '@/app/composables/useTelemetry';

import { parseExplainErrorResponse, type ExplainErrorResult } from './explainError.prompt';

export type ExplainErrorState = 'idle' | 'loading' | 'ready' | 'error';

type ErrorLike = NodeError | NodeApiError | NodeOperationError;

/**
 * Extracts plain-text content from any of the assistant's response message
 * shapes. The backend uses `message` for chat-style replies, `summary` for
 * structured headings, and `agent-suggestion` for next-step suggestions — we
 * collapse them all into a single buffer that the prompt parser then
 * interprets as fenced JSON or raw text.
 */
function extractText(message: ChatRequest.ResponsePayload['messages'][number]): string {
	if (!('role' in message) || message.role !== 'assistant') return '';
	if (message.type === 'message') return message.text;
	if (message.type === 'summary') return message.content;
	if (message.type === 'agent-suggestion') return message.text;
	return '';
}

/**
 * Builds the `init-error-helper` payload that the AI assistant backend
 * uses for one-shot error analysis. Mirrors the payload built by the
 * existing "Ask n8n AI" flow but stripped to the minimum context the
 * backend requires — the goal here is a fast, self-contained popover,
 * not a full chat session.
 */
function buildInitErrorHelperPayload(error: ErrorLike): ChatRequest.InitErrorHelper {
	const node = error.node;
	if (!node) {
		throw new Error('Cannot build error-helper payload without a node');
	}
	const simplifiedError: ChatRequest.ErrorContext['error'] = {
		name: error.name,
		message: error.message,
	};
	if ('type' in error && typeof error.type === 'string') {
		simplifiedError.type = error.type;
	}
	if (error.description) {
		simplifiedError.description = error.description;
	}
	if (error.stack) {
		simplifiedError.stack = error.stack;
	}
	return {
		role: 'user',
		type: 'init-error-helper',
		user: { firstName: 'there' },
		error: simplifiedError,
		node,
	};
}

function fingerprintError(error: ErrorLike): string {
	const node = error.node;
	const nodeKey = node ? `${node.type}:${node.id ?? node.name ?? ''}` : 'unknown';
	const message = error.message ?? '';
	return `${nodeKey}|${message}`;
}

export const useExplainErrorStore = defineStore('explainError', () => {
	const state = ref<ExplainErrorState>('idle');
	const result = ref<ExplainErrorResult | undefined>(undefined);
	const lastFingerprint = ref<string | undefined>(undefined);
	const abortController = ref<AbortController | undefined>(undefined);

	const rootStore = useRootStore();
	const telemetry = useTelemetry();

	function reset(): void {
		abortController.value?.abort();
		abortController.value = undefined;
		state.value = 'idle';
		result.value = undefined;
		lastFingerprint.value = undefined;
	}

	async function run(error: ErrorLike): Promise<void> {
		// Cancel any in-flight request before starting a new one, otherwise
		// a late onDone from the previous run could overwrite the new result.
		abortController.value?.abort();

		const fingerprint = fingerprintError(error);
		lastFingerprint.value = fingerprint;
		state.value = 'loading';
		result.value = undefined;

		const controller = new AbortController();
		abortController.value = controller;

		// Yield so callers can observe the 'loading' state before the
		// (possibly synchronous, in tests) streaming callbacks fire.
		await Promise.resolve();

		const payload: ChatRequest.RequestPayload = {
			payload: buildInitErrorHelperPayload(error),
		};

		let buffer = '';

		await new Promise<void>((resolve) => {
			chatWithAssistant(
				rootStore.restApiContext,
				payload,
				(chunk: ChatRequest.ResponsePayload) => {
					for (const message of chunk.messages ?? []) {
						buffer += extractText(message);
					}
				},
				() => {
					if (controller.signal.aborted) {
						resolve();
						return;
					}
					const trimmed = buffer.trim();
					if (trimmed.length === 0) {
						telemetry.track('User used Explain this error', {
							node_type: error.node?.type ?? 'unknown',
							outcome: 'error',
						});
						state.value = 'error';
						result.value = undefined;
						resolve();
						return;
					}
					result.value = parseExplainErrorResponse(buffer);
					telemetry.track('User used Explain this error', {
						node_type: error.node?.type ?? 'unknown',
						result_kind: result.value?.kind ?? 'unknown',
						outcome: 'success',
					});
					state.value = 'ready';
					resolve();
				},
				(err: Error) => {
					if (err.name === 'AbortError') {
						resolve();
						return;
					}
					telemetry.track('User used Explain this error', {
						node_type: error.node?.type ?? 'unknown',
						outcome: 'error',
					});
					state.value = 'error';
					result.value = undefined;
					resolve();
				},
				controller.signal,
			);
		});
	}

	async function explain(error: ErrorLike): Promise<void> {
		const fingerprint = fingerprintError(error);
		if (state.value === 'ready' && lastFingerprint.value === fingerprint) {
			return;
		}
		if (state.value === 'loading' && lastFingerprint.value === fingerprint) {
			return;
		}
		await run(error);
	}

	async function retry(error: ErrorLike): Promise<void> {
		await run(error);
	}

	return {
		state,
		result,
		explain,
		retry,
		reset,
	};
});
