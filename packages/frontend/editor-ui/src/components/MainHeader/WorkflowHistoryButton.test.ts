import { createComponentRenderer } from '@/__tests__/render';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import WorkflowHistoryButton from '@/components/MainHeader/WorkflowHistoryButton.vue';

vi.mock('vue-router', () => ({
	useRoute: () => vi.fn(),
	useRouter: () => vi.fn(),
	RouterLink: vi.fn(),
}));

const renderComponent = createComponentRenderer(WorkflowHistoryButton, {
	global: {
		stubs: {
			RouterLink: true,
			'router-link': {
				template: '<div><slot /></div>',
			},
		},
	},
});

describe('WorkflowHistoryButton', () => {
	it('should be disabled if the feature is disabled', async () => {
		const { getByRole, emitted } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
				isFeatureEnabled: false,
			},
		});
		expect(getByRole('button')).toBeDisabled();

		await userEvent.hover(getByRole('button'));
		expect(getByRole('tooltip')).toBeVisible();

		within(getByRole('tooltip')).getByText('View plans').click();

		expect(emitted()).toHaveProperty('upgrade');
	});

	it('should be disabled if the feature is enabled but the workflow is new', async () => {
		const { getByRole } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: true,
				isFeatureEnabled: true,
			},
		});
		expect(getByRole('button')).toBeDisabled();
	});

	it('should be enabled if the feature is enabled and the workflow is not new', async () => {
		const { getByRole } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
				isFeatureEnabled: true,
			},
		});
		expect(getByRole('button')).toBeEnabled();
	});
});
