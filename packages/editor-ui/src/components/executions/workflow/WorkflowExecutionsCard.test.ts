import { createComponentRenderer } from '@/__tests__/render';
import WorkflowExecutionsCard from '@/components/executions/workflow/WorkflowExecutionsCard.vue';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vue-router', () => ({
	useRoute: () => ({
		params: {},
	}),
	RouterLink: vi.fn(),
}));

const renderComponent = createComponentRenderer(WorkflowExecutionsCard, {
	global: {
		stubs: {
			'router-link': {
				template: '<div><slot /></div>',
			},
		},
		mocks: {
			$route: {
				params: {},
			},
		},
	},
});

describe('WorkflowExecutionsCard', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	test.each([
		[
			{
				execution: {
					id: '1',
					mode: 'manual',
					status: 'success',
					retryOf: null,
					retrySuccessId: null,
				},
				workflowPermissions: {
					execute: true,
				},
			},
			false,
			false,
		],
		[
			{
				execution: {
					id: '2',
					mode: 'manual',
					status: 'error',
					retryOf: null,
					retrySuccessId: null,
				},
				workflowPermissions: {
					execute: true,
				},
			},
			true,
			false,
		],
		[
			{
				execution: {
					id: '3',
					mode: 'manual',
					status: 'error',
					retryOf: null,
					retrySuccessId: '3',
				},
				workflowPermissions: {
					execute: true,
				},
			},
			false,
			false,
		],
		[
			{
				execution: {
					id: '4',
					mode: 'manual',
					status: 'success',
					retryOf: '4',
					retrySuccessId: null,
				},
				workflowPermissions: {
					execute: true,
				},
			},
			false,
			false,
		],
		[
			{
				execution: {
					id: '2',
					mode: 'manual',
					status: 'error',
					retryOf: null,
					retrySuccessId: null,
				},
				workflowPermissions: {},
			},
			true,
			true,
		],
	])(
		'with execution %j retry button visibility is %s and if visible is disabled %s',
		(props, shouldRenderRetryBtn, disabled) => {
			const { queryByTestId } = renderComponent({
				props,
			});

			const retryButton = queryByTestId('retry-execution-button');

			if (shouldRenderRetryBtn) {
				expect(retryButton).toBeVisible();

				if (disabled) {
					expect(retryButton?.querySelector('.is-disabled')).toBeVisible();
				} else {
					expect(retryButton?.querySelector('.is-disabled')).toBe(null);
				}
			} else {
				expect(retryButton).toBe(null);
			}
		},
	);
});
