import type { AgentCodingPreview, AgentCodingStatus } from '@n8n/api-types';
import { describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';

import { useCodingPreview } from '../useCodingPreview';

const READY: AgentCodingPreview = { available: true, url: '/sandbox-preview/token/' };

function setup(fetchPreview: () => Promise<AgentCodingPreview>) {
	const app = ref<AgentCodingStatus['app']>('running');
	const isOpen = ref(true);
	const canExecute = ref(true);
	const onError = vi.fn();
	const fetch = vi.fn(fetchPreview);
	const scope = effectScope();
	const preview = scope.run(() =>
		useCodingPreview({
			fetchPreview: fetch,
			isOpen: () => isOpen.value,
			canExecute: () => canExecute.value,
			app: () => app.value,
			onError,
		}),
	);
	if (!preview) throw new Error('The scope did not run');
	return { preview, app, isOpen, canExecute, onError, fetch, stop: () => scope.stop() };
}

describe('useCodingPreview', () => {
	it('shows the frame when the preview URL arrives', async () => {
		const { preview, fetch } = setup(async () => READY);

		const loading = preview.load();
		expect(preview.state.value).toBe('loading');
		await loading;

		expect(preview.url.value).toBe('/sandbox-preview/token/');
		expect(preview.state.value).toBe('ready');
		expect(fetch).toHaveBeenCalledOnce();
	});

	it('shows an unavailable preview without an error, and does not ask again', async () => {
		const { preview, onError, fetch } = setup(async () => ({ available: false }));

		await preview.load();
		await preview.load();

		expect(preview.state.value).toBe('unavailable');
		expect(preview.url.value).toBe('');
		expect(onError).not.toHaveBeenCalled();
		expect(fetch).toHaveBeenCalledOnce();
	});

	it('reports a failed request and asks again on the next load', async () => {
		const failure = new Error('No answer');
		const { preview, onError, fetch } = setup(async () => await Promise.reject(failure));

		await preview.load();
		expect(preview.state.value).toBe('failed');
		expect(onError).toHaveBeenCalledWith(failure);

		fetch.mockResolvedValueOnce(READY);
		await preview.load();
		expect(preview.state.value).toBe('ready');
	});

	it('does not ask while the panel is closed, or while a URL is already there', async () => {
		const { preview, isOpen, fetch } = setup(async () => READY);

		isOpen.value = false;
		await preview.load();
		expect(fetch).not.toHaveBeenCalled();

		isOpen.value = true;
		await preview.load();
		await preview.load();
		expect(fetch).toHaveBeenCalledOnce();
	});

	it.each(['stopped', 'error', undefined] as const)(
		'does not ask while the app is %s',
		async (status) => {
			const { preview, app, fetch } = setup(async () => READY);

			app.value = status;
			await preview.load();

			expect(fetch).not.toHaveBeenCalled();
		},
	);

	it('does not ask for a user who cannot run the agent, and says why', async () => {
		const { preview, canExecute, fetch } = setup(async () => READY);

		canExecute.value = false;
		await preview.load();

		expect(fetch).not.toHaveBeenCalled();
		expect(preview.state.value).toBe('noAccess');
	});

	it('ignores an answer that arrives after the preview was cleared', async () => {
		const answer = Promise.withResolvers<AgentCodingPreview>();
		const { preview } = setup(async () => await answer.promise);

		const loading = preview.load();
		preview.clear();
		answer.resolve(READY);
		await loading;

		expect(preview.url.value).toBe('');
		// No request is open any more, so the panel offers to show the preview again.
		expect(preview.state.value).toBe('running');
	});

	it('ignores an answer and an error that arrive after the scope ends', async () => {
		const answer = Promise.withResolvers<AgentCodingPreview>();
		const { preview, onError, stop } = setup(async () => await answer.promise);

		const loading = preview.load();
		stop();
		answer.reject(new Error('Late'));
		await loading;

		expect(onError).not.toHaveBeenCalled();
	});

	it('follows the app status, and clear starts again after the app stops', async () => {
		const { preview, app, fetch } = setup(async () => ({ available: false }));
		await preview.load();

		app.value = 'stopped';
		expect(preview.state.value).toBe('stopped');

		preview.clear();
		app.value = 'running';
		fetch.mockResolvedValueOnce(READY);
		await preview.load();
		expect(preview.state.value).toBe('ready');
	});

	it('marks the preview unavailable when another request finds out', () => {
		const { preview } = setup(async () => READY);

		preview.markUnavailable();

		expect(preview.state.value).toBe('unavailable');
	});
});
