import { createComponentRenderer } from '@/__tests__/render';
import ExecutionCard from '@/components/ExecutionsView/ExecutionCard.vue';
import { createPinia, setActivePinia } from 'pinia';

const renderComponent = createComponentRenderer(ExecutionCard, {
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

describe('ExecutionCard', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	test.each([
		[
			{
				id: '1',
				mode: 'manual',
				status: 'success',
				retryOf: null,
				retrySuccessId: null,
			},
			false,
		],
		[
			{
				id: '2',
				mode: 'manual',
				status: 'error',
				retryOf: null,
				retrySuccessId: null,
			},
			true,
		],
		[
			{
				id: '3',
				mode: 'manual',
				status: 'error',
				retryOf: '2',
				retrySuccessId: null,
			},
			false,
		],
		[
			{
				id: '4',
				mode: 'manual',
				status: 'error',
				retryOf: null,
				retrySuccessId: '3',
			},
			false,
		],
	])('with execution %j retry button visibility is %s', (execution, shouldRenderRetryBtn) => {
		const { queryByTestId } = renderComponent({
			props: {
				execution,
			},
		});

		expect(!!queryByTestId('retry-execution-button') && shouldRenderRetryBtn).toBe(
			shouldRenderRetryBtn,
		);
	});
});
