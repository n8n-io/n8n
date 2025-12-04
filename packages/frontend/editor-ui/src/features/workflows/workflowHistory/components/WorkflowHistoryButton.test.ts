import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryButton from './WorkflowHistoryButton.vue';

vi.mock('vue-router', () => ({
	useRoute: () => vi.fn(),
	useRouter: () => vi.fn(),
	RouterLink: vi.fn(),
}));

const renderComponent = createComponentRenderer(WorkflowHistoryButton, {
	global: {
		stubs: {
			RouterLink: {
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
	it('should be disabled if the workflow is new', async () => {
		const { queryByTestId } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: true,
			},
		});
		expect(queryByTestId('workflow-history-button')).toHaveAttribute('disabled', 'true');
	});

	it('should be enabled if the workflow is not new', async () => {
		const { container, queryByTestId } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
			},
		});
		expect(queryByTestId('workflow-history-button')).toHaveAttribute('disabled', 'false');
		expect(container).toMatchSnapshot();
	});
});
