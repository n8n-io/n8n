import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

// ---------------------------------------------------------------------------
// Hoisted mock state — all mutable shared state must be declared here so that
// vi.mock factory closures (which run before imports) can capture the refs.
// ---------------------------------------------------------------------------
const { mocks } = vi.hoisted(() => ({
	mocks: {
		// workflowDocumentStore
		workflowId: 'wf-123' as string | undefined,
		projectId: 'proj-456' as string | undefined,
		workflowName: 'My Workflow' as string,
		connectionsBySourceNode: {} as Record<string, unknown>,
		allNodes: [] as Array<{ name: string; type: string }>,

		// wizardSidepanel.store
		activeRowIndex: null as number | null,
		activeRowId: null as number | null,
		inputs: {} as Record<string, string>,
		expectedValues: {} as Record<string, string>,
		selectedMetricKeys: [] as string[],
		judgeSelectionByMetric: {} as Record<string, unknown>,
		customChecks: [] as unknown[],
		isSliceMode: false,
		aiNodeName: 'AI Agent',
		startNodeName: '',
		endNodeName: '',
		setActiveRow: vi.fn(),
		setActiveRunId: vi.fn(),

		// sliceInputs
		fieldNames: ['input'] as string[],

		// nodeTypesStore
		isTriggerNode: vi.fn((_type: string) => false),

		// rootStore
		restApiContext: { baseUrl: 'http://n8n', pushRef: 'push-ref' } as unknown,

		// data table api
		fetchDataTablesApi: vi.fn(),
		createDataTableApi: vi.fn(),
		addDataTableColumnApi: vi.fn(),
		deleteDataTableApi: vi.fn(),
		deleteDataTableColumnApi: vi.fn(),
		getDataTableRowsApi: vi.fn(),
		insertDataTableRowApi: vi.fn(),
		updateDataTableRowsApi: vi.fn(),
		deleteDataTableRowsApi: vi.fn(),

		// evaluation api
		listEvaluationConfigs: vi.fn(),
		createEvaluationConfig: vi.fn(),
		updateEvaluationConfig: vi.fn(),
		deleteEvaluationConfig: vi.fn(),

		// evaluation store
		startTestRun: vi.fn(),
		fetchTestRuns: vi.fn(),

		// buildEvaluationConfigDto
		buildEvaluationConfigDto: vi.fn(),

		// toast
		showError: vi.fn(),

		// telemetry
		track: vi.fn(),
	},
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		value: {
			get workflowId() {
				return mocks.workflowId;
			},
			get homeProject() {
				return { id: mocks.projectId };
			},
			get name() {
				return mocks.workflowName;
			},
			get connectionsBySourceNode() {
				return mocks.connectionsBySourceNode;
			},
			get allNodes() {
				return mocks.allNodes;
			},
		},
	}),
}));

vi.mock('../wizardSidepanel.store', () => ({
	useEvaluationsWizardSidepanelStore: () => ({
		get activeRowIndex() {
			return mocks.activeRowIndex;
		},
		get activeRowId() {
			return mocks.activeRowId;
		},
		get inputs() {
			return mocks.inputs;
		},
		get expectedValues() {
			return mocks.expectedValues;
		},
		get selectedMetricKeys() {
			return mocks.selectedMetricKeys;
		},
		get judgeSelectionByMetric() {
			return mocks.judgeSelectionByMetric;
		},
		get customChecks() {
			return mocks.customChecks;
		},
		get isSliceMode() {
			return mocks.isSliceMode;
		},
		get aiNodeName() {
			return mocks.aiNodeName;
		},
		get startNodeName() {
			return mocks.startNodeName;
		},
		get endNodeName() {
			return mocks.endNodeName;
		},
		setActiveRow: mocks.setActiveRow,
		setActiveRunId: mocks.setActiveRunId,
	}),
}));

vi.mock('./useSliceInputs', () => ({
	useSliceInputs: () =>
		ref({
			get fieldNames() {
				return mocks.fieldNames;
			},
			values: {},
			hasExecution: true,
		}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ isTriggerNode: mocks.isTriggerNode }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: mocks.restApiContext }),
}));

vi.mock('@/features/core/dataTable/dataTable.api', () => ({
	fetchDataTablesApi: (...args: unknown[]) => mocks.fetchDataTablesApi(...args),
	createDataTableApi: (...args: unknown[]) => mocks.createDataTableApi(...args),
	addDataTableColumnApi: (...args: unknown[]) => mocks.addDataTableColumnApi(...args),
	deleteDataTableApi: (...args: unknown[]) => mocks.deleteDataTableApi(...args),
	deleteDataTableColumnApi: (...args: unknown[]) => mocks.deleteDataTableColumnApi(...args),
	getDataTableRowsApi: (...args: unknown[]) => mocks.getDataTableRowsApi(...args),
	insertDataTableRowApi: (...args: unknown[]) => mocks.insertDataTableRowApi(...args),
	updateDataTableRowsApi: (...args: unknown[]) => mocks.updateDataTableRowsApi(...args),
	deleteDataTableRowsApi: (...args: unknown[]) => mocks.deleteDataTableRowsApi(...args),
}));

vi.mock('../evaluation.api', () => ({
	listEvaluationConfigs: (...args: unknown[]) => mocks.listEvaluationConfigs(...args),
	createEvaluationConfig: (...args: unknown[]) => mocks.createEvaluationConfig(...args),
	updateEvaluationConfig: (...args: unknown[]) => mocks.updateEvaluationConfig(...args),
	deleteEvaluationConfig: (...args: unknown[]) => mocks.deleteEvaluationConfig(...args),
}));

vi.mock('../evaluation.store', () => ({
	useEvaluationStore: () => ({
		startTestRun: mocks.startTestRun,
		fetchTestRuns: mocks.fetchTestRuns,
	}),
}));

vi.mock('./buildEvaluationConfigDto', () => ({
	buildEvaluationConfigDto: (...args: unknown[]) => mocks.buildEvaluationConfigDto(...args),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError }),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

// Mock the focus panel store to prevent transitive i18n side-effects (its
// watchers also outlive tests on Node 24 and cause post-teardown rejections).
vi.mock('@/app/stores/focusPanel.store', () => ({
	useFocusPanelStore: () => ({
		focusPanelActive: false,
		selectedTab: 'evaluations',
		openFocusPanel: vi.fn(),
		closeFocusPanel: vi.fn(),
		setSelectedTab: vi.fn(),
	}),
}));

// n8n-workflow graph helpers — keep real logic but mock the module so vi can
// intercept. resolveSlice uses isTriggerNode; we control that through mocks.
vi.mock('n8n-workflow', () => ({
	getParentNodes: vi.fn((_byDest, name, _type, depth) => {
		// For the trigger-finding tests: AI Agent's parent is "Trigger".
		if (name === 'AI Agent' && depth === undefined) return ['Trigger'];
		if (name === 'AI Agent' && depth === 1) return ['Trigger'];
		return [];
	}),
	mapConnectionsByDestination: vi.fn(() => ({})),
}));

// ---------------------------------------------------------------------------
// Import the composable under test AFTER all vi.mock calls
// ---------------------------------------------------------------------------
import { useTestCasePersistence } from './useTestCasePersistence';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTableRow(id: number | string) {
	return { id, input: 'hello', createdAt: '2025-01-01', updatedAt: '2025-01-01' };
}

function setupHappyPath() {
	// Data-table: one existing table returned
	mocks.fetchDataTablesApi.mockResolvedValue({
		data: [{ id: 'tbl-1', name: 'Evaluation: My Workflow', columns: [{ name: 'input' }] }],
		count: 1,
	});

	// buildEvaluationConfigDto always succeeds
	mocks.buildEvaluationConfigDto.mockReturnValue({
		ok: true,
		dto: {
			name: 'Evaluation: My Workflow',
			startNodeName: 'AI Agent',
			endNodeName: 'AI Agent',
			metrics: [],
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'tbl-1' },
		},
	});

	// Evaluation config: no existing config → create
	mocks.listEvaluationConfigs.mockResolvedValue([]);
	mocks.createEvaluationConfig.mockResolvedValue({ id: 'cfg-1', name: 'Evaluation: My Workflow' });

	// Test run dispatch
	mocks.startTestRun.mockResolvedValue({ success: true, testRunId: 'run-1' });
	mocks.fetchTestRuns.mockResolvedValue([]);

	// Node types: AI Agent is NOT a trigger; Trigger IS a trigger
	mocks.isTriggerNode.mockImplementation((type: string) => type === 'trigger');
	mocks.allNodes = [
		{ name: 'Trigger', type: 'trigger' },
		{ name: 'AI Agent', type: 'ai' },
	];
	mocks.aiNodeName = 'AI Agent';
	mocks.isSliceMode = false;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTestCasePersistence', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		// Reset all mocks
		vi.clearAllMocks();

		// Reset store-like state
		mocks.workflowId = 'wf-123';
		mocks.projectId = 'proj-456';
		mocks.workflowName = 'My Workflow';
		mocks.connectionsBySourceNode = {};
		mocks.allNodes = [];
		mocks.activeRowIndex = null;
		mocks.activeRowId = null;
		mocks.inputs = { input: 'hello' };
		mocks.expectedValues = {};
		mocks.selectedMetricKeys = [];
		mocks.judgeSelectionByMetric = {};
		mocks.customChecks = [];
		mocks.isSliceMode = false;
		mocks.aiNodeName = 'AI Agent';
		mocks.startNodeName = '';
		mocks.endNodeName = '';
		mocks.fieldNames = ['input'];
		mocks.setActiveRow.mockReset();
		mocks.setActiveRunId.mockReset();
		// `ensureDataTable` now reads the created column's id (for rollback), so the
		// add-column mock must return a column shape like the real API does.
		mocks.addDataTableColumnApi.mockResolvedValue({ id: 'col-added', name: 'col', type: 'string' });
	});

	// -----------------------------------------------------------------------
	// ADD path (activeRowIndex === null)
	// -----------------------------------------------------------------------

	describe('persistAndRunCase — ADD path (activeRowIndex === null)', () => {
		it('inserts a new row and calls setActiveRow with append index and inserted id', async () => {
			setupHappyPath();
			mocks.activeRowIndex = null;

			// getDataTableRowsApi is called to count existing rows (take:1)
			mocks.getDataTableRowsApi.mockResolvedValue({ data: [], count: 5 });

			// insert returns the new row
			mocks.insertDataTableRowApi.mockResolvedValue([{ id: 5 }]);

			const { persistAndRunCase } = useTestCasePersistence();
			const result = await persistAndRunCase('initial');

			expect(result).toBe(true);
			// Row count API called with take:1 to determine append index
			expect(mocks.getDataTableRowsApi).toHaveBeenCalledWith(
				mocks.restApiContext,
				'tbl-1',
				'proj-456',
				{ take: 1 },
			);
			// Insert called with the form data
			expect(mocks.insertDataTableRowApi).toHaveBeenCalledWith(
				mocks.restApiContext,
				'tbl-1',
				{ input: 'hello', caseName: '' },
				'proj-456',
			);
			// setActiveRow called with (appendIndex=5, insertedId=5)
			expect(mocks.setActiveRow).toHaveBeenCalledWith(5, 5);
		});

		it('dispatches startTestRun with rowIndices: [appendIndex]', async () => {
			setupHappyPath();
			mocks.activeRowIndex = null;
			mocks.getDataTableRowsApi.mockResolvedValue({ data: [], count: 3 });
			mocks.insertDataTableRowApi.mockResolvedValue([{ id: 3 }]);

			const { persistAndRunCase } = useTestCasePersistence();
			await persistAndRunCase('initial');

			expect(mocks.startTestRun).toHaveBeenCalledWith('wf-123', {
				evaluationConfigId: 'cfg-1',
				compileFromConfig: true,
				rowIndices: [3],
			});
		});

		it('sets activeRunId from dispatched testRunId', async () => {
			setupHappyPath();
			mocks.activeRowIndex = null;
			mocks.getDataTableRowsApi.mockResolvedValue({ data: [], count: 0 });
			mocks.insertDataTableRowApi.mockResolvedValue([{ id: 0 }]);
			mocks.startTestRun.mockResolvedValue({ success: true, testRunId: 'run-abc' });

			const { persistAndRunCase } = useTestCasePersistence();
			await persistAndRunCase('initial');

			expect(mocks.setActiveRunId).toHaveBeenCalledWith(null); // cleared first
			expect(mocks.setActiveRunId).toHaveBeenCalledWith('run-abc');
		});

		it('emits telemetry with is_new_case: true and row_index matching append index', async () => {
			setupHappyPath();
			mocks.activeRowIndex = null;
			mocks.getDataTableRowsApi.mockResolvedValue({ data: [], count: 7 });
			mocks.insertDataTableRowApi.mockResolvedValue([{ id: 7 }]);

			const { persistAndRunCase } = useTestCasePersistence();
			await persistAndRunCase('initial');

			expect(mocks.track).toHaveBeenCalledWith(
				'User ran evaluation',
				expect.objectContaining({
					workflow_id: 'wf-123',
					row_index: 7,
					is_new_case: true,
					trigger: 'initial',
				}),
			);
		});
	});

	// -----------------------------------------------------------------------
	// EDIT path with known activeRowId
	// -----------------------------------------------------------------------

	describe('persistAndRunCase — EDIT path with known activeRowId', () => {
		it('updates row by activeRowId and dispatches with rowIndices: [activeRowIndex]', async () => {
			setupHappyPath();
			mocks.activeRowIndex = 2;
			mocks.activeRowId = 99;
			mocks.updateDataTableRowsApi = vi.fn().mockResolvedValue([{ id: 99 }]);

			const { persistAndRunCase } = useTestCasePersistence();
			const result = await persistAndRunCase('run_again');

			expect(result).toBe(true);
			// Should NOT call getDataTableRowsApi to look up the row id
			// (only ensure-table calls fetchDataTablesApi; no row-level GET needed)
			expect(mocks.insertDataTableRowApi).not.toHaveBeenCalled();
			expect(mocks.updateDataTableRowsApi).toHaveBeenCalledWith(
				mocks.restApiContext,
				'tbl-1',
				99,
				{ input: 'hello', caseName: '' },
				'proj-456',
			);
			expect(mocks.startTestRun).toHaveBeenCalledWith('wf-123', {
				evaluationConfigId: 'cfg-1',
				compileFromConfig: true,
				rowIndices: [2],
			});
		});

		it('emits telemetry with is_new_case: false and trigger: run_again', async () => {
			setupHappyPath();
			mocks.activeRowIndex = 2;
			mocks.activeRowId = 99;
			mocks.updateDataTableRowsApi = vi.fn().mockResolvedValue([{ id: 99 }]);

			const { persistAndRunCase } = useTestCasePersistence();
			await persistAndRunCase('run_again');

			expect(mocks.track).toHaveBeenCalledWith(
				'User ran evaluation',
				expect.objectContaining({
					row_index: 2,
					is_new_case: false,
					trigger: 'run_again',
				}),
			);
		});
	});

	// -----------------------------------------------------------------------
	// EDIT path with unknown activeRowId (must resolve via API)
	// -----------------------------------------------------------------------

	describe('persistAndRunCase — EDIT path with null activeRowId', () => {
		it('looks up the row id via getDataTableRowsApi({skip:n, take:1}) and updates', async () => {
			setupHappyPath();
			mocks.activeRowIndex = 2;
			mocks.activeRowId = null; // unknown — must resolve

			mocks.getDataTableRowsApi.mockResolvedValue({
				data: [makeTableRow(77)],
				count: 10,
			});
			mocks.updateDataTableRowsApi = vi.fn().mockResolvedValue([{ id: 77 }]);

			const { persistAndRunCase } = useTestCasePersistence();
			const result = await persistAndRunCase('initial');

			expect(result).toBe(true);
			// Should call getDataTableRowsApi with skip:2 take:1
			expect(mocks.getDataTableRowsApi).toHaveBeenCalledWith(
				mocks.restApiContext,
				'tbl-1',
				'proj-456',
				{ skip: 2, take: 1 },
			);
			expect(mocks.updateDataTableRowsApi).toHaveBeenCalledWith(
				mocks.restApiContext,
				'tbl-1',
				77,
				{ input: 'hello', caseName: '' },
				'proj-456',
			);
			expect(mocks.startTestRun).toHaveBeenCalledWith('wf-123', {
				evaluationConfigId: 'cfg-1',
				compileFromConfig: true,
				rowIndices: [2],
			});
		});
	});

	// -----------------------------------------------------------------------
	// runAll
	// -----------------------------------------------------------------------

	describe('runAll', () => {
		it('dispatches startTestRun WITHOUT rowIndices', async () => {
			setupHappyPath();
			mocks.listEvaluationConfigs.mockResolvedValue([
				{ id: 'cfg-1', name: 'Evaluation: My Workflow', datasetSource: 'data_table' },
			]);
			mocks.startTestRun.mockResolvedValue({ success: true, testRunId: 'run-all-1' });

			const { runAll } = useTestCasePersistence();
			const result = await runAll();

			expect(result).toBe(true);
			expect(mocks.startTestRun).toHaveBeenCalledWith('wf-123', {
				evaluationConfigId: 'cfg-1',
				compileFromConfig: true,
			});
			// Must NOT have rowIndices at all (full dataset)
			const call = mocks.startTestRun.mock.calls[0][1] as Record<string, unknown>;
			expect(call).not.toHaveProperty('rowIndices');
		});

		it('prefers the canonical-name config over the last one', async () => {
			setupHappyPath();
			mocks.listEvaluationConfigs.mockResolvedValue([
				{ id: 'cfg-last', name: 'Old Config', datasetSource: 'data_table' },
				{ id: 'cfg-canonical', name: 'Evaluation: My Workflow', datasetSource: 'data_table' },
			]);

			const { runAll } = useTestCasePersistence();
			await runAll();

			expect(mocks.startTestRun).toHaveBeenCalledWith('wf-123', {
				evaluationConfigId: 'cfg-canonical',
				compileFromConfig: true,
			});
		});

		it('falls back to last config when no canonical config exists', async () => {
			setupHappyPath();
			mocks.listEvaluationConfigs.mockResolvedValue([
				{ id: 'cfg-a', name: 'Config A', datasetSource: 'data_table' },
				{ id: 'cfg-b', name: 'Config B', datasetSource: 'data_table' },
			]);

			const { runAll } = useTestCasePersistence();
			await runAll();

			expect(mocks.startTestRun).toHaveBeenCalledWith('wf-123', {
				evaluationConfigId: 'cfg-b',
				compileFromConfig: true,
			});
		});

		it('shows error and returns false when no config exists', async () => {
			setupHappyPath();
			mocks.listEvaluationConfigs.mockResolvedValue([]);

			const { runAll } = useTestCasePersistence();
			const result = await runAll();

			expect(result).toBe(false);
			expect(mocks.startTestRun).not.toHaveBeenCalled();
			expect(mocks.showError).toHaveBeenCalled();
		});

		it('sets activeRunId from testRunId', async () => {
			setupHappyPath();
			mocks.listEvaluationConfigs.mockResolvedValue([
				{ id: 'cfg-1', name: 'Evaluation: My Workflow', datasetSource: 'data_table' },
			]);
			mocks.startTestRun.mockResolvedValue({ success: true, testRunId: 'run-all-99' });

			const { runAll } = useTestCasePersistence();
			await runAll();

			expect(mocks.setActiveRunId).toHaveBeenCalledWith(null);
			expect(mocks.setActiveRunId).toHaveBeenCalledWith('run-all-99');
		});

		it('emits telemetry with trigger: run_all', async () => {
			setupHappyPath();
			mocks.listEvaluationConfigs.mockResolvedValue([
				{ id: 'cfg-1', name: 'Evaluation: My Workflow', datasetSource: 'data_table' },
			]);

			const { runAll } = useTestCasePersistence();
			await runAll();

			expect(mocks.track).toHaveBeenCalledWith(
				'User ran evaluation',
				expect.objectContaining({ trigger: 'run_all' }),
			);
		});
	});

	// -----------------------------------------------------------------------
	// Serialized persistence queue: ops run one at a time, none dropped
	// -----------------------------------------------------------------------

	describe('serialized persistence queue', () => {
		it('runs a run requested during an in-flight op after it, instead of dropping it', async () => {
			setupHappyPath();
			mocks.activeRowIndex = null;

			// Hang the first op at the row-count lookup so a second op arrives while
			// it's still running.
			let resolveHang!: () => void;
			mocks.getDataTableRowsApi.mockReturnValue(
				new Promise<{ data: unknown[]; count: number }>((resolve) => {
					resolveHang = () => resolve({ data: [], count: 0 });
				}),
			);
			mocks.insertDataTableRowApi.mockResolvedValue([{ id: 0 }]);

			const { persistAndRunCase, isPersisting } = useTestCasePersistence();

			const first = persistAndRunCase('initial');
			const second = persistAndRunCase('initial');
			await Promise.resolve();
			expect(isPersisting.value).toBe(true);
			// The second is queued behind the hung first — neither has dispatched.
			expect(mocks.startTestRun).not.toHaveBeenCalled();

			resolveHang();
			expect(await first).toBe(true);
			expect(await second).toBe(true);
			// Both dispatched: a click during an in-flight op isn't silently dropped.
			expect(mocks.startTestRun).toHaveBeenCalledTimes(2);
		});
	});

	// -----------------------------------------------------------------------
	// Error handling
	// -----------------------------------------------------------------------

	describe('error handling', () => {
		it('returns false and shows error when missing workflowId', async () => {
			mocks.workflowId = undefined;
			const { persistAndRunCase } = useTestCasePersistence();
			const result = await persistAndRunCase('initial');
			expect(result).toBe(false);
			expect(mocks.showError).toHaveBeenCalled();
		});

		it('returns false and shows error when buildEvaluationConfigDto fails', async () => {
			setupHappyPath();
			mocks.buildEvaluationConfigDto.mockReturnValue({ ok: false, reason: 'bad config' });
			mocks.activeRowIndex = null;
			mocks.getDataTableRowsApi.mockResolvedValue({ data: [], count: 0 });

			const { persistAndRunCase } = useTestCasePersistence();
			const result = await persistAndRunCase('initial');

			expect(result).toBe(false);
			expect(mocks.showError).toHaveBeenCalled();
			expect(mocks.insertDataTableRowApi).not.toHaveBeenCalled();
		});

		it('returns false and shows error on insert failure, does not dispatch', async () => {
			setupHappyPath();
			mocks.activeRowIndex = null;
			mocks.getDataTableRowsApi.mockResolvedValue({ data: [], count: 0 });
			mocks.insertDataTableRowApi.mockRejectedValue(new Error('insert failed'));

			const { persistAndRunCase } = useTestCasePersistence();
			const result = await persistAndRunCase('initial');

			expect(result).toBe(false);
			expect(mocks.startTestRun).not.toHaveBeenCalled();
			expect(mocks.showError).toHaveBeenCalled();
		});

		it('returns false without rollback on dispatch failure', async () => {
			setupHappyPath();
			mocks.activeRowIndex = null;
			mocks.getDataTableRowsApi.mockResolvedValue({ data: [], count: 0 });
			mocks.insertDataTableRowApi.mockResolvedValue([{ id: 0 }]);
			mocks.startTestRun.mockRejectedValue(new Error('dispatch failed'));

			const { persistAndRunCase } = useTestCasePersistence();
			const result = await persistAndRunCase('initial');

			expect(result).toBe(false);
			// Config remains intact — no rollback on dispatch failures
			expect(mocks.deleteEvaluationConfig).not.toHaveBeenCalled();
			expect(mocks.showError).toHaveBeenCalled();
		});
	});

	describe('serialized saves', () => {
		it('does not drop a save requested while another save is in flight', async () => {
			setupHappyPath();
			mocks.activeRowIndex = null;
			mocks.getDataTableRowsApi.mockResolvedValue({ data: [], count: 0 });
			mocks.insertDataTableRowApi.mockResolvedValue([{ id: 0 }]);

			// Hang the first save at the data-table lookup; release it on demand.
			let releaseFirst!: () => void;
			let calls = 0;
			mocks.fetchDataTablesApi.mockImplementation(async () => {
				calls += 1;
				if (calls === 1) {
					await new Promise<void>((resolve) => {
						releaseFirst = resolve;
					});
				}
				return {
					data: [{ id: 'tbl-1', name: 'Evaluation: My Workflow', columns: [{ name: 'input' }] }],
					count: 1,
				};
			});

			const { saveCase } = useTestCasePersistence();

			const first = saveCase({ silent: true });
			// A second edit lands while the first save is still in flight; it queues.
			const second = saveCase({ silent: true });

			// The first op runs on the queue's microtask; wait until it reaches the
			// hung table lookup before releasing it.
			await vi.waitFor(() => expect(releaseFirst).toBeInstanceOf(Function));
			releaseFirst();
			expect(await first).toBe(true);
			expect(await second).toBe(true);

			// Both saves ran — the later edit wasn't dropped by a busy guard.
			expect(mocks.insertDataTableRowApi).toHaveBeenCalledTimes(2);
		});
	});

	describe('rollback', () => {
		it('drops a column added to an existing table when the save fails', async () => {
			setupHappyPath();
			mocks.activeRowIndex = null;
			mocks.getDataTableRowsApi.mockResolvedValue({ data: [], count: 0 });
			mocks.insertDataTableRowApi.mockResolvedValue([{ id: 0 }]);
			// 'caseName' is missing from the existing table, so it gets added.
			mocks.addDataTableColumnApi.mockResolvedValue({ id: 'col-added', name: 'caseName' });
			// Config creation fails after the column + row were written → rollback.
			mocks.createEvaluationConfig.mockRejectedValue(new Error('config failed'));

			const { saveCase } = useTestCasePersistence();
			const ok = await saveCase({ silent: true });

			expect(ok).toBe(false);
			// The column added to the pre-existing table is removed again.
			expect(mocks.deleteDataTableColumnApi).toHaveBeenCalledWith(
				mocks.restApiContext,
				'tbl-1',
				'proj-456',
				'col-added',
			);
			// The inserted row is rolled back too (the table itself pre-existed).
			expect(mocks.deleteDataTableRowsApi).toHaveBeenCalled();
		});
	});

	describe('deleteCase', () => {
		it('deletes the row and emits telemetry', async () => {
			mocks.listEvaluationConfigs.mockResolvedValue([
				{
					id: 'cfg-1',
					name: 'Evaluation: My Workflow',
					datasetSource: 'data_table',
					datasetRef: { dataTableId: 'tbl-1' },
				},
			]);
			mocks.activeRowIndex = 2;
			mocks.activeRowId = 5;
			mocks.deleteDataTableRowsApi.mockResolvedValue(true);

			const { deleteCase } = useTestCasePersistence();
			const result = await deleteCase();

			expect(result).toBe(true);
			expect(mocks.deleteDataTableRowsApi).toHaveBeenCalledWith(
				mocks.restApiContext,
				'tbl-1',
				[5],
				'proj-456',
			);
			expect(mocks.track).toHaveBeenCalledWith('User deleted evaluation test case', {
				workflow_id: 'wf-123',
				row_index: 2,
			});
		});
	});
});
