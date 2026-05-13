import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { NodeError, NodeApiError, NodeOperationError } from 'n8n-workflow';

import { useRootStore } from '@n8n/stores/useRootStore';
import { chatWithAssistant } from '@/features/ai/assistant/assistant.api';
import type { ChatRequest } from '@/features/ai/assistant/assistant.types';
import { useTelemetry } from '@/app/composables/useTelemetry';

import {
	buildExplainErrorQuestion,
	parseExplainErrorResponse,
	type ExplainErrorResult,
} from './explainError.prompt';

export type ExplainErrorState = 'idle' | 'loading' | 'ready' | 'error';

type ErrorLike = NodeError | NodeApiError | NodeOperationError;

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
			payload: {
				role: 'user',
				type: 'init-support-chat',
				user: { firstName: 'there' },
				question: buildExplainErrorQuestion(error),
			},
		};

		let buffer = '';

		await new Promise<void>((resolve) => {
			chatWithAssistant(
				rootStore.restApiContext,
				payload,
				(chunk: ChatRequest.ResponsePayload) => {
					for (const message of chunk.messages ?? []) {
						if (message.type === 'message') {
							buffer += message.text;
						}
					}
				},
				() => {
					if (controller.signal.aborted) {
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
