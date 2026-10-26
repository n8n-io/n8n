import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import { billingPreview } from '../../__tests__/preview.fixtures';
import { buildSelectionGraph } from '../../promotionPreview.selection';
import PromotionWorkflowPreview from './PromotionWorkflowPreview.vue';

vi.mock('./PromotionWorkflowDiff.vue', () => ({
	__esModule: true,
	default: { template: '<div data-test-id="active-diff" />' },
}));

const renderComponent = createComponentRenderer(PromotionWorkflowPreview, {
	props: {
		active: false,
		resourceKey: 'workflow:w1',
		workflowName: 'Invoice reconciliation',
		direction: 'promote',
		graph: buildSelectionGraph(billingPreview(), 'promote'),
	},
});

describe('PromotionWorkflowPreview', () => {
	it('should keep the shell during loading and offer recovery when the request fails', async () => {
		const { getByRole, getByTestId, queryByTestId, emitted, rerender } = renderComponent({
			pinia: createTestingPinia(),
			props: { active: true, entry: { status: 'loading' } },
		});
		const container = getByTestId('promotion-workflow-preview');
		expect(getByRole('button', { name: 'Loading diff…' })).toBeDisabled();
		expect(queryByTestId('active-diff')).not.toBeInTheDocument();

		await rerender({ entry: { status: 'error' } });
		await userEvent.click(getByRole('button', { name: 'Try again' }));
		expect(emitted().retry).toHaveLength(1);
		await rerender({ entry: { status: 'missing' } });
		await userEvent.click(getByRole('button', { name: 'Refresh' }));
		expect(emitted().refresh).toHaveLength(1);
		expect(getByTestId('promotion-workflow-preview')).toBe(container);

		await rerender({ active: false });
		await waitFor(() =>
			expect(getByRole('button', { name: 'Show diff of Invoice reconciliation' })).toBeEnabled(),
		);
	});
});
