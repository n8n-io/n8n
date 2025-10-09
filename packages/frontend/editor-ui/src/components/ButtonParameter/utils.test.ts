import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCodeForAiTransform, reducePayloadSizeOrThrow } from './utils';
import { createPinia, setActivePinia } from 'pinia';
import { generateCodeForPrompt } from '@/api/ai';
import type { AskAiRequest } from '@/features/assistant/assistant.types';
import type { Schema } from '@/Interface';

vi.mock('./utils', async () => {
	const actual = await vi.importActual('./utils');
	return {
		...actual,
		getSchemas: vi.fn(() => ({
			parentNodesSchemas: { test: 'parentSchema' },
			inputSchema: { test: 'inputSchema' },
		})),
	};
});

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		pushRef: 'mockRootPushRef',
		restApiContext: {},
	}),
}));

vi.mock('@/stores/ndv.store', () => ({
	useNDVStore: () => ({
		pushRef: 'mockNdvPushRef',
	}),
}));

vi.mock('@/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ settings: {}, isAskAiEnabled: true })),
}));

vi.mock('prettier', () => ({
	format: vi.fn(async (code) => await Promise.resolve(`formatted-${code}`)),
}));

vi.mock('@/api/ai', () => ({
	generateCodeForPrompt: vi.fn(),
}));

describe('generateCodeForAiTransform - Retry Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		const pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should retry and succeed on the second attempt', async () => {
		const mockGeneratedCode = 'const example = "retry success";';

		vi.mocked(generateCodeForPrompt)
			.mockRejectedValueOnce(new Error('First attempt failed'))
			.mockResolvedValueOnce({ code: mockGeneratedCode });

		const result = await generateCodeForAiTransform('test prompt', 'test/path', 2);

		expect(result).toEqual({
			name: 'test/path',
			value: 'formatted-const example = "retry success";',
		});
		expect(generateCodeForPrompt).toHaveBeenCalledTimes(2);
	});

	it('should exhaust retries and throw an error', async () => {
		vi.mocked(generateCodeForPrompt).mockRejectedValue(new Error('All attempts failed'));

		await expect(generateCodeForAiTransform('test prompt', 'test/path', 3)).rejects.toThrow(
			'All attempts failed',
		);

		expect(generateCodeForPrompt).toHaveBeenCalledTimes(3);
	});

	it('should succeed on the first attempt without retries', async () => {
		const mockGeneratedCode = 'const example = "no retries needed";';
		vi.mocked(generateCodeForPrompt).mockResolvedValue({ code: mockGeneratedCode });

		const result = await generateCodeForAiTransform('test prompt', 'test/path');

		expect(result).toEqual({
			name: 'test/path',
			value: 'formatted-const example = "no retries needed";',
		});
		expect(generateCodeForPrompt).toHaveBeenCalledTimes(1);
	});
});

const mockPayload = () =>
	({
		context: {
			schema: [
				{ nodeName: 'node1', data: 'some data' },
				{ nodeName: 'node2', data: 'other data' },
			],
			inputSchema: {
				schema: {
					value: [
						{ key: 'prop1', value: 'value1' },
						{ key: 'prop2', value: 'value2' },
					],
				},
			},
		},
		question: 'What is node1 and prop1?',
	}) as unknown as AskAiRequest.RequestPayload;

describe('reducePayloadSizeOrThrow', () => {
	it('reduces schema size when tokens exceed the limit', () => {
		const payload = mockPayload();
		const error = new Error('Limit is 100 tokens, but 104 were provided');

		reducePayloadSizeOrThrow(payload, error);

		expect(payload.context.schema.length).toBe(1);
		expect(payload.context.schema[0]).toEqual({ nodeName: 'node1', data: 'some data' });
	});

	it('removes unreferenced properties in input schema', () => {
		const payload = mockPayload();
		const error = new Error('Limit is 100 tokens, but 150 were provided');

		reducePayloadSizeOrThrow(payload, error);

		expect(payload.context.inputSchema.schema.value.length).toBe(1);
		expect((payload.context.inputSchema.schema.value as Schema[])[0].key).toBe('prop1');
	});

	it('removes all parent nodes if needed', () => {
		const payload = mockPayload();
		const error = new Error('Limit is 100 tokens, but 150 were provided');

		payload.question = '';

		reducePayloadSizeOrThrow(payload, error);

		expect(payload.context.schema.length).toBe(0);
	});

	it('throws error if tokens still exceed after reductions', () => {
		const payload = mockPayload();
		const error = new Error('Limit is 100 tokens, but 200 were provided');

		expect(() => reducePayloadSizeOrThrow(payload, error)).toThrowError(error);
	});

	it('throws error if message format is invalid', () => {
		const payload = mockPayload();
		const error = new Error('Invalid token message format');

		expect(() => reducePayloadSizeOrThrow(payload, error)).toThrowError(error);
	});
});
