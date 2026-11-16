import { VIEWS } from '@n8n/frontend-constants/views';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import PoliciesLandingView from './PoliciesLandingView.vue';
import { INSTANCE_POLICY_VIEW } from '../type-availability-policies.constants';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
}));

const renderView = createComponentRenderer(PoliciesLandingView);

describe('PoliciesLandingView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the page frame with the Global section', () => {
		const { getByText, getByTestId } = renderView({ pinia: createTestingPinia() });

		expect(getByText('Node and credential policies')).toBeInTheDocument();
		expect(getByTestId('policies-landing-global-section')).toHaveTextContent('Global');
		expect(getByTestId('policies-landing-instance-row')).toHaveTextContent(
			'Global instance policy',
		);
		expect(getByTestId('policies-landing-instance-row')).toHaveTextContent('Configure');
	});

	it('opens the instance policy page from the Global instance policy row', async () => {
		const { getByTestId } = renderView({ pinia: createTestingPinia() });

		await fireEvent.click(getByTestId('policies-landing-instance-row'));

		expect(push).toHaveBeenCalledWith({ name: INSTANCE_POLICY_VIEW });
	});

	it('goes back to the Policies page', async () => {
		const { getByText } = renderView({ pinia: createTestingPinia() });

		await fireEvent.click(getByText('Policies'));

		expect(push).toHaveBeenCalledWith({ name: VIEWS.SECURITY_SETTINGS });
	});
});
