import { createComponentRenderer } from '@/__tests__/render';
import WorkflowExecutionsCard from './WorkflowExecutionsCard.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import type { ComponentProps } from 'vue-component-type-helpers';
import type { ExecutionSummary } from 'n8n-workflow';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import { computed } from 'vue';

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
			RouterLink: {
				template: '<div><slot /></div>',
			},
		},
		mocks: {
			$route: {
				params: {},
			},
		},
		provide: {
			[WorkflowIdKey]: computed(() => 'test-workflow-id'),
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
				props: props as ComponentProps<typeof WorkflowExecutionsCard>,
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
		const props: ComponentProps<typeof WorkflowExecutionsCard> = {
			execution: {
				id: '1',
				mode: 'manual',
				status: 'new',
				createdAt: createdAt.toISOString(),
			} as unknown as ExecutionSummary,
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
		const props: ComponentProps<typeof WorkflowExecutionsCard> = {
			execution: {
				id: '1',
				mode: 'webhook',
				status: 'running',
				createdAt: createdAt.toISOString(),
			} as unknown as ExecutionSummary,
			workflowPermissions: { execute: true },
		};

		const { getByTestId } = renderComponent({ props });

		const executionTimeElement = getByTestId('execution-time-in-status');
		expect(executionTimeElement).toBeVisible();
		expect(executionTimeElement.textContent).toBe('for -1727438401s');
	});

	describe('Running execution time display (PAY-3162)', () => {
		test('displays "for" time when execution is running without stoppedAt', () => {
			const createdAt = new Date('2024-09-27T12:00:00Z');
			const startedAt = new Date('2024-09-27T12:05:00Z');
			const now = new Date('2024-09-27T12:30:00Z');
			vitest.useFakeTimers({ now });

			const props: ComponentProps<typeof WorkflowExecutionsCard> = {
				execution: {
					id: '1',
					mode: 'manual',
					status: 'running',
					createdAt: createdAt.toISOString(),
					startedAt: startedAt.toISOString(),
					// stoppedAt is undefined - execution is truly running
				} as unknown as ExecutionSummary,
				workflowPermissions: { execute: true },
			};

			const { queryByTestId } = renderComponent({ props });

			// The "for" time indicator should be visible
			const executionTimeInStatus = queryByTestId('execution-time-in-status');
			expect(executionTimeInStatus).toBeVisible();
			expect(executionTimeInStatus?.textContent).toContain('for');
		});

		test('hides "for" time when execution has stoppedAt (even if status is running)', () => {
			const createdAt = new Date('2024-09-27T12:00:00Z');
			const startedAt = new Date('2024-09-27T12:05:00Z');
			const stoppedAt = new Date('2024-09-27T12:10:00Z');
			const now = new Date('2024-09-27T12:30:00Z');
			vitest.useFakeTimers({ now });

			const props: ComponentProps<typeof WorkflowExecutionsCard> = {
				execution: {
					id: '2',
					mode: 'manual',
					status: 'running', // Status is still 'running' (race condition)
					createdAt: createdAt.toISOString(),
					startedAt: startedAt.toISOString(),
					stoppedAt: stoppedAt.toISOString(), // But execution has been stopped
				} as unknown as ExecutionSummary,
				workflowPermissions: { execute: true },
			};

			const { queryByTestId } = renderComponent({ props });

			// The "for" time indicator should NOT be visible
			const executionTimeInStatus = queryByTestId('execution-time-in-status');
			expect(executionTimeInStatus).toBeNull();
		});

		test('hides "for" time when execution status is not running', () => {
			const createdAt = new Date('2024-09-27T12:00:00Z');
			const stoppedAt = new Date('2024-09-27T12:10:00Z');

			const props: ComponentProps<typeof WorkflowExecutionsCard> = {
				execution: {
					id: '3',
					mode: 'manual',
					status: 'success', // Status is 'success'
					createdAt: createdAt.toISOString(),
					stoppedAt: stoppedAt.toISOString(),
				} as unknown as ExecutionSummary,
				workflowPermissions: { execute: true },
			};

			const { queryByTestId } = renderComponent({ props });

			// The "for" time indicator should NOT be visible for completed executions
			const executionTimeInStatus = queryByTestId('execution-time-in-status');
			expect(executionTimeInStatus).toBeNull();
		});

		test('shows running time for execution without startedAt but with running status', () => {
			const createdAt = new Date('2024-09-27T12:00:00Z');
			const now = new Date('2024-09-27T12:05:00Z');
			vitest.useFakeTimers({ now });

			const props: ComponentProps<typeof WorkflowExecutionsCard> = {
				execution: {
					id: '4',
					mode: 'webhook',
					status: 'running',
					createdAt: createdAt.toISOString(),
					// startedAt is undefined - it will fallback to createdAt
					// stoppedAt is undefined - execution is running
				} as unknown as ExecutionSummary,
				workflowPermissions: { execute: true },
			};

			const { queryByTestId } = renderComponent({ props });

			// The "for" time indicator should be visible and use createdAt as fallback
			const executionTimeInStatus = queryByTestId('execution-time-in-status');
			expect(executionTimeInStatus).toBeVisible();
			expect(executionTimeInStatus?.textContent).toContain('for');
		});
	});
});
