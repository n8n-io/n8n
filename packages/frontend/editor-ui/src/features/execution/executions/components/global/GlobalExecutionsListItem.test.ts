import { vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/vue';
import { WAIT_INDEFINITELY, type ExecutionSummary } from 'n8n-workflow';
import GlobalExecutionsListItem from './GlobalExecutionsListItem.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { DateTime } from 'luxon';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { mockedStore, hoverTooltipTrigger, getTooltip, queryTooltip } from '@/__tests__/utils';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');

	return {
		...actual,
		useRouter: vi.fn(() => ({
			resolve: vi.fn(() => ({ href: 'mockedRoute' })),
		})),
	};
});

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
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isModuleActive.mockReturnValue(false);
	});

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

		await fireEvent.click(getByTestId('execution-actions-menu'));
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
				workflowPermissions: {},
				executionPermissions: {
					delete: true,
				},
			},
		});

		await fireEvent.click(getByTestId('execution-actions-menu'));
		await fireEvent.click(getByTestId('execution-delete-dropdown-item'));
		expect(emitted().delete).toBeTruthy();
	});

	it('disables the delete dropdown item when the user cannot delete executions, even with workflow edit rights', async () => {
		const { getByTestId } = renderComponent({
			props: {
				execution: {
					status: 'error',
					id: 123,
					stoppedAt: undefined,
				} as unknown as ExecutionSummary,
				workflowPermissions: {
					update: true,
					execute: true,
				},
				executionPermissions: {},
			},
		});

		await fireEvent.click(getByTestId('execution-actions-menu'));
		expect(getByTestId('execution-delete-dropdown-item')).toHaveClass('is-disabled');
	});

	it('enables the delete dropdown item when the user can delete executions', async () => {
		const { getByTestId } = renderComponent({
			props: {
				execution: {
					status: 'error',
					id: 123,
					stoppedAt: undefined,
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
				executionPermissions: {
					delete: true,
				},
			},
		});

		await fireEvent.click(getByTestId('execution-actions-menu'));
		expect(getByTestId('execution-delete-dropdown-item')).not.toHaveClass('is-disabled');
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

	describe('engine', () => {
		const v1Id = '123';
		const v2Id = '019a3b2c-4d5e-7f60-8a1b-2c3d4e5f6a7b';
		const renderWithId = (id: string) =>
			renderComponent({
				props: {
					execution: {
						status: 'success',
						id,
						workflowName: 'Test Workflow',
					} as unknown as ExecutionSummary,
					workflowPermissions: {},
					concurrencyCap: 5,
				},
			});

		describe('with the engine-v2 module active', () => {
			beforeEach(() => {
				settingsStore.isModuleActive.mockImplementation((name) => name === 'engine-v2');
			});

			it.each([
				[v1Id, 'v1'],
				[v2Id, 'v2'],
			])('shows the engine badge for execution %s', (id, label) => {
				const { getByTestId } = renderWithId(id);

				expect(getByTestId('execution-engine-badge')).toHaveTextContent(label);
			});

			it.each([
				[v1Id, 'Ran on engine v1'],
				[v2Id, 'Ran on engine v2'],
			])('names the engine in the tooltip of execution %s', async (id, text) => {
				const { getByTestId } = renderWithId(id);

				await hoverTooltipTrigger(getByTestId('execution-id'));

				await waitFor(() => expect(getTooltip()).toHaveTextContent(text));
			});
		});

		describe('with the engine-v2 module inactive', () => {
			it('shows the execution ID without a badge or a tooltip', async () => {
				const { getByText, queryByTestId } = renderWithId(v2Id);

				await hoverTooltipTrigger(getByText(v2Id));

				expect(queryByTestId('execution-engine-badge')).not.toBeInTheDocument();
				expect(queryByTestId('execution-id')).not.toBeInTheDocument();
				expect(queryTooltip()).not.toBeInTheDocument();
			});
		});
	});

	afterEach(() => {
		vitest.useRealTimers();
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
