// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetAssistantContextForTests, useAssistantContext } from './use-assistant-context';
import type { DetectedContext } from '../../shared/types';

type ContextChangedCb = (contexts: DetectedContext[]) => void;

function stubElectronApi(options: DetectedContext[]) {
	let listener: ContextChangedCb | undefined;
	const api = {
		getContextOptions: vi.fn(async () => await Promise.resolve(options)),
		onContextChanged: vi.fn((onChange: ContextChangedCb) => {
			listener = onChange;
			return () => {};
		}),
	};
	(globalThis as unknown as { window: { electronAPI: typeof api } }).window = { electronAPI: api };
	return {
		api,
		pushChange: (next: DetectedContext[]) => listener?.(next),
	};
}

const W1: DetectedContext = { id: 'w1', kind: 'browser', app: 'Chrome', windowTitle: 'A' };
const W2: DetectedContext = { id: 'w2', kind: 'finder', app: 'Finder', windowTitle: 'Downloads' };

describe('useAssistantContext', () => {
	beforeEach(() => {
		__resetAssistantContextForTests();
	});

	it('loads options and exposes the frontmost window as the detected context', async () => {
		stubElectronApi([W1, W2]);
		const ctx = useAssistantContext();
		await ctx.ensureDetection();
		expect(ctx.detected.value.id).toBe('w1');
		expect(ctx.contextKey.value).toBe('w1');
	});

	it('ensureDetection is idempotent (subscribes once across callers)', async () => {
		const { api } = stubElectronApi([W1]);
		const a = useAssistantContext();
		const b = useAssistantContext();
		await a.ensureDetection();
		await b.ensureDetection();
		expect(api.getContextOptions).toHaveBeenCalledTimes(1);
		expect(api.onContextChanged).toHaveBeenCalledTimes(1);
	});

	it('selectContext picks a specific window', async () => {
		stubElectronApi([W1, W2]);
		const ctx = useAssistantContext();
		await ctx.ensureDetection();
		ctx.selectContext('w2');
		expect(ctx.detected.value.id).toBe('w2');
		expect(ctx.contextKey.value).toBe('w2');
	});

	it('a fresh detection push replaces options and clears the manual pick', async () => {
		const { pushChange } = stubElectronApi([W1, W2]);
		const ctx = useAssistantContext();
		await ctx.ensureDetection();
		ctx.selectContext('w2');
		expect(ctx.detected.value.id).toBe('w2');

		pushChange([W2, W1]);
		expect(ctx.selectedKey.value).toBeNull();
		// Frontmost of the new push wins.
		expect(ctx.detected.value.id).toBe('w2');
	});

	it('does not latch a failed detection — a later call retries', async () => {
		const failing = {
			getContextOptions: vi.fn(async () => {
				await Promise.resolve();
				throw new Error('permission denied');
			}),
			onContextChanged: vi.fn((onChange: ContextChangedCb) => {
				void onChange;
				return () => {};
			}),
		};
		(globalThis as unknown as { window: { electronAPI: typeof failing } }).window = {
			electronAPI: failing,
		};
		const ctx = useAssistantContext();
		await expect(ctx.ensureDetection()).rejects.toThrow('permission denied');

		// A subsequent attempt (now succeeding) re-runs detection rather than no-opping.
		stubElectronApi([W1]);
		await ctx.ensureDetection();
		expect(ctx.detected.value.id).toBe('w1');
	});

	it('falls back to a synthetic "other" context when nothing is detected', async () => {
		stubElectronApi([]);
		const ctx = useAssistantContext();
		await ctx.ensureDetection();
		expect(ctx.detected.value.kind).toBe('other');
		expect(ctx.contextKey.value).toBe('other');
	});
});
