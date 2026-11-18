import { BUSY_WORKFLOW } from '../aquarium.constants';
import type { AquariumEntity, EntityKind } from '../aquarium.types';
import { DEMO_ENTITIES } from '../sources/demo.source';
import { emptyMetrics } from '../sources/source.utils';
import { busyWorkflowKeys } from './busy';

const run = (
	key: string,
	executionCount: number,
	kind: EntityKind = 'workflow',
): AquariumEntity => ({
	key,
	id: key,
	kind,
	name: key,
	metrics: { ...emptyMetrics(), executionCount },
});

describe('busyWorkflowKeys', () => {
	it('picks only the busiest share', () => {
		const entities = Array.from({ length: 100 }, (_, i) => run(`w${i}`, (i + 1) * 100));

		// 100 to 10,000 runs. The busiest 2% have 9,900 and 10,000 runs.
		expect([...busyWorkflowKeys(entities)].sort()).toEqual(['w98', 'w99']);
	});

	it('finds nothing busy when no workflow has enough runs', () => {
		const quiet = Array.from({ length: 10 }, (_, i) => run(`w${i}`, i));
		expect(busyWorkflowKeys(quiet).size).toBe(0);
	});

	it('allows one busy workflow in a small tank', () => {
		const keys = busyWorkflowKeys([
			run('busy', BUSY_WORKFLOW.minExecutions),
			run('quiet', BUSY_WORKFLOW.minExecutions - 1),
		]);
		expect([...keys]).toEqual(['busy']);
	});

	it('ignores agents', () => {
		expect(busyWorkflowKeys([run('agent', 50_000, 'agent')]).size).toBe(0);
	});

	it('finds a busy workflow in the demo data', () => {
		expect(busyWorkflowKeys(DEMO_ENTITIES).size).toBeGreaterThan(0);
	});
});
