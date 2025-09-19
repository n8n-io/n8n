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
			N8nTooltip: {
				template: '<div><slot /><slot name="content" /></div>',
			},
			N8nIconButton: true,
			N8nLink: {
				template: '<a @click="$emit(\'click\')"><slot /></a>',
			},
			I18nT: {
				template: '<span><slot name="link" /></span>',
			},
		},
	},
});

describe('WorkflowHistoryButton', () => {
	it('should be disabled if the feature is disabled', async () => {
		const { getByRole, queryByTestId, emitted } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
				isFeatureEnabled: false,
			},
		});
		const button = queryByTestId('workflow-history-button');
		expect(button).toHaveAttribute('disabled', 'true');
		if (!button) {
			throw new Error('Button does not exist');
		}
		await userEvent.hover(button);
		expect(getByRole('tooltip')).toBeVisible();

		within(getByRole('tooltip')).getByText('View plans').click();

		expect(emitted()).toHaveProperty('upgrade');
	});

	it('should be disabled if the feature is enabled but the workflow is new', async () => {
		const { queryByTestId } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: true,
				isFeatureEnabled: true,
			},
		});
		expect(queryByTestId('workflow-history-button')).toHaveAttribute('disabled', 'true');
	});

	it('should be enabled if the feature is enabled and the workflow is not new', async () => {
		const { container, queryByTestId } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
				isFeatureEnabled: true,
			},
		});
		expect(queryByTestId('workflow-history-button')).toHaveAttribute('disabled', 'false');
		expect(container).toMatchSnapshot();
	});
});
