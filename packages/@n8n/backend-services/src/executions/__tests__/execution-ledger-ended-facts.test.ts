import type { CanceledExecution, CrashedExecution } from '@n8n/db';
import type {
	ExecutionBlockedReason,
	ExecutionStatus,
	FailedBeforeStartMarker,
	IRun,
	IRunData,
	IWorkflowBase,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import {
	toEndedFactsFromCancel,
	toEndedFactsFromCrash,
	toEndedFactsFromRun,
} from '../execution-ledger-ended-facts';

const startedAt = new Date('2026-01-01T10:00:00.000Z');
const stoppedAt = new Date('2026-01-01T10:00:05.000Z');
const now = new Date('2026-01-01T12:00:00.000Z');

const makeWorkflow = (overrides: Partial<IWorkflowBase> = {}): IWorkflowBase => ({
	id: 'workflow-1',
	name: 'My Workflow',
	active: false,
	isArchived: false,
	activeVersionId: null,
	createdAt: startedAt,
	updatedAt: startedAt,
	nodes: [],
	connections: {},
	...overrides,
});

const makeRun = (overrides: Partial<IRun> = {}, runData: IRunData = {}): IRun => ({
	data: createRunExecutionData({ resultData: { runData } }),
	mode: 'trigger',
	startedAt,
	stoppedAt,
	storedAt: 'db',
	status: 'success',
	...overrides,
});

describe('toEndedFactsFromRun', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test.each<ExecutionStatus>(['running', 'waiting', 'new'])(
		'returns undefined for the non-terminal status %s',
		(status) => {
			const facts = toEndedFactsFromRun({
				executionId: 'execution-1',
				workflow: makeWorkflow(),
				run: makeRun({ status }),
			});

			expect(facts).toBeUndefined();
		},
	);

	test('returns undefined for a workflow with an empty id', () => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow({ id: '' }),
			run: makeRun(),
		});

		expect(facts).toBeUndefined();
	});

	test.each<'success' | 'error' | 'crashed' | 'canceled'>([
		'success',
		'error',
		'crashed',
		'canceled',
	])('maps the %s status to the same outcome', (status) => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow(),
			run: makeRun({ status }),
		});

		expect(facts?.outcome).toBe(status);
	});

	test('passes the identifiers, name, mode and source through', () => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow({ id: 'workflow-9', name: 'Order Sync' }),
			run: makeRun({ mode: 'webhook' }),
			source: 'instance_ai',
		});

		expect(facts).toMatchObject({
			executionId: 'execution-1',
			workflowId: 'workflow-9',
			workflowName: 'Order Sync',
			mode: 'webhook',
			source: 'instance_ai',
		});
	});

	test('leaves the source unset when none is given', () => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow(),
			run: makeRun(),
		});

		expect(facts?.source).toBeUndefined();
	});

	test('uses the stop time as the occurrence time and the time between start and stop as runtime', () => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow(),
			run: makeRun(),
		});

		expect(facts?.occurredAt).toBe(stoppedAt);
		expect(facts?.runtimeMs).toBe(5000);
	});

	test('uses the current time and a runtime of 0 when the run has no stop time', () => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow(),
			run: makeRun({ stoppedAt: undefined }),
		});

		expect(facts?.occurredAt).toEqual(now);
		expect(facts?.runtimeMs).toBe(0);
	});

	test('records the fixed time saved for a successful run', () => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow({ settings: { timeSavedPerExecution: 12 } }),
			run: makeRun({ status: 'success' }),
		});

		expect(facts?.timeSavedMin).toBe(12);
	});

	test('records the node time saved for a successful run in dynamic mode', () => {
		const runData = {
			'Track Time Saved': [{ metadata: { timeSaved: { minutes: 7 } } }],
		} as unknown as IRunData;

		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow({ settings: { timeSavedMode: 'dynamic' } }),
			run: makeRun({ status: 'success' }, runData),
		});

		expect(facts?.timeSavedMin).toBe(7);
	});

	test.each<ExecutionStatus>(['error', 'crashed', 'canceled'])(
		'records no time saved for a run with the status %s',
		(status) => {
			const facts = toEndedFactsFromRun({
				executionId: 'execution-1',
				workflow: makeWorkflow({ settings: { timeSavedPerExecution: 12 } }),
				run: makeRun({ status }),
			});

			expect(facts?.timeSavedMin).toBe(0);
		},
	);

	test.each<WorkflowExecuteMode>(['manual', 'error'])(
		'records no time saved for a successful %s run',
		(mode) => {
			const facts = toEndedFactsFromRun({
				executionId: 'execution-1',
				workflow: makeWorkflow({ settings: { timeSavedPerExecution: 12 } }),
				run: makeRun({ status: 'success', mode }),
			});

			expect(facts?.timeSavedMin).toBe(0);
		},
	);
});

describe('toEndedFactsFromRun for a run that failed before its first node', () => {
	const makeFailedBeforeStart = (
		failedBeforeStart: FailedBeforeStartMarker,
		status: 'error' | 'crashed' = 'error',
	) =>
		makeRun({
			status,
			data: createRunExecutionData({ resultData: { runData: {}, failedBeforeStart } }),
		});

	test.each<ExecutionBlockedReason>([
		'policy',
		'credentialAccess',
		'invalidWorkflow',
		'contextHook',
		'startFailed',
	])('records a blocked outcome with the reason %s', (reason) => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow(),
			run: makeFailedBeforeStart(reason),
		});

		expect(facts).toMatchObject({ outcome: 'blocked', blockedBy: reason });
	});

	test('maps the marker true to the reason startFailed', () => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow(),
			run: makeFailedBeforeStart(true),
		});

		expect(facts).toMatchObject({ outcome: 'blocked', blockedBy: 'startFailed' });
	});

	test('records a blocked outcome for a crashed run with the marker', () => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow(),
			run: makeFailedBeforeStart('policy', 'crashed'),
		});

		expect(facts).toMatchObject({ outcome: 'blocked', blockedBy: 'policy' });
	});

	test('records no runtime and no time saved for a blocked run', () => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow({ settings: { timeSavedPerExecution: 12 } }),
			run: makeFailedBeforeStart('policy'),
		});

		expect(facts).not.toHaveProperty('runtimeMs');
		expect(facts).not.toHaveProperty('timeSavedMin');
	});

	test('keeps the identifiers and the stop time on a blocked run', () => {
		const facts = toEndedFactsFromRun({
			executionId: 'execution-1',
			workflow: makeWorkflow({ id: 'workflow-9', name: 'Order Sync' }),
			run: makeFailedBeforeStart('policy'),
			source: 'user',
		});

		expect(facts).toMatchObject({
			executionId: 'execution-1',
			workflowId: 'workflow-9',
			workflowName: 'Order Sync',
			source: 'user',
			occurredAt: stoppedAt,
		});
	});
});

describe('toEndedFactsFromCrash', () => {
	const makeCrashed = (overrides: Partial<CrashedExecution> = {}): CrashedExecution => ({
		id: 'execution-1',
		workflowId: 'workflow-1',
		workflowName: 'My Workflow',
		mode: 'trigger',
		startedAt,
		stoppedAt,
		...overrides,
	});

	test('records the crashed outcome with no time saved', () => {
		const facts = toEndedFactsFromCrash(makeCrashed());

		expect(facts.outcome).toBe('crashed');
		expect(facts.timeSavedMin).toBe(0);
	});

	test('passes the identifiers, name and mode through', () => {
		const facts = toEndedFactsFromCrash(
			makeCrashed({
				id: 'execution-7',
				workflowId: 'workflow-3',
				workflowName: 'Sync',
				mode: 'cli',
			}),
		);

		expect(facts).toMatchObject({
			executionId: 'execution-7',
			workflowId: 'workflow-3',
			workflowName: 'Sync',
			mode: 'cli',
		});
	});

	test('uses the stop time as the occurrence time and the time since start as runtime', () => {
		const facts = toEndedFactsFromCrash(makeCrashed());

		expect(facts.occurredAt).toBe(stoppedAt);
		expect(facts.runtimeMs).toBe(5000);
	});

	test('records a blocked outcome with the reason startFailed when the execution never started', () => {
		const facts = toEndedFactsFromCrash(makeCrashed({ startedAt: null }));

		expect(facts).toMatchObject({ outcome: 'blocked', blockedBy: 'startFailed' });
	});

	test('records no runtime and no time saved when the execution never started', () => {
		const facts = toEndedFactsFromCrash(makeCrashed({ startedAt: null }));

		expect(facts).not.toHaveProperty('runtimeMs');
		expect(facts).not.toHaveProperty('timeSavedMin');
	});

	test('passes the project id through', () => {
		const facts = toEndedFactsFromCrash(
			makeCrashed({ project: { id: 'project-4', customTelemetryTags: [] } }),
		);

		expect(facts.projectId).toBe('project-4');
	});

	test('leaves the project id unset when the execution has no project', () => {
		const facts = toEndedFactsFromCrash(makeCrashed({ project: undefined }));

		expect(facts.projectId).toBeUndefined();
	});

	test('uses an empty workflow name when the name is missing', () => {
		const facts = toEndedFactsFromCrash(makeCrashed({ workflowName: undefined }));

		expect(facts.workflowName).toBe('');
	});
});

describe('toEndedFactsFromCancel', () => {
	const canceled = {
		id: 'execution-1',
		workflowId: 'workflow-1',
		workflowName: 'My Workflow',
		mode: 'trigger',
		startedAt,
		stoppedAt,
	} satisfies CanceledExecution;

	test('records the canceled outcome with the runtime and no time saved', () => {
		expect(toEndedFactsFromCancel(canceled)).toEqual({
			executionId: 'execution-1',
			workflowId: 'workflow-1',
			workflowName: 'My Workflow',
			mode: 'trigger',
			occurredAt: stoppedAt,
			outcome: 'canceled',
			runtimeMs: 5000,
			timeSavedMin: 0,
		});
	});

	test('records a runtime of 0 when a queued run is canceled before it started', () => {
		expect(toEndedFactsFromCancel({ ...canceled, startedAt: null }).runtimeMs).toBe(0);
	});
});
