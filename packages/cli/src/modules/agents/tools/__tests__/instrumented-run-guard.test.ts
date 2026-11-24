import { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { WorkflowExecuteMode } from 'n8n-workflow';

import { runsOnQueueWorker } from '@/workflow-runner';

import { instrumentedRunGap } from '../instrumented-run-guard';

const QUEUE_GAP =
	'This workflow would run on a queue worker, which test runs and evaluations cannot reach.';
const V2_GAP = 'Test runs and evaluations do not support Engine v2 workflows yet.';

/**
 * `runsOnQueueWorker` is the queue decision of `WorkflowRunner.run`, and the guard asks it too.
 * This matrix pins it for both callers, so the guard cannot let a run through to a worker.
 */
describe('instrumented run routing', () => {
	const offloadBefore = process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS;

	function setUp(mode: 'regular' | 'queue', offload: boolean) {
		Container.set(ExecutionsConfig, { mode } as ExecutionsConfig);
		if (offload) process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = 'true';
		else delete process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS;
	}

	afterEach(() => {
		Container.reset();
		if (offloadBefore === undefined) delete process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS;
		else process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = offloadBefore;
	});

	it.each<[mode: 'regular' | 'queue', offload: boolean, WorkflowExecuteMode, onWorker: boolean]>([
		['regular', false, 'manual', false],
		['regular', false, 'integrated', false],
		['regular', true, 'manual', false],
		['regular', true, 'integrated', false],
		['queue', false, 'manual', false],
		['queue', false, 'integrated', true],
		['queue', true, 'manual', true],
		['queue', true, 'integrated', true],
	])('%s mode, offload %s, %s run: on a worker = %s', (mode, offload, executionMode, onWorker) => {
		setUp(mode, offload);

		expect(runsOnQueueWorker({ mode }, executionMode)).toBe(onWorker);
		expect(instrumentedRunGap({ settings: {} }, executionMode)).toBe(
			onWorker ? QUEUE_GAP : undefined,
		);
	});

	it.each<WorkflowExecuteMode>(['manual', 'integrated'])(
		'refuses an Engine v2 workflow in a %s run, whichever process would run it',
		(executionMode) => {
			setUp('regular', false);

			expect(instrumentedRunGap({ settings: { engineType: 'v2' } }, executionMode)).toBe(V2_GAP);
		},
	);
});
