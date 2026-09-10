import type { AppPreviewStatus } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { effectScope, ref } from 'vue';

import {
	LIVE_PREVIEW_HEARTBEAT_MS,
	LIVE_PREVIEW_POLL_MS,
	LIVE_PREVIEW_POLL_TIMEOUT_MS,
	previewContentKey,
	transitionLivePreview,
	useAppLivePreview,
} from './useAppLivePreview';

const ensureAppPreviewApi = vi.hoisted(() => vi.fn<() => Promise<AppPreviewStatus>>());

vi.mock('@/features/apps/apps.api', () => ({ ensureAppPreviewApi }));

const READY: AppPreviewStatus = {
	status: 'ready',
	url: '/apps-preview/tok/',
	expiresAt: '2026-09-09T00:00:00.000Z',
};
const STARTING: AppPreviewStatus = { status: 'starting' };

describe('transitionLivePreview', () => {
	it('polls while starting and opens a streak', () => {
		expect(transitionLivePreview(STARTING, null, 1000)).toEqual({
			status: STARTING,
			next: 'poll',
			pollingSince: 1000,
		});
	});

	it('keeps polling through a cold restore and install, which outlasts the old 90 s limit', () => {
		expect(LIVE_PREVIEW_POLL_TIMEOUT_MS).toBe(240_000);
		expect(transitionLivePreview(STARTING, 1000, 1000 + 200_000)).toEqual({
			status: STARTING,
			next: 'poll',
			pollingSince: 1000,
		});
	});

	it('gives up on a starting streak after the timeout', () => {
		expect(transitionLivePreview(STARTING, 1000, 1000 + LIVE_PREVIEW_POLL_TIMEOUT_MS)).toEqual({
			status: { status: 'unavailable', reason: 'start-failed' },
			next: 'stop',
			pollingSince: null,
		});
	});

	it('heartbeats when ready and stops on every terminal answer', () => {
		expect(transitionLivePreview(READY, 500, 900)).toEqual({
			status: READY,
			next: 'heartbeat',
			pollingSince: null,
		});
		for (const answer of [
			{ status: 'no-source' },
			{ status: 'unsupported', reason: 'provider' },
			{ status: 'unavailable', reason: 'sandbox' },
		] satisfies AppPreviewStatus[]) {
			expect(transitionLivePreview(answer, 500, 900)).toEqual({
				status: answer,
				next: 'stop',
				pollingSince: null,
			});
		}
	});
});

describe('previewContentKey', () => {
	it('is the build sequence of a built preview, whatever the dev server would show', () => {
		expect(previewContentKey('/apps-preview/tok/?b=2', 'call-9')).toBe('b:2');
		expect(previewContentKey('/apps-preview/tok/?b=2', undefined)).toBe('b:2');
	});

	it('is the latest source edit for a dev server', () => {
		expect(previewContentKey('/apps-preview/tok/', 'call-9')).toBe('call-9');
		expect(previewContentKey('/apps-preview/tok/', undefined)).toBeUndefined();
	});

	it('is undefined without a frame', () => {
		expect(previewContentKey(undefined, 'call-9')).toBeUndefined();
	});
});

describe('useAppLivePreview', () => {
	const target = { projectId: 'proj-1', appId: 'app-1', threadId: 'thread-1' };

	async function flush() {
		await Promise.resolve();
		await Promise.resolve();
	}

	function mountLive(
		visible = ref(true),
		builtVersionId = ref<string | undefined>(),
		running = ref(false),
		latestSourceEditId = ref<string | undefined>(),
	) {
		const scope = effectScope();
		const live = scope.run(() =>
			useAppLivePreview(target, visible, builtVersionId, running, latestSourceEditId),
		);
		if (!live) throw new Error('scope did not run');
		return { ...live, visible, builtVersionId, running, latestSourceEditId, scope };
	}

	beforeEach(() => {
		createTestingPinia();
		vi.useFakeTimers();
		ensureAppPreviewApi.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('ensures on start, polls while starting, and exposes the URL once ready', async () => {
		ensureAppPreviewApi.mockResolvedValueOnce(STARTING).mockResolvedValueOnce(READY);
		const live = mountLive();
		await flush();

		expect(ensureAppPreviewApi).toHaveBeenCalledWith(
			expect.anything(),
			'proj-1',
			'app-1',
			'thread-1',
		);
		expect(live.status.value).toEqual(STARTING);
		expect(live.liveUrl.value).toBeUndefined();

		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_POLL_MS);

		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(2);
		expect(live.liveUrl.value).toBe('/apps-preview/tok/');
		expect(live.reason.value).toBeUndefined();
		live.scope.stop();
	});

	it('reports start-failed after polling for the timeout', async () => {
		ensureAppPreviewApi.mockResolvedValue(STARTING);
		const live = mountLive();
		await flush();

		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_POLL_TIMEOUT_MS + LIVE_PREVIEW_POLL_MS);

		expect(live.status.value).toEqual({ status: 'unavailable', reason: 'start-failed' });
		const calls = ensureAppPreviewApi.mock.calls.length;
		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_HEARTBEAT_MS);
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(calls);
		live.scope.stop();
	});

	it('heartbeats while ready and re-enters polling when the heartbeat says starting', async () => {
		ensureAppPreviewApi
			.mockResolvedValueOnce(READY)
			.mockResolvedValueOnce(STARTING)
			.mockResolvedValueOnce(READY);
		const live = mountLive();
		await flush();
		expect(live.liveUrl.value).toBe('/apps-preview/tok/');

		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_HEARTBEAT_MS);
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(2);
		expect(live.status.value).toEqual(STARTING);
		expect(live.liveUrl.value).toBeUndefined();

		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_POLL_MS);
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(3);
		expect(live.liveUrl.value).toBe('/apps-preview/tok/');
		live.scope.stop();
	});

	it('pauses while hidden and ensures again when visible', async () => {
		ensureAppPreviewApi.mockResolvedValue(READY);
		const live = mountLive();
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(1);

		live.visible.value = false;
		await flush();
		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_HEARTBEAT_MS * 2);
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(1);

		live.visible.value = true;
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(2);
		live.scope.stop();
	});

	it('drops an answer that arrives after the scope stopped', async () => {
		let resolveEnsure: (status: AppPreviewStatus) => void = () => {};
		ensureAppPreviewApi.mockReturnValueOnce(new Promise((resolve) => (resolveEnsure = resolve)));
		const live = mountLive();
		await flush();

		live.scope.stop();
		resolveEnsure(READY);
		await flush();

		expect(live.status.value).toBeUndefined();
		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_HEARTBEAT_MS);
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(1);
	});

	it.each([
		{ status: 'no-source' },
		{ status: 'unavailable', reason: 'start-failed' },
	] satisfies AppPreviewStatus[])('ensures again when a build lands after %o', async (answer) => {
		ensureAppPreviewApi.mockResolvedValueOnce(answer).mockResolvedValueOnce(READY);
		const live = mountLive();
		await flush();
		expect(live.status.value).toEqual(answer);
		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_HEARTBEAT_MS);
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(1);

		live.builtVersionId.value = 'v-1';
		await flush();

		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(2);
		expect(live.liveUrl.value).toBe('/apps-preview/tok/');
		live.scope.stop();
	});

	it('ignores a new build while ready, starting or hidden', async () => {
		ensureAppPreviewApi.mockResolvedValueOnce(STARTING).mockResolvedValue(READY);
		const live = mountLive();
		await flush();
		expect(live.status.value).toEqual(STARTING);

		live.builtVersionId.value = 'v-1';
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_POLL_MS);
		expect(live.liveUrl.value).toBe('/apps-preview/tok/');
		live.builtVersionId.value = 'v-2';
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(2);

		live.visible.value = false;
		await flush();
		live.builtVersionId.value = 'v-3';
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(2);
		live.scope.stop();
	});

	it('ensures once more when the run ends and follows the URL of the rebuilt preview', async () => {
		const REBUILT: AppPreviewStatus = { ...READY, url: '/apps-preview/tok/?b=2' };
		ensureAppPreviewApi.mockResolvedValueOnce(READY).mockResolvedValue(REBUILT);
		const live = mountLive();
		await flush();
		expect(live.liveUrl.value).toBe('/apps-preview/tok/');

		live.running.value = true;
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(1);

		live.running.value = false;
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(2);
		expect(live.liveUrl.value).toBe('/apps-preview/tok/?b=2');
		expect(live.status.value).toEqual(REBUILT);

		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_HEARTBEAT_MS);
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(3);
		live.scope.stop();
	});

	it('settles once per run end, after the ensure has answered', async () => {
		let answer!: (status: AppPreviewStatus) => void;
		ensureAppPreviewApi
			.mockResolvedValueOnce(READY)
			.mockImplementationOnce(async () => await new Promise((resolve) => (answer = resolve)))
			.mockResolvedValue(READY);
		const live = mountLive();
		await flush();
		expect(live.settledCount.value).toBe(0);

		live.running.value = true;
		await flush();
		live.running.value = false;
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(2);
		expect(live.settledCount.value).toBe(0);

		answer({ ...READY, url: '/apps-preview/tok/?b=2' });
		await vi.advanceTimersByTimeAsync(0);
		expect(live.liveUrl.value).toBe('/apps-preview/tok/?b=2');
		expect(live.settledCount.value).toBe(1);

		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_HEARTBEAT_MS);
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(3);
		expect(live.settledCount.value).toBe(1);
		live.scope.stop();
	});

	it('does not settle for a run end that ensures nothing', async () => {
		ensureAppPreviewApi.mockResolvedValue({ status: 'unsupported', reason: 'provider' });
		const live = mountLive(ref(true), ref(), ref(true));
		await flush();

		live.running.value = false;
		await flush();

		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(1);
		expect(live.settledCount.value).toBe(0);
		live.scope.stop();
	});

	describe('previewAhead', () => {
		it('follows the source edits of a dev server until they are marked published', async () => {
			ensureAppPreviewApi.mockResolvedValue(READY);
			const live = mountLive();
			await flush();
			expect(live.previewAhead.value).toBe(false);

			live.latestSourceEditId.value = 'call-1';
			expect(live.previewAhead.value).toBe(true);

			live.markPreviewPublished();
			expect(live.previewAhead.value).toBe(false);

			live.latestSourceEditId.value = 'call-2';
			expect(live.previewAhead.value).toBe(true);
			live.scope.stop();
		});

		it('follows the build sequence of a built preview and ignores source edits', async () => {
			ensureAppPreviewApi
				.mockResolvedValueOnce({ ...READY, url: '/apps-preview/tok/?b=1' })
				.mockResolvedValue({ ...READY, url: '/apps-preview/tok/?b=2' });
			const live = mountLive();
			await flush();
			live.markPreviewPublished();
			expect(live.previewAhead.value).toBe(false);

			live.latestSourceEditId.value = 'call-1';
			expect(live.previewAhead.value).toBe(false);

			live.running.value = true;
			await flush();
			live.running.value = false;
			await flush();
			expect(live.liveUrl.value).toBe('/apps-preview/tok/?b=2');
			expect(live.previewAhead.value).toBe(true);

			live.markPreviewPublished();
			expect(live.previewAhead.value).toBe(false);
			live.scope.stop();
		});

		it('is never ahead without a frame', async () => {
			ensureAppPreviewApi.mockResolvedValue(STARTING);
			const live = mountLive(ref(true), ref(), ref(false), ref('call-1'));
			await flush();

			expect(live.previewAhead.value).toBe(false);
			live.scope.stop();
		});
	});

	it.each([
		{ status: 'no-source' },
		{ status: 'unavailable', reason: 'start-failed' },
	] satisfies AppPreviewStatus[])('retries after %o when the run ends', async (answer) => {
		ensureAppPreviewApi.mockResolvedValueOnce(answer).mockResolvedValueOnce(READY);
		const live = mountLive(ref(true), ref(), ref(true));
		await flush();
		expect(live.status.value).toEqual(answer);

		live.running.value = false;
		await flush();

		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(2);
		expect(live.liveUrl.value).toBe('/apps-preview/tok/');
		live.scope.stop();
	});

	it('does not ensure at the end of a run while starting, unsupported or hidden', async () => {
		ensureAppPreviewApi.mockResolvedValueOnce(STARTING).mockResolvedValue(READY);
		const live = mountLive(ref(true), ref(), ref(true));
		await flush();

		live.running.value = false;
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(LIVE_PREVIEW_POLL_MS);
		expect(live.liveUrl.value).toBe('/apps-preview/tok/');
		live.visible.value = false;
		live.running.value = true;
		await flush();
		live.running.value = false;
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(2);

		ensureAppPreviewApi.mockResolvedValue({ status: 'unsupported', reason: 'provider' });
		live.visible.value = true;
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(3);
		live.running.value = true;
		await flush();
		live.running.value = false;
		await flush();
		expect(ensureAppPreviewApi).toHaveBeenCalledTimes(3);
		live.scope.stop();
	});

	it('maps a failed request to unavailable/sandbox', async () => {
		ensureAppPreviewApi.mockRejectedValueOnce(new Error('offline'));
		const live = mountLive();
		await flush();

		expect(live.status.value).toEqual({ status: 'unavailable', reason: 'sandbox' });
		expect(live.reason.value).toBe('sandbox');
		live.scope.stop();
	});
});
