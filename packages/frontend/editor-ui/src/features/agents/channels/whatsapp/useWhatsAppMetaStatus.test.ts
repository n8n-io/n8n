import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { render } from '@testing-library/vue';

import { getWhatsAppMetaStatus } from './api';
import { useWhatsAppMetaStatus } from './useWhatsAppMetaStatus';

vi.mock('./api', () => ({ getWhatsAppMetaStatus: vi.fn() }));

function setup(initialCredential: string | undefined, options?: { poll?: boolean }) {
	const credentialId = ref(initialCredential);
	let status!: ReturnType<typeof useWhatsAppMetaStatus>['status'];
	let refresh!: ReturnType<typeof useWhatsAppMetaStatus>['refresh'];
	const view = render(
		defineComponent({
			setup() {
				({ status, refresh } = useWhatsAppMetaStatus(ref('p'), ref('a'), credentialId, options));
				return () => h('div');
			},
		}),
	);
	return { credentialId, view, refresh: () => refresh(), status: () => status.value };
}

function setTabHidden(hidden: boolean) {
	Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
}

describe('useWhatsAppMetaStatus', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createTestingPinia());
		vi.mocked(getWhatsAppMetaStatus).mockReset();
		vi.mocked(getWhatsAppMetaStatus).mockResolvedValue({ state: 'dailyLimit' });
	});

	afterEach(() => {
		vi.useRealTimers();
		setTabHidden(false);
	});

	it('does not ask Meta without a credential', async () => {
		setup(undefined);
		await flushPromises();

		expect(getWhatsAppMetaStatus).not.toHaveBeenCalled();
	});

	it('reads the status and polls again after a minute', async () => {
		const { status } = setup('cred-1');
		await flushPromises();

		expect(status()).toEqual({ state: 'dailyLimit' });
		expect(getWhatsAppMetaStatus).toHaveBeenCalledTimes(1);

		vi.mocked(getWhatsAppMetaStatus).mockResolvedValue({ state: 'connected' });
		await vi.advanceTimersByTimeAsync(60_000);

		expect(getWhatsAppMetaStatus).toHaveBeenCalledTimes(2);
		expect(status()).toEqual({ state: 'connected' });
	});

	it('keeps the last answer when a read fails', async () => {
		const { status } = setup('cred-1');
		await flushPromises();

		vi.mocked(getWhatsAppMetaStatus).mockRejectedValue(new Error('offline'));
		await vi.advanceTimersByTimeAsync(60_000);

		expect(status()).toEqual({ state: 'dailyLimit' });
	});

	it('clears the status and reads again when the credential changes', async () => {
		const { credentialId, status } = setup('cred-1');
		await flushPromises();

		// Hold the next answer back, so the cleared state can be seen.
		let answer!: (value: { state: 'connected' }) => void;
		vi.mocked(getWhatsAppMetaStatus).mockReturnValueOnce(
			new Promise((resolve) => {
				answer = resolve;
			}),
		);
		credentialId.value = 'cred-2';
		await nextTick();
		expect(status()).toBeNull();

		answer({ state: 'connected' });
		await flushPromises();
		expect(status()).toEqual({ state: 'connected' });

		expect(getWhatsAppMetaStatus).toHaveBeenLastCalledWith(expect.anything(), 'p', 'a', 'cred-2');
	});

	it('stops polling when the component unmounts', async () => {
		const { view } = setup('cred-1');
		await flushPromises();

		view.unmount();
		await vi.advanceTimersByTimeAsync(5 * 60_000);

		expect(getWhatsAppMetaStatus).toHaveBeenCalledTimes(1);
	});

	describe('without polling', () => {
		it('reads once and does not read again on its own', async () => {
			const { status } = setup('cred-1', { poll: false });
			await flushPromises();

			expect(status()).toEqual({ state: 'dailyLimit' });
			await vi.advanceTimersByTimeAsync(10 * 60_000);

			expect(getWhatsAppMetaStatus).toHaveBeenCalledTimes(1);
		});

		it('reads again when asked to refresh', async () => {
			const { status, refresh } = setup('cred-1', { poll: false });
			await flushPromises();

			vi.mocked(getWhatsAppMetaStatus).mockResolvedValue({ state: 'connected' });
			refresh();
			await flushPromises();

			expect(getWhatsAppMetaStatus).toHaveBeenCalledTimes(2);
			expect(status()).toEqual({ state: 'connected' });
		});

		it('does nothing on refresh without a credential', async () => {
			const { refresh } = setup(undefined, { poll: false });

			refresh();
			await flushPromises();

			expect(getWhatsAppMetaStatus).not.toHaveBeenCalled();
		});
	});

	describe('while the tab is hidden', () => {
		it('skips the timed reads and reads again once the tab shows', async () => {
			setup('cred-1');
			await flushPromises();
			expect(getWhatsAppMetaStatus).toHaveBeenCalledTimes(1);

			setTabHidden(true);
			await vi.advanceTimersByTimeAsync(5 * 60_000);
			expect(getWhatsAppMetaStatus).toHaveBeenCalledTimes(1);

			setTabHidden(false);
			await vi.advanceTimersByTimeAsync(60_000);
			expect(getWhatsAppMetaStatus).toHaveBeenCalledTimes(2);
		});
	});

	describe('older answers', () => {
		function deferred() {
			let resolve!: (value: { state: 'connected' | 'dailyLimit' }) => void;
			const promise = new Promise<{ state: 'connected' | 'dailyLimit' }>((done) => {
				resolve = done;
			});
			return { promise, resolve };
		}

		it('are ignored when the credential changed while they were on their way', async () => {
			const first = deferred();
			vi.mocked(getWhatsAppMetaStatus)
				.mockReturnValueOnce(first.promise)
				.mockResolvedValueOnce({ state: 'connected' });
			const { credentialId, status } = setup('cred-1');

			credentialId.value = 'cred-2';
			await flushPromises();
			expect(status()).toEqual({ state: 'connected' });

			first.resolve({ state: 'dailyLimit' });
			await flushPromises();

			expect(status()).toEqual({ state: 'connected' });
		});

		it('are ignored when a refresh was asked for after them', async () => {
			const first = deferred();
			vi.mocked(getWhatsAppMetaStatus)
				.mockReturnValueOnce(first.promise)
				.mockResolvedValueOnce({ state: 'connected' });
			const { status, refresh } = setup('cred-1', { poll: false });

			refresh();
			await flushPromises();
			expect(status()).toEqual({ state: 'connected' });

			first.resolve({ state: 'dailyLimit' });
			await flushPromises();

			expect(status()).toEqual({ state: 'connected' });
		});

		it('do not stop the timer when a refresh happens', async () => {
			const { refresh } = setup('cred-1');
			await flushPromises();
			expect(getWhatsAppMetaStatus).toHaveBeenCalledTimes(1);

			refresh();
			await flushPromises();
			await vi.advanceTimersByTimeAsync(60_000);

			// The refresh and the next timed read.
			expect(getWhatsAppMetaStatus).toHaveBeenCalledTimes(3);
		});
	});
});
