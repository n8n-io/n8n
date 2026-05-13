import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import type { NodeError } from 'n8n-workflow';

const apiSpy: Mock = vi.fn();

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	chatWithAssistant: (...args: unknown[]) => apiSpy(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: { baseUrl: '', sessionId: 's', pushRef: 'p' },
	}),
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
});
