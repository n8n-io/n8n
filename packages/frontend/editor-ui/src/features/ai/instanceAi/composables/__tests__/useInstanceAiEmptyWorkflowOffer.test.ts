import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, ref, type EffectScope, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';

import { INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS } from '../../constants';

const mocks = vi.hoisted(() => ({
	openWithSeed: vi.fn(),
	isOpen: false,
	activeThreadId: null as string | null,
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
		getRuntime: () => undefined,
	}),
}));

import {
	resetInstanceAiProactiveOfferStateForTests,
	useInstanceAiProactiveOffer,
} from '../useInstanceAiProactiveOffer';
import {
	useInstanceAiEmptyWorkflowOffer,
	type EmptyWorkflowSummary,
} from '../useInstanceAiEmptyWorkflowOffer';

const emptyWorkflow: EmptyWorkflowSummary = {
	workflowId: 'wf-new-1',
};

describe('useInstanceAiEmptyWorkflowOffer', () => {
	let scope: EffectScope;

	function watchEmptyWorkflow(source: Ref<EmptyWorkflowSummary | null>) {
		scope = effectScope();
		scope.run(() => useInstanceAiEmptyWorkflowOffer(source));
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		localStorage.clear();
		mocks.isOpen = false;
		mocks.instanceAiAvailable = true;
		resetInstanceAiProactiveOfferStateForTests();
	});

	afterEach(() => {
		scope?.stop();
	});

	it('offers to build once the user has settled on an empty new workflow', () => {
		watchEmptyWorkflow(ref<EmptyWorkflowSummary | null>(emptyWorkflow));
		const { activeOffer } = useInstanceAiProactiveOffer();

		expect(activeOffer.value).toBeNull();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toMatchObject({
			key: 'empty-workflow:wf-new-1',
			source: 'proactive_offer',
			cta: useI18n().baseText('instanceAi.proactiveOffer.emptyWorkflow.cta'),
			message: useI18n().baseText('instanceAi.proactive.emptyWorkflow.prompt'),
		});
		expect(activeOffer.value?.attachments).toBeUndefined();
		expect(activeOffer.value?.message).not.toContain('<context');
	});

	it('stays quiet when the canvas is not an empty new workflow', () => {
		watchEmptyWorkflow(ref<EmptyWorkflowSummary | null>(null));
		const { activeOffer } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toBeNull();
	});

	it('clears a pending offer when the user adds a first step', async () => {
		const source = ref<EmptyWorkflowSummary | null>(emptyWorkflow);
		watchEmptyWorkflow(source);
		const { activeOffer } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS - 500);
		expect(activeOffer.value).toBeNull();

		source.value = null;
		await nextTick();
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toBeNull();
	});

	it('clears a visible offer when the canvas is no longer empty', async () => {
		const source = ref<EmptyWorkflowSummary | null>(emptyWorkflow);
		watchEmptyWorkflow(source);
		const { activeOffer } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		expect(activeOffer.value?.key).toBe('empty-workflow:wf-new-1');

		source.value = null;
		await nextTick();

		expect(activeOffer.value).toBeNull();
	});

	it('does not offer again for the same workflow after dismiss', async () => {
		const source = ref<EmptyWorkflowSummary | null>(emptyWorkflow);
		watchEmptyWorkflow(source);
		const { activeOffer, dismiss } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		expect(activeOffer.value).not.toBeNull();
		dismiss();

		source.value = null;
		await nextTick();
		source.value = { ...emptyWorkflow };
		await nextTick();
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toBeNull();
	});
});
