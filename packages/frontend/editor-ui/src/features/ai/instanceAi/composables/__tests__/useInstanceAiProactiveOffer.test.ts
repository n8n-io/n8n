import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

import {
	INSTANCE_AI_PROACTIVE_DISMISSED_STORAGE_KEY,
	INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS,
} from '../../constants';
import type { ProactiveOffer } from '../../instanceAiPanel.types';

const mocks = vi.hoisted(() => ({
	openWithSeed: vi.fn(),
	isOpen: false,
	activeThreadId: null as string | null,
	isStreaming: false,
	isSendingMessage: false,
	instanceAiAvailable: true,
}));

vi.mock('../useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => computed(() => mocks.instanceAiAvailable),
}));

vi.mock('../../instanceAiPanel.store', () => ({
	useInstanceAiPanelStore: () => ({
		get isOpen() {
			return mocks.isOpen;
		},
		get activeThreadId() {
			return mocks.activeThreadId;
		},
		openWithSeed: mocks.openWithSeed,
	}),
}));

vi.mock('../../instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		getRuntime: (threadId: string) =>
			threadId
				? {
						isStreaming: mocks.isStreaming,
						isSendingMessage: mocks.isSendingMessage,
					}
				: undefined,
	}),
}));

import {
	reloadInstanceAiProactiveDismissalsForTests,
	resetInstanceAiProactiveOfferStateForTests,
	useInstanceAiProactiveOffer,
} from '../useInstanceAiProactiveOffer';

const offer: ProactiveOffer = {
	key: 'execution:4711',
	title: 'I can help with that',
	detail: 'HTTP Request failed',
	message: 'Help me understand this error.',
	source: 'proactive_offer',
};

describe('useInstanceAiProactiveOffer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		localStorage.clear();
		mocks.isOpen = false;
		mocks.activeThreadId = null;
		mocks.isStreaming = false;
		mocks.isSendingMessage = false;
		mocks.instanceAiAvailable = true;
		mocks.openWithSeed.mockResolvedValue(true);
		resetInstanceAiProactiveOfferStateForTests();
	});

	it('shows the offer only after the dwell delay', () => {
		const { activeOffer, raise } = useInstanceAiProactiveOffer();

		raise(offer);
		expect(activeOffer.value).toBeNull();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS - 1);
		expect(activeOffer.value).toBeNull();

		vi.advanceTimersByTime(1);
		expect(activeOffer.value).toEqual(offer);
	});

	it('resets the dwell timer when the user interacts', () => {
		const { activeOffer, raise } = useInstanceAiProactiveOffer();

		raise(offer);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS - 500);
		window.dispatchEvent(new Event('pointerdown'));
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS - 1);
		expect(activeOffer.value).toBeNull();

		vi.advanceTimersByTime(1);
		expect(activeOffer.value).toEqual(offer);
	});

	it('never re-offers the same key in the same session', () => {
		const { activeOffer, raise, clear } = useInstanceAiProactiveOffer();

		raise(offer);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		expect(activeOffer.value).toEqual(offer);

		clear();
		raise(offer);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		expect(activeOffer.value).toBeNull();
	});

	it('remembers dismissals in localStorage and suppresses on reload', () => {
		const { raise, dismiss } = useInstanceAiProactiveOffer();

		raise(offer);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		dismiss();

		expect(JSON.parse(localStorage.getItem(INSTANCE_AI_PROACTIVE_DISMISSED_STORAGE_KEY)!)).toEqual([
			'execution:4711',
		]);

		resetInstanceAiProactiveOfferStateForTests();
		localStorage.setItem(
			INSTANCE_AI_PROACTIVE_DISMISSED_STORAGE_KEY,
			JSON.stringify(['execution:4711']),
		);
		reloadInstanceAiProactiveDismissalsForTests();

		const { activeOffer, raise: raiseAgain } = useInstanceAiProactiveOffer();
		raiseAgain(offer);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		expect(activeOffer.value).toBeNull();
	});

	it('does not raise while the panel is open', () => {
		mocks.isOpen = true;
		const { activeOffer, raise } = useInstanceAiProactiveOffer();

		raise(offer);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toBeNull();
	});

	it('does not show after dwell when a message is streaming', () => {
		const { activeOffer, raise } = useInstanceAiProactiveOffer();

		raise(offer);
		mocks.activeThreadId = 'thread-1';
		mocks.isStreaming = true;
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toBeNull();
	});

	it('accept opens the panel with the prefilled offer', async () => {
		const { raise, accept, activeOffer } = useInstanceAiProactiveOffer();

		raise(offer);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		await expect(accept()).resolves.toBe(true);
		expect(mocks.openWithSeed).toHaveBeenCalledWith(offer);
		expect(activeOffer.value).toBeNull();
	});

	it('retract cancels an offer still in its dwell', () => {
		const { activeOffer, raise, retract } = useInstanceAiProactiveOffer();

		raise(offer);
		retract(offer.key);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toBeNull();
	});

	it('retract withdraws an offer already on screen', () => {
		const { activeOffer, raise, retract } = useInstanceAiProactiveOffer();

		raise(offer);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		expect(activeOffer.value).toEqual(offer);

		retract(offer.key);

		expect(activeOffer.value).toBeNull();
	});

	it('retract leaves another trigger’s offer alone', () => {
		const { activeOffer, raise, retract } = useInstanceAiProactiveOffer();

		raise(offer);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		// The pipeline is shared, so retracting by the wrong key must be a no-op.
		retract('credential-error:other:cred-9:boom');

		expect(activeOffer.value).toEqual(offer);
	});

	it('retract does not mark the offer dismissed, so the problem can offer again', () => {
		const { activeOffer, raise, retract } = useInstanceAiProactiveOffer();

		raise(offer);
		retract(offer.key);

		// `offeredKeys` still holds the key only once shown; a retracted offer that
		// never surfaced may come back if the same problem recurs.
		raise(offer);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toEqual(offer);
	});

	it('is inert when Instance AI is unavailable', () => {
		mocks.instanceAiAvailable = false;
		const { activeOffer, raise } = useInstanceAiProactiveOffer();

		raise(offer);
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toBeNull();
	});
});
