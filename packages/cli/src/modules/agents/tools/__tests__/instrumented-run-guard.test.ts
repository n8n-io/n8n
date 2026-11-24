import { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';

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
	function setUp(mode: 'regular' | 'queue') {
		Container.set(ExecutionsConfig, { mode } as ExecutionsConfig);
	}

	afterEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	it.each<[mode: 'regular' | 'queue', offload: string | undefined, onWorker: boolean]>([
		['regular', undefined, false],
		['regular', 'true', false],
		['queue', undefined, true],
		['queue', 'false', true],
		['queue', 'true', true],
	])('%s mode, legacy offload flag %s: on a worker = %s', (mode, offload, onWorker) => {
		setUp(mode);
		vi.stubEnv('OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS', offload);

		expect(runsOnQueueWorker({ mode })).toBe(onWorker);
		expect(instrumentedRunGap({ settings: {} })).toBe(onWorker ? QUEUE_GAP : undefined);
	});

	it.each(['regular', 'queue'] as const)('refuses an Engine v2 workflow in %s mode', (mode) => {
		setUp(mode);

		expect(instrumentedRunGap({ settings: { engineType: 'v2' } })).toBe(V2_GAP);
	});
});
