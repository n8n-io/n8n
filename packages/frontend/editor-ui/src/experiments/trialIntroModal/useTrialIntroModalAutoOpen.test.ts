import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';
import { defineComponent, nextTick } from 'vue';
import { useTrialIntroModalStore } from './stores/trialIntroModal.store';
import { useTrialIntroModalAutoOpen } from './useTrialIntroModalAutoOpen';

const TestHost = defineComponent({
	setup() {
		useTrialIntroModalAutoOpen();
		return () => null;
	},
});

describe('useTrialIntroModalAutoOpen', () => {
	const setup = () => {
		const pinia = createTestingPinia();
		const trialIntroModalStore = mockedStore(useTrialIntroModalStore);
		const uiStore = mockedStore(useUIStore);
		trialIntroModalStore.openIfEligible.mockReturnValue(true);
		return { pinia, trialIntroModalStore, uiStore };
	};

	it('opens once eligibility is available and the modal stack is clear', async () => {
		const { pinia, trialIntroModalStore, uiStore } = setup();
		trialIntroModalStore.shouldShowModal = false;
		uiStore.isAnyModalOpen = true;

		render(TestHost, { global: { plugins: [pinia] } });
		await nextTick();
		expect(trialIntroModalStore.openIfEligible).not.toHaveBeenCalled();

		trialIntroModalStore.shouldShowModal = true;
		await nextTick();
		expect(trialIntroModalStore.openIfEligible).not.toHaveBeenCalled();

		uiStore.isAnyModalOpen = false;
		await nextTick();
		expect(trialIntroModalStore.openIfEligible).toHaveBeenCalledTimes(1);
	});

	it('opens immediately when already eligible at mount', async () => {
		const { pinia, trialIntroModalStore, uiStore } = setup();
		trialIntroModalStore.shouldShowModal = true;
		uiStore.isAnyModalOpen = false;

		render(TestHost, { global: { plugins: [pinia] } });
		await nextTick();
		expect(trialIntroModalStore.openIfEligible).toHaveBeenCalledTimes(1);
	});

	it('stops watching after the modal has opened', async () => {
		const { pinia, trialIntroModalStore, uiStore } = setup();
		trialIntroModalStore.shouldShowModal = true;
		uiStore.isAnyModalOpen = false;

		render(TestHost, { global: { plugins: [pinia] } });
		await nextTick();
		expect(trialIntroModalStore.openIfEligible).toHaveBeenCalledTimes(1);

		uiStore.isAnyModalOpen = true;
		await nextTick();
		uiStore.isAnyModalOpen = false;
		await nextTick();
		expect(trialIntroModalStore.openIfEligible).toHaveBeenCalledTimes(1);
	});

	it('keeps watching when the store declines to open', async () => {
		const { pinia, trialIntroModalStore, uiStore } = setup();
		trialIntroModalStore.openIfEligible.mockReturnValue(false);
		trialIntroModalStore.shouldShowModal = true;
		uiStore.isAnyModalOpen = false;

		render(TestHost, { global: { plugins: [pinia] } });
		await nextTick();
		expect(trialIntroModalStore.openIfEligible).toHaveBeenCalledTimes(1);

		uiStore.isAnyModalOpen = true;
		await nextTick();
		uiStore.isAnyModalOpen = false;
		await nextTick();
		expect(trialIntroModalStore.openIfEligible).toHaveBeenCalledTimes(2);
	});
});
