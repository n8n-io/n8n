import { describe, expect, it, vi } from 'vitest';

import type { ErrorWorkflowStarter, ExecutionStore } from '../../execution';
import { PendingErrorWorkflowDetector } from '../pending-error-workflow-detector';
import { PendingErrorWorkflowRepair } from '../pending-error-workflow-repair';

const dueAt = new Date('2026-11-23T10:01:00.000Z');

describe('PendingErrorWorkflowDetector', () => {
	it('reports each execution whose marker time has passed', async () => {
		const executionStore = {
			findDueErrorWorkflows: vi.fn().mockResolvedValue([{ id: 'failed-exec', dueAt }]),
		} as unknown as ExecutionStore;
		const detector = new PendingErrorWorkflowDetector(executionStore, 1_000, 10);
		const at = new Date('2026-11-23T10:02:00.000Z');

		expect(await detector.detect(at)).toEqual([
			{ kind: 'execution-error-workflow-pending', executionId: 'failed-exec', dueAt },
		]);
		expect(executionStore.findDueErrorWorkflows).toHaveBeenCalledWith(at, 10);
	});
});

describe('PendingErrorWorkflowRepair', () => {
	const finding = {
		kind: 'execution-error-workflow-pending' as const,
		executionId: 'failed-exec',
		dueAt,
	};

	function setup(claimed: boolean) {
		const executionStore = {
			deferErrorWorkflow: vi.fn().mockResolvedValue(claimed),
		} as unknown as ExecutionStore;
		const starter = {
			start: vi.fn().mockResolvedValue('started'),
		} as unknown as ErrorWorkflowStarter;
		return {
			repair: new PendingErrorWorkflowRepair(executionStore, starter),
			executionStore,
			starter,
		};
	}

	it('claims the execution, then starts its error execution', async () => {
		const { repair, executionStore, starter } = setup(true);

		expect(await repair.apply(finding)).toBe(true);

		expect(executionStore.deferErrorWorkflow).toHaveBeenCalledWith('failed-exec', dueAt);
		expect(starter.start).toHaveBeenCalledWith('failed-exec');
	});

	it('does nothing when another sweeper claimed the execution first', async () => {
		const { repair, starter } = setup(false);

		expect(await repair.apply(finding)).toBe(false);

		expect(starter.start).not.toHaveBeenCalled();
	});
});
