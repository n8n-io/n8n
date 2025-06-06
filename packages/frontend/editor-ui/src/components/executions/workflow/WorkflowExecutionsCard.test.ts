import { createComponentRenderer } from '@/__tests__/render';
import WorkflowExecutionsCard from '@/components/executions/workflow/WorkflowExecutionsCard.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';

vi.mock('vue-router', () => ({
	useRoute: () => ({
		params: {},
	}),
	RouterLink: vi.fn(),
	useRouter: vi.fn(),
}));

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			templates: {
				enabled: true,
				host: 'https://api.n8n.io/api/',
			},
			license: {
				environment: 'development',
			},
			deployment: {
				type: 'default',
			},
			enterprise: {},
		},
	},
};

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
		setActivePinia(createTestingPinia({ initialState }));
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

	test('displays correct text for new execution', () => {
		const createdAt = new Date('2024-09-27T12:00:00Z');
		const props = {
			execution: {
				id: '1',
				mode: 'manual',
				status: 'new',
				createdAt: createdAt.toISOString(),
			},
			workflowPermissions: {
				execute: true,
			},
		};

		const { getByTestId } = renderComponent({ props });

		const executionTimeElement = getByTestId('execution-time');
		expect(executionTimeElement).toBeVisible();
		expect(executionTimeElement.textContent).toBe('27 Sep - Starting soon');
	});

	afterEach(() => {
		vitest.useRealTimers();
	});

	test('uses `createdAt` to calculate running time if `startedAt` is undefined', () => {
		const createdAt = new Date('2024-09-27T12:00:00Z');
		const now = new Date('2024-09-27T12:30:00Z');
		vitest.useFakeTimers({ now });
		const props = {
			execution: {
				id: '1',
				mode: 'webhook',
				status: 'running',
				createdAt: createdAt.toISOString(),
			},
			workflowPermissions: { execute: true },
		};

		const { getByTestId } = renderComponent({ props });

		const executionTimeElement = getByTestId('execution-time-in-status');
		expect(executionTimeElement).toBeVisible();
		expect(executionTimeElement.textContent).toBe('for -1727438401s');
	});
});
