import { vi } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { WAIT_INDEFINITELY, type ExecutionSummary } from 'n8n-workflow';
import GlobalExecutionsListItem from './GlobalExecutionsListItem.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { DateTime } from 'luxon';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { ExecutionCallerKind } from '@n8n/api-types';

const routerPushMock = vi.fn();
const currentRouteRef = { value: { query: {} as Record<string, string | undefined> } };

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');

	return {
		...actual,
		useRouter: vi.fn(() => ({
			resolve: vi.fn(() => ({ href: 'mockedRoute' })),
			push: routerPushMock,
			currentRoute: currentRouteRef,
		})),
	};
});

vi.mock('../../composables/useExecutionHelpers', () => ({
	useExecutionHelpers: () => ({
		isExecutionRetriable: (execution: Pick<ExecutionSummary, 'status' | 'retrySuccessId'>) =>
			['crashed', 'error'].includes(execution.status) && !execution.retrySuccessId,
	}),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		activeExecutionId: '123',
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		formWaitingUrl: 'http://localhost:5678/form-waiting',
		webhookWaitingUrl: 'http://localhost:5678/webhook-waiting',
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: () => null,
	}),
}));

const globalExecutionsListItemQueuedTooltipRenderSpy = vi.fn();

const renderComponent = createComponentRenderer(GlobalExecutionsListItem, {
	global: {
		stubs: {
			N8nButton: true,
			I18nT: true,
			GlobalExecutionsListItemQueuedTooltip: {
				render: globalExecutionsListItemQueuedTooltipRenderSpy,
			},
		},
	},
});

describe('GlobalExecutionsListItem', () => {
	it('should render the status text for an execution', () => {
		const { getByTestId } = renderComponent({
			props: {
				execution: { status: 'running', id: 123, workflowName: 'Test Workflow' },
			} as unknown as ExecutionSummary,
		});

		expect(getByTestId('execution-status')).toBeInTheDocument();
	});

	it('should emit stop event on stop button click for a running execution', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				execution: { status: 'running', id: 123, stoppedAt: undefined, waitTill: true },
			} as unknown as ExecutionSummary,
		});

		const stopButton = getByTestId('stop-execution-button');

		expect(stopButton).toBeInTheDocument();

		await fireEvent.click(stopButton);
		expect(emitted().stop).toBeTruthy();
	});

	it('should emit retry events on retry original and retry saved dropdown items click', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				execution: {
					status: 'error',
					id: 123,
					stoppedAt: '01-01-2024',
					finished: false,
					retryOf: undefined,
					retrySuccessfulId: undefined,
					waitTill: false,
				} as unknown as ExecutionSummary,
				workflowPermissions: {
					execute: true,
				},
			},
		});

		await fireEvent.click(getByTestId('execution-retry-saved-dropdown-item'));
		expect(emitted().retrySaved).toBeTruthy();

		await fireEvent.click(getByTestId('execution-retry-original-dropdown-item'));
		expect(emitted().retryOriginal).toBeTruthy();
	});

	it('should emit delete event on delete dropdown item click', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				execution: {
					status: 'error',
					id: 123,
					stoppedAt: undefined,
				} as unknown as ExecutionSummary,
				workflowPermissions: {
					update: true,
				},
			},
		});

		await fireEvent.click(getByTestId('execution-delete-dropdown-item'));
		expect(emitted().delete).toBeTruthy();
	});

	it('should show formatted start date', () => {
		const testDate = '2022-01-01T12:00:00Z';
		const { getByText } = renderComponent({
			props: {
				execution: {
					status: 'success',
					id: 123,
					startedAt: testDate,
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
			},
		});

		expect(
			getByText(`Jan 1, 2022, ${DateTime.fromJSDate(new Date(testDate)).toFormat('HH')}:00:00`),
		).toBeInTheDocument();
	});

	it('should not render queued tooltip for a not indefinitely waiting execution', async () => {
		renderComponent({
			props: {
				execution: {
					status: 'waiting',
					waitTill: new Date(Date.now() + 10000000).toISOString(),
					id: 123,
					workflowName: 'Test Workflow',
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		expect(globalExecutionsListItemQueuedTooltipRenderSpy).not.toHaveBeenCalled();
	});

	it('should render queued tooltip for an indefinitely waiting execution', async () => {
		renderComponent({
			props: {
				execution: {
					status: 'waiting',
					waitTill: WAIT_INDEFINITELY,
					id: 123,
					workflowName: 'Test Workflow',
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		expect(globalExecutionsListItemQueuedTooltipRenderSpy).toHaveBeenCalled();
	});

	it('should render queued tooltip for a new execution', async () => {
		renderComponent({
			props: {
				execution: {
					status: 'new',
					id: 123,
					workflowName: 'Test Workflow',
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		expect(globalExecutionsListItemQueuedTooltipRenderSpy).toHaveBeenCalled();
	});

	afterEach(() => {
		vitest.useRealTimers();
	});

	const mockExecution = {
		status: 'success' as const,
		id: '999',
		workflowId: 'wf1',
		workflowName: 'Test Workflow',
		startedAt: new Date('2024-01-01T12:00:00Z'),
		stoppedAt: new Date('2024-01-01T12:00:01Z'),
		finished: true,
	} as unknown as ExecutionSummary;

	const defaultWorkflowPermissions = {
		execute: true,
		update: true,
	};

	describe('single-node source icon', () => {
		it.each<[ExecutionCallerKind, IconName]>([
			['mcp', 'bot'],
			['cli', 'terminal'],
			['sdk', 'code'],
			['instance-ai', 'bot'],
		])('renders the %s icon for caller.kind = %s', async (kind, icon) => {
			const { container } = renderComponent({
				props: {
					execution: {
						...mockExecution,
						mode: 'single-node',
						caller: { kind, name: 'demo' },
					},
					workflowPermissions: defaultWorkflowPermissions,
					concurrencyCap: 0,
				},
			});
			const iconEl = container.querySelector(`[data-icon="${icon}"]`);
			expect(iconEl).not.toBeNull();
		});

		it('falls back to the plug-zap icon for an unknown future caller.kind', () => {
			const { container } = renderComponent({
				props: {
					execution: {
						...mockExecution,
						mode: 'single-node',
						caller: { kind: 'browser' as ExecutionCallerKind, name: 'web-ui' },
					},
					workflowPermissions: defaultWorkflowPermissions,
					concurrencyCap: 0,
				},
			});
			expect(container.querySelector('[data-icon="plug-zap"]')).not.toBeNull();
		});
	});

	it('uses `createdAt` to calculate running time if `startedAt` is undefined', async () => {
		const createdAt = new Date('2024-09-27T12:00:00Z');
		const now = new Date('2024-09-27T12:30:00Z');
		vitest.useFakeTimers({ now });
		const { getByTestId } = renderComponent({
			props: {
				execution: {
					status: 'running',
					id: 123,
					workflowName: 'Test Workflow',
					createdAt,
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		const executionTimeElement = getByTestId('execution-time');
		expect(executionTimeElement).toBeVisible();
		expect(executionTimeElement.textContent).toBe('-1727438401s');
	});

	describe('session-id chip', () => {
		beforeEach(() => {
			routerPushMock.mockClear();
			currentRouteRef.value = { query: {} };
		});

		it('renders a session-id chip when caller.sessionId is present', () => {
			const { getByTestId } = renderComponent({
				props: {
					execution: {
						...mockExecution,
						mode: 'single-node',
						caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'a3f24c-session' },
					},
					workflowPermissions: defaultWorkflowPermissions,
					concurrencyCap: 0,
				},
			});
			const chip = getByTestId('executions-session-chip');
			expect(chip).toBeVisible();
			expect(chip.textContent).toContain('a3f24c');
		});

		it('omits the session chip when sessionId is absent', () => {
			const { queryByTestId } = renderComponent({
				props: {
					execution: {
						...mockExecution,
						mode: 'single-node',
						caller: { kind: 'mcp', name: 'X' },
					},
					workflowPermissions: defaultWorkflowPermissions,
					concurrencyCap: 0,
				},
			});
			expect(queryByTestId('executions-session-chip')).toBeNull();
		});

		it('pushes a metadata filter URL on chip click', async () => {
			const { getByTestId } = renderComponent({
				props: {
					execution: {
						...mockExecution,
						mode: 'single-node',
						caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'a3f24c-session' },
					},
					workflowPermissions: defaultWorkflowPermissions,
					concurrencyCap: 0,
				},
			});

			await fireEvent.click(getByTestId('executions-session-chip'));

			expect(routerPushMock).toHaveBeenCalledTimes(1);
			const arg = routerPushMock.mock.calls[0][0];
			expect(arg.query.metadata).toBe('caller.sessionId=a3f24c-session');
		});

		it('hides the caller chip and session chip when compact', () => {
			const { queryByTestId } = renderComponent({
				props: {
					execution: {
						...mockExecution,
						mode: 'single-node',
						caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'a3f24c-session' },
					},
					workflowPermissions: defaultWorkflowPermissions,
					concurrencyCap: 0,
					compact: true,
				},
			});
			expect(queryByTestId('executions-session-chip')).toBeNull();
			expect(queryByTestId('executions-caller-badge')).toBeNull();
		});
	});

	describe('session group child visual indicator', () => {
		it('does not mark the row as a session child when sessionKind is absent', () => {
			const { container } = renderComponent({
				props: {
					execution: {
						...mockExecution,
						mode: 'single-node',
						caller: { kind: 'mcp', name: 'Claude Desktop' },
					},
					workflowPermissions: defaultWorkflowPermissions,
					concurrencyCap: 0,
				},
			});
			const row = container.querySelector('tr');
			expect(row?.getAttribute('data-session-kind')).toBeFalsy();
		});

		it.each<[ExecutionCallerKind]>([['mcp'], ['cli'], ['sdk'], ['instance-ai']])(
			'tags the row with data-session-kind=%s when sessionKind is %s',
			(kind) => {
				const { container } = renderComponent({
					props: {
						execution: {
							...mockExecution,
							mode: 'single-node',
							caller: { kind, name: 'demo', sessionId: 'a3f24c-session' },
						},
						workflowPermissions: defaultWorkflowPermissions,
						concurrencyCap: 0,
						compact: true,
						sessionKind: kind,
					},
				});
				const row = container.querySelector('tr');
				expect(row?.getAttribute('data-session-kind')).toBe(kind);
			},
		);
	});

	it('uses `createdAt` to calculate running time if `startedAt` is undefined and `stoppedAt` is defined', async () => {
		const createdAt = new Date('2024-09-27T12:00:00Z');
		const now = new Date('2024-09-27T12:30:00Z');
		vitest.useFakeTimers({ now });
		const { getByTestId } = renderComponent({
			props: {
				execution: {
					status: 'running',
					id: 123,
					workflowName: 'Test Workflow',
					createdAt,
					stoppedAt: now,
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		const executionTimeElement = getByTestId('execution-time');
		expect(executionTimeElement).toBeVisible();
		expect(executionTimeElement.textContent).toBe('30m 0s');
	});
});
