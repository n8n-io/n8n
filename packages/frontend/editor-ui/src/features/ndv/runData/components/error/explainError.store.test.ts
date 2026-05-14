import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import type { NodeError } from 'n8n-workflow';

const apiSpy: Mock = vi.fn();
const telemetryTrack: Mock = vi.fn();

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	chatWithAssistant: (...args: unknown[]) => apiSpy(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: { baseUrl: '', sessionId: 's', pushRef: 'p' },
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

import { useExplainErrorStore } from './explainError.store';

const node = {
	id: 'n1',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4,
	position: [0, 0],
	parameters: {},
};

const sampleError = {
	name: 'NodeOperationError',
	message: 'Authorization failed',
	description: 'Check creds',
	node,
} as unknown as NodeError;

const fencedJson = [
	'```json',
	'{ "summary": "Auth failed.", "culprit": "API key", "nextStep": "Rotate the key." }',
	'```',
].join('\n');

describe('useExplainErrorStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		apiSpy.mockReset();
		telemetryTrack.mockReset();
	});

	it('starts idle', () => {
		const store = useExplainErrorStore();
		expect(store.state).toBe('idle');
		expect(store.result).toBeUndefined();
	});

	it('transitions idle -> loading -> ready on a successful one-shot', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: fencedJson }],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		const promise = store.explain(sampleError);
		expect(store.state).toBe('loading');
		await promise;
		expect(store.state).toBe('ready');
		expect(store.result).toEqual({
			kind: 'structured',
			summary: 'Auth failed.',
			culprit: 'API key',
			nextStep: 'Rotate the key.',
		});
	});

	it('transitions idle -> loading -> error on failure', async () => {
		apiSpy.mockImplementation((_ctx, _payload, _onMessage, _onDone, onError) => {
			onError(new Error('boom'));
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		expect(store.state).toBe('error');
		expect(store.result).toBeUndefined();
	});

	it('does not re-call the API when the same error is explained twice', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: fencedJson }],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		await store.explain(sampleError);
		expect(apiSpy).toHaveBeenCalledTimes(1);
	});

	it('re-calls the API when retry() is invoked', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: fencedJson }],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		await store.retry(sampleError);
		expect(apiSpy).toHaveBeenCalledTimes(2);
	});

	it('accumulates streaming chunks before parsing', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: '```json\n{ "summary"' }],
			});
			onMessage({
				sessionId: 'sid',
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: ': "ok", "culprit": "c", "nextStep": "n" }\n```',
					},
				],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		expect(store.state).toBe('ready');
		expect(store.result).toEqual({
			kind: 'structured',
			summary: 'ok',
			culprit: 'c',
			nextStep: 'n',
		});
	});

	it('reset() returns the store to idle', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: fencedJson }],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		store.reset();
		expect(store.state).toBe('idle');
		expect(store.result).toBeUndefined();
	});

	it('emits a telemetry event with outcome=success on a structured response', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: fencedJson }],
			});
			onDone();
		});
		const store = useExplainErrorStore();
		await store.explain(sampleError);
		expect(telemetryTrack).toHaveBeenCalledWith(
			'User used Explain this error',
			expect.objectContaining({ outcome: 'success', result_kind: 'structured' }),
		);
	});

	it('emits a telemetry event with outcome=error on failure', async () => {
		apiSpy.mockImplementation((_ctx, _payload, _onMessage, _onDone, onError) => {
			onError(new Error('boom'));
		});
		const store = useExplainErrorStore();
		await store.explain(sampleError);
		expect(telemetryTrack).toHaveBeenCalledWith(
			'User used Explain this error',
			expect.objectContaining({ outcome: 'error' }),
		);
	});

	it('calls the API again for a different error fingerprint', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: fencedJson }],
			});
			onDone();
		});

		const otherError = {
			name: 'NodeOperationError',
			message: 'Different failure mode',
			description: 'Check creds',
			node: { ...node, id: 'n2', name: 'Slack' },
		} as unknown as NodeError;

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		await store.explain(otherError);
		expect(apiSpy).toHaveBeenCalledTimes(2);
	});

	it('does not transition to error state when the API aborts', async () => {
		apiSpy.mockImplementation((_ctx, _payload, _onMessage, _onDone, onError) => {
			const aborted = new Error('aborted');
			aborted.name = 'AbortError';
			onError(aborted);
		});
		const store = useExplainErrorStore();
		await store.explain(sampleError);
		expect(store.state).not.toBe('error');
	});

	it('reset() aborts an in-flight request so its onDone is a no-op', async () => {
		let capturedOnDone: (() => void) | undefined;
		apiSpy.mockImplementation((_ctx, _payload, _onMessage, onDone) => {
			capturedOnDone = onDone;
			// Intentionally do not call onDone yet — simulate an in-flight stream.
		});

		const store = useExplainErrorStore();
		const inFlight = store.explain(sampleError);
		// Yield once so explain() reaches the API call and registers the controller.
		await Promise.resolve();
		expect(store.state).toBe('loading');

		store.reset();
		expect(store.state).toBe('idle');

		// Now fire the deferred onDone — state must NOT flip to 'ready'.
		capturedOnDone?.();
		await inFlight;
		expect(store.state).toBe('idle');
		expect(store.result).toBeUndefined();
	});

	it('captures text from summary messages', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [
					{
						role: 'assistant',
						type: 'summary',
						title: 'Diagnosis',
						content: fencedJson,
					},
				],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		expect(store.state).toBe('ready');
		expect(store.result).toEqual({
			kind: 'structured',
			summary: 'Auth failed.',
			culprit: 'API key',
			nextStep: 'Rotate the key.',
		});
	});

	it('captures text from agent-suggestion messages', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [
					{
						role: 'assistant',
						type: 'agent-suggestion',
						title: 'Suggestion',
						text: fencedJson,
					},
				],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		expect(store.state).toBe('ready');
		expect(store.result?.kind).toBe('structured');
	});

	it('transitions to error when the assistant returns no text content', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			// Only non-text events — e.g. an intermediate-step that we ignore.
			onMessage({
				sessionId: 'sid',
				messages: [
					{
						role: 'assistant',
						type: 'intermediate-step',
						text: 'thinking…',
						step: 'planning',
					},
				],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		expect(store.state).toBe('error');
		expect(store.result).toBeUndefined();
	});

	it('aborts a previous in-flight request when explain() is called for a different error', async () => {
		type Call = {
			onMessage: (chunk: { sessionId: string; messages: unknown[] }) => void;
			onDone: () => void;
		};
		const calls: Call[] = [];
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			calls.push({ onMessage, onDone });
		});

		const otherError = {
			name: 'NodeOperationError',
			message: 'Different failure mode',
			description: 'Check creds',
			node: { ...node, id: 'n2', name: 'Slack' },
		} as unknown as NodeError;

		const firstResult = [
			'```json',
			'{ "summary": "stale", "culprit": "stale", "nextStep": "stale" }',
			'```',
		].join('\n');
		const secondResult = [
			'```json',
			'{ "summary": "fresh", "culprit": "fresh", "nextStep": "fresh" }',
			'```',
		].join('\n');

		const store = useExplainErrorStore();
		const firstCall = store.explain(sampleError);
		await Promise.resolve();
		const secondCall = store.explain(otherError);
		await Promise.resolve();

		// Stale first run completes after the second one started — its
		// controller was aborted, so onDone must NOT publish 'stale'.
		calls[0].onMessage({
			sessionId: 'sid',
			messages: [{ role: 'assistant', type: 'message', text: firstResult }],
		});
		calls[0].onDone();
		await firstCall;

		// Fresh second run completes — its result must win.
		calls[1].onMessage({
			sessionId: 'sid',
			messages: [{ role: 'assistant', type: 'message', text: secondResult }],
		});
		calls[1].onDone();
		await secondCall;

		expect(store.state).toBe('ready');
		expect(store.result).toEqual({
			kind: 'structured',
			summary: 'fresh',
			culprit: 'fresh',
			nextStep: 'fresh',
		});
	});
});
