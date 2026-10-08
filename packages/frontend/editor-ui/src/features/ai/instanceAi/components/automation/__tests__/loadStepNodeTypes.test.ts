import { describe, expect, it, vi } from 'vitest';
import { loadStepNodeTypes } from '../loadStepNodeTypes';

function deferred() {
	let resolve = () => {};
	let reject: (error: Error) => void = () => {};
	const promise = new Promise<void>((onResolve, onReject) => {
		resolve = onResolve;
		reject = onReject;
	});
	return { promise, resolve, reject };
}

describe('loadStepNodeTypes', () => {
	it('sends one request for the cards that mount while a load runs', async () => {
		const request = deferred();
		const store = { loadNodeTypesIfNotLoaded: vi.fn(async () => await request.promise) };

		const first = loadStepNodeTypes(store);
		const second = loadStepNodeTypes(store);
		request.resolve();
		await Promise.all([first, second]);

		expect(store.loadNodeTypesIfNotLoaded).toHaveBeenCalledTimes(1);
	});

	it('asks the store again after a load ends, so a later card can retry', async () => {
		const store = { loadNodeTypesIfNotLoaded: vi.fn(async () => {}) };

		await loadStepNodeTypes(store);
		await loadStepNodeTypes(store);

		expect(store.loadNodeTypesIfNotLoaded).toHaveBeenCalledTimes(2);
	});

	it('resolves when the load fails, and lets the next card try again', async () => {
		const store = {
			loadNodeTypesIfNotLoaded: vi
				.fn<() => Promise<void>>()
				.mockRejectedValueOnce(new Error('Request failed'))
				.mockResolvedValueOnce(undefined),
		};

		await expect(loadStepNodeTypes(store)).resolves.toBeUndefined();
		await expect(loadStepNodeTypes(store)).resolves.toBeUndefined();
		expect(store.loadNodeTypesIfNotLoaded).toHaveBeenCalledTimes(2);
	});

	it('keeps the loads of two stores apart', async () => {
		const request = deferred();
		const first = { loadNodeTypesIfNotLoaded: vi.fn(async () => await request.promise) };
		const second = { loadNodeTypesIfNotLoaded: vi.fn(async () => {}) };

		const pending = loadStepNodeTypes(first);
		await loadStepNodeTypes(second);
		request.reject(new Error('Request failed'));
		await pending;

		expect(first.loadNodeTypesIfNotLoaded).toHaveBeenCalledTimes(1);
		expect(second.loadNodeTypesIfNotLoaded).toHaveBeenCalledTimes(1);
	});
});
