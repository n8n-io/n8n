/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCodeForAiTransform } from './utils';
import { createPinia, setActivePinia } from 'pinia';
import { generateCodeForPrompt } from '@/api/ai';

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

vi.mock('@/stores/root.store', () => ({
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
