import { ref, nextTick } from 'vue';
import { useExecutionColumns } from './useExecutionColumns';
import type { ExecutionSummaryWithCustomData } from '../executions.types';

vi.mock('vue-router', () => ({
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const makeExecution = (
	overrides: Partial<ExecutionSummaryWithCustomData> = {},
): ExecutionSummaryWithCustomData =>
	({
		id: '1',
		status: 'success',
		mode: 'manual',
		createdAt: new Date().toISOString(),
		startedAt: new Date().toISOString(),
		stoppedAt: new Date().toISOString(),
		workflowId: 'wf1',
		workflowName: 'Test',
		finished: true,
		nodeExecutionStatus: {},
		scopes: [],
		...overrides,
	}) as ExecutionSummaryWithCustomData;

describe('useExecutionColumns', () => {
	it('should return all static columns visible by default', () => {
		const executions = ref<ExecutionSummaryWithCustomData[]>([]);
		const { visibleColumns, visibleColumnCount } = useExecutionColumns(executions);

		expect(visibleColumnCount.value).toBe(8);
		const ids = visibleColumns.value.map((c) => c.id);
		expect(ids).toEqual([
			'workflow',
			'status',
			'startedAt',
			'runTime',
			'id',
			'tags',
			'rating',
			'mode',
		]);
	});

	it('should toggle a column off and on', () => {
		const executions = ref<ExecutionSummaryWithCustomData[]>([]);
		const { visibleColumnCount, isColumnVisible, toggleColumn } = useExecutionColumns(executions);

		expect(isColumnVisible('workflow')).toBe(true);
		expect(visibleColumnCount.value).toBe(8);

		toggleColumn('workflow');
		expect(isColumnVisible('workflow')).toBe(false);
		expect(visibleColumnCount.value).toBe(7);

		toggleColumn('workflow');
		expect(isColumnVisible('workflow')).toBe(true);
		expect(visibleColumnCount.value).toBe(8);
	});

	it('should extract customDataKeys from executions', async () => {
		const executions = ref<ExecutionSummaryWithCustomData[]>([
			makeExecution({ customData: { orderId: '123', region: 'US' } }),
			makeExecution({ customData: { orderId: '456', env: 'prod' } }),
		]);
		const { allColumns, visibleColumns } = useExecutionColumns(executions);

		const customCols = allColumns.value.filter((c) => c.group === 'customData');
		expect(customCols.map((c) => c.id)).toEqual([
			'customData:env',
			'customData:orderId',
			'customData:region',
		]);
		expect(visibleColumns.value.length).toBe(11); // 8 static + 3 custom
	});

	it('should react to executions changes', async () => {
		const executions = ref<ExecutionSummaryWithCustomData[]>([]);
		const { allColumns, visibleColumnCount } = useExecutionColumns(executions);

		expect(allColumns.value.length).toBe(8);
		expect(visibleColumnCount.value).toBe(8);

		executions.value = [makeExecution({ customData: { foo: 'bar' } })];
		await nextTick();

		expect(allColumns.value.length).toBe(9);
		expect(visibleColumnCount.value).toBe(9);
		expect(allColumns.value.at(-1)?.id).toBe('customData:foo');
	});

	it('should return all toggleable columns', () => {
		const executions = ref<ExecutionSummaryWithCustomData[]>([]);
		const { toggleableColumns } = useExecutionColumns(executions);

		expect(toggleableColumns.value.length).toBe(8);
		expect(toggleableColumns.value.every((c) => c.toggleable)).toBe(true);
	});

	it('should exclude columns specified in excludeColumns option', () => {
		const executions = ref<ExecutionSummaryWithCustomData[]>([]);
		const { visibleColumns, visibleColumnCount, allColumns } = useExecutionColumns(executions, {
			excludeColumns: ['workflow'],
		});

		expect(visibleColumnCount.value).toBe(7);
		expect(allColumns.value.find((c) => c.id === 'workflow')).toBeUndefined();
		expect(visibleColumns.value.find((c) => c.id === 'workflow')).toBeUndefined();
	});

	it('should exclude multiple columns', () => {
		const executions = ref<ExecutionSummaryWithCustomData[]>([]);
		const { visibleColumnCount, allColumns } = useExecutionColumns(executions, {
			excludeColumns: ['workflow', 'mode', 'tags'],
		});

		expect(visibleColumnCount.value).toBe(5);
		expect(allColumns.value.find((c) => c.id === 'workflow')).toBeUndefined();
		expect(allColumns.value.find((c) => c.id === 'mode')).toBeUndefined();
		expect(allColumns.value.find((c) => c.id === 'tags')).toBeUndefined();
	});

	it('should exclude columns and still include custom data columns', async () => {
		const executions = ref<ExecutionSummaryWithCustomData[]>([
			makeExecution({ customData: { orderId: '123' } }),
		]);
		const { allColumns } = useExecutionColumns(executions, {
			excludeColumns: ['workflow'],
		});

		expect(allColumns.value.find((c) => c.id === 'workflow')).toBeUndefined();
		expect(allColumns.value.find((c) => c.id === 'customData:orderId')).toBeDefined();
		expect(allColumns.value.length).toBe(8); // 7 static (excl workflow) + 1 custom
	});

	it('should return column labels', () => {
		const executions = ref<ExecutionSummaryWithCustomData[]>([
			makeExecution({ customData: { orderId: '123' } }),
		]);
		const { allColumns, getColumnLabel } = useExecutionColumns(executions);

		const workflowCol = allColumns.value.find((c) => c.id === 'workflow')!;
		expect(getColumnLabel(workflowCol)).toBe('generic.workflow');

		const customCol = allColumns.value.find((c) => c.id === 'customData:orderId')!;
		expect(getColumnLabel(customCol)).toBe('orderId');
	});
});
