import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowExecutionsTable from './WorkflowExecutionsTable.vue';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import merge from 'lodash/merge';
import type { ExecutionSummary } from 'n8n-workflow';

vi.mock('vue-router', () => {
	const location = {};
	return {
		useRouter: vi.fn(),
		useRoute: () => ({
			location,
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

const makeExecution = (overrides: Partial<ExecutionSummary> = {}): ExecutionSummary =>
	({
		id: '1',
		status: 'success',
		mode: 'manual',
		createdAt: new Date().toISOString(),
		startedAt: new Date().toISOString(),
		stoppedAt: new Date().toISOString(),
		workflowId: 'wf1',
		workflowName: 'Test Workflow',
		finished: true,
		nodeExecutionStatus: {},
		scopes: [],
		...overrides,
	}) as ExecutionSummary;

const renderComponent = createComponentRenderer(WorkflowExecutionsTable, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.EXECUTIONS]: {
				executions: [],
				executionsCount: 0,
			},
			[STORES.SETTINGS]: {
				settings: merge(SETTINGS_STORE_DEFAULT_STATE.settings, {
					enterprise: {
						advancedExecutionFilters: true,
					},
				}),
			},
		},
	}),
});

describe('WorkflowExecutionsTable', () => {
	it('should render without errors', () => {
		expect(() =>
			renderComponent({
				props: {
					executions: [],
					workflow: { id: 'wf1', name: 'Test' },
					loading: false,
					loadingMore: false,
				},
			}),
		).not.toThrow();
	});

	it('should show empty state when no executions', () => {
		const { getByTestId } = renderComponent({
			props: {
				executions: [],
				workflow: { id: 'wf1', name: 'Test' },
				loading: false,
				loadingMore: false,
			},
		});

		expect(getByTestId('execution-list-empty')).toBeVisible();
	});

	it('should render execution rows', () => {
		const executions = [makeExecution({ id: '1' }), makeExecution({ id: '2' })];

		const { getAllByTestId } = renderComponent({
			props: {
				executions,
				workflow: { id: 'wf1', name: 'Test' },
				loading: false,
				loadingMore: false,
			},
		});

		expect(getAllByTestId('workflow-execution-list-item')).toHaveLength(2);
	});

	it('should not render workflow column', () => {
		const { container } = renderComponent({
			props: {
				executions: [makeExecution()],
				workflow: { id: 'wf1', name: 'Test' },
				loading: false,
				loadingMore: false,
			},
		});

		const headers = container.querySelectorAll('th');
		const headerTexts = Array.from(headers).map((th) => th.textContent?.trim());
		expect(headerTexts).not.toContain('generic.workflow');
	});

	it('should render column picker', () => {
		const { getByTestId } = renderComponent({
			props: {
				executions: [],
				workflow: { id: 'wf1', name: 'Test' },
				loading: false,
				loadingMore: false,
			},
		});

		expect(getByTestId('execution-column-picker-button')).toBeVisible();
	});
});
