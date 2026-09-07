import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import { useInstanceAiFreeNudgeStore } from '../stores/instanceAiFreeNudge.store';
import InstanceAiFreeNudge from './InstanceAiFreeNudge.vue';

const renderComponent = createComponentRenderer(InstanceAiFreeNudge);

describe('InstanceAiFreeNudge', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiFreeNudgeStore>>;

	beforeEach(() => {
		pinia = createTestingPinia();
		store = mockedStore(useInstanceAiFreeNudgeStore);
		store.treatmentVariant = null;
		store.shouldShowNudge = false;
		store.shouldTrackExposure = false;
	});

	it.each([
		['variant-1', 'Free to use. No execution cost'],
		['variant-2', 'The new AI Assistant is free to use'],
	] as const)('renders the %s copy', (variant, copy) => {
		store.treatmentVariant = variant;
		store.shouldShowNudge = true;

		const { getByTestId } = renderComponent({ pinia, props: { eligible: true } });

		expect(getByTestId('instance-ai-free-nudge')).toHaveTextContent(copy);
	});

	it('stays hidden when the surface is ineligible', () => {
		store.treatmentVariant = 'variant-1';
		store.shouldShowNudge = true;

		const { queryByTestId } = renderComponent({ pinia, props: { eligible: false } });

		expect(queryByTestId('instance-ai-free-nudge')).not.toBeInTheDocument();
	});

	it('dismisses from an accessible icon button', async () => {
		const user = userEvent.setup();
		store.treatmentVariant = 'variant-1';
		store.shouldShowNudge = true;

		const { getByRole } = renderComponent({ pinia, props: { eligible: true } });
		await user.click(getByRole('button', { name: 'Dismiss' }));

		expect(store.dismiss).toHaveBeenCalledTimes(1);
	});

	it('tracks exposure once when the surface first becomes eligible', async () => {
		store.shouldTrackExposure = true;

		const { queryByTestId, rerender } = renderComponent({ pinia, props: { eligible: false } });
		expect(queryByTestId('instance-ai-free-nudge')).not.toBeInTheDocument();
		expect(store.trackExposure).not.toHaveBeenCalled();

		await rerender({ eligible: true });
		expect(store.trackExposure).toHaveBeenCalledTimes(1);

		await rerender({ eligible: false });
		await rerender({ eligible: true });
		expect(store.trackExposure).toHaveBeenCalledTimes(1);
	});
});
