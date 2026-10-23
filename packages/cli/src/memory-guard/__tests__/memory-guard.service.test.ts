import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { ExecutionRepository } from '@n8n/db';
import type {
	IRun,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { MemoryPressureExecutionCancelledError } from 'n8n-workflow';
import type PCancelable from 'p-cancelable';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import type { IExecutingWorkflowData } from '@/interfaces';
import type { License } from '@/license';
import type { Telemetry } from '@/telemetry';

import { HOLD_LIMIT_MS } from '../memory-guard.constants';
import { MemoryGuardService } from '../memory-guard.service';
import { readMemoryUsage } from '../memory-usage';
import { ProductionHold } from '../production-hold';
import type { RunDataEstimate, RunDataTracker } from '../run-data-tracker';
import { MemoryStoppedExecutions } from '../memory-stopped-executions';

vi.mock('../memory-usage', () => ({
	getContainerLimit: () => 1_000,
	readMemoryUsage: vi.fn(),
}));

const MB = 1024 * 1024;

describe('MemoryGuardService', () => {
	let utilization = 0.5;
	vi.mocked(readMemoryUsage).mockImplementation(() => ({
		utilization,
		usedBytes: utilization * 1_000 * MB,
		limitBytes: 1_000 * MB,
	}));

	const globalConfig = mockInstance(GlobalConfig, {
		executions: { mode: 'regular', concurrency: { productionLimit: -1, evaluationLimit: -1 } },
	});
	const activeExecutions = mock<ActiveExecutions>();
	const tracker = mock<RunDataTracker>();
	const logger = mock<Logger>();
	const guardLogger = mock<Logger>();
	logger.scoped.mockReturnValue(guardLogger);

	let productionHold: ProductionHold;
	let concurrencyControl: ConcurrencyControlService;
	let memoryStoppedExecutions: MemoryStoppedExecutions;
	let guard: MemoryGuardService;

	const executions = new Map<string, IExecutingWorkflowData>();
	const estimates = new Map<string, RunDataEstimate>();

	const workflow = (id: string): IWorkflowBase =>
		mock<IWorkflowBase>({
			id,
			nodes: [
				{ name: 'Fetch', type: 'n8n-nodes-base.httpRequest' },
				{ name: 'Big', type: 'n8n-nodes-base.code' },
			],
		});

	const addExecution = (
		id: string,
		{
			mode = 'webhook',
			megabytes = 0,
			parentId,
			engine = Promise.resolve(mock<IRun>()),
			workflowId = `workflow-${id}`,
		}: {
			mode?: WorkflowExecuteMode;
			megabytes?: number;
			parentId?: string;
			/** `null` for an execution whose engine is not attached yet. */
			engine?: Promise<IRun> | null;
			workflowId?: string;
		} = {},
	) => {
		executions.set(id, {
			status: 'running',
			startedAt: new Date(),
			postExecutePromise: mock(),
			workflowExecution: (engine ?? undefined) as PCancelable<IRun> | undefined,
			executionData: mock<IWorkflowExecutionDataProcess>({
				executionMode: mode,
				workflowData: workflow(workflowId),
				executionData: {
					parentExecution: parentId ? { executionId: parentId, workflowId: 'parent' } : undefined,
				},
			}),
		} as IExecutingWorkflowData);
		if (megabytes > 0) {
			estimates.set(id, {
				totalBytes: megabytes * MB,
				bytesByNode: new Map([['Big', megabytes * MB]]),
				runningNode: 'Fetch',
			});
		}
	};

	const sample = async (times = 1) => {
		for (let i = 0; i < times; i++) await vi.advanceTimersToNextTimerAsync();
	};

	/** Resolves with whether the throttled execution was let through. */
	const isAdmitted = async (promise: Promise<void>) => {
		let admitted = false;
		void promise.then(() => {
			admitted = true;
		});
		await vi.advanceTimersByTimeAsync(0);
		return admitted;
	};

	const stoppedIds = () => activeExecutions.stopExecution.mock.calls.map(([id]) => id);

	const stopLogs = () =>
		guardLogger.warn.mock.calls
			.map(([message]) => message)
			.filter((message) => message.startsWith('Stopped execution'));

	beforeEach(() => {
		vi.useFakeTimers();
		utilization = 0.5;
		executions.clear();
		estimates.clear();

		activeExecutions.getActiveExecutions.mockImplementation(() =>
			[...executions].map(([id, e]) => ({
				id,
				status: e.status,
				mode: e.executionData.executionMode,
				workflowId: e.executionData.workflowData.id,
				startedAt: e.startedAt,
			})),
		);
		activeExecutions.getExecutionOrFail.mockImplementation((id) => executions.get(id)!);
		activeExecutions.has.mockImplementation((id) => executions.has(id));
		activeExecutions.stopExecution.mockImplementation((id) => {
			executions.delete(id);
		});
		tracker.getEstimate.mockImplementation((id) => estimates.get(id));

		productionHold = new ProductionHold();
		concurrencyControl = new ConcurrencyControlService(
			mockLogger(),
			mock<ExecutionRepository>(),
			mock<Telemetry>(),
			mock<EventService>(),
			globalConfig,
			mock<License>(),
			productionHold,
		);
		memoryStoppedExecutions = new MemoryStoppedExecutions();
		guard = new MemoryGuardService(
			logger,
			activeExecutions,
			productionHold,
			tracker,
			memoryStoppedExecutions,
		);
		guard.init();
	});

	afterEach(() => {
		guard.shutdown();
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe('hold', () => {
		it('should hold new production executions after two samples at the hold level', async () => {
			utilization = 0.82;
			await sample();
			const afterOneSample = concurrencyControl.throttle({ mode: 'webhook', executionId: '1' });
			expect(await isAdmitted(afterOneSample)).toBe(true);

			await sample();
			const afterTwoSamples = concurrencyControl.throttle({ mode: 'webhook', executionId: '2' });

			expect(await isAdmitted(afterTwoSamples)).toBe(false);
			expect(guardLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('holding new production executions'),
			);
		});

		it('should sample fast for a while after the hold ends', async () => {
			utilization = 0.82;
			await sample(2);
			utilization = 0.5;
			await sample();

			utilization = 0.82;
			await vi.advanceTimersByTimeAsync(500);
			const arrival = concurrencyControl.throttle({ mode: 'webhook', executionId: 'arrival' });

			expect(await isAdmitted(arrival)).toBe(false);
		});

		it('should hold at once at the critical level', async () => {
			utilization = 0.96;
			await sample();

			const throttled = concurrencyControl.throttle({ mode: 'webhook', executionId: '1' });

			expect(await isAdmitted(throttled)).toBe(false);
		});

		it('should let one held execution start when nothing runs', async () => {
			utilization = 0.82;
			await sample(2);
			const first = concurrencyControl.throttle({ mode: 'webhook', executionId: '1' });
			const second = concurrencyControl.throttle({ mode: 'webhook', executionId: '2' });

			await sample();

			expect(await isAdmitted(first)).toBe(true);
			expect(await isAdmitted(second)).toBe(false);
		});

		it('should wait before it lets another held execution start while nothing shows as running', async () => {
			utilization = 0.82;
			await sample(2);
			const first = concurrencyControl.throttle({ mode: 'webhook', executionId: '1' });
			const second = concurrencyControl.throttle({ mode: 'webhook', executionId: '2' });
			await sample();
			expect(await isAdmitted(first)).toBe(true);

			await sample();
			expect(await isAdmitted(second)).toBe(false);

			await vi.advanceTimersByTimeAsync(1_000);
			expect(await isAdmitted(second)).toBe(true);
		});

		it('should end the hold below the resume level and let held executions start in growing batches', async () => {
			addExecution('running', { mode: 'manual' });
			utilization = 0.82;
			await sample(2);
			const held = ['1', '2', '3', '4'].map(
				async (executionId) => await concurrencyControl.throttle({ mode: 'webhook', executionId }),
			);
			await vi.advanceTimersByTimeAsync(0);

			utilization = 0.78;
			await sample();
			expect(productionHold.heldCount).toBe(4);

			utilization = 0.7;
			await sample();
			expect(productionHold.heldCount).toBe(3);
			expect(guardLogger.info).toHaveBeenCalledWith(
				expect.stringContaining('held executions now start in batches'),
			);

			await sample();
			expect(productionHold.heldCount).toBe(3);

			await vi.advanceTimersByTimeAsync(1_000);
			expect(productionHold.heldCount).toBe(1);

			await vi.advanceTimersByTimeAsync(1_000);
			expect(productionHold.heldCount).toBe(0);
			await Promise.all(held);
		});

		it('should not grow the next batch of held executions when memory rose', async () => {
			addExecution('running', { mode: 'manual' });
			utilization = 0.82;
			await sample(2);
			const held = ['1', '2', '3', '4'].map(
				async (executionId) => await concurrencyControl.throttle({ mode: 'webhook', executionId }),
			);
			await vi.advanceTimersByTimeAsync(0);

			utilization = 0.6;
			await sample();
			expect(productionHold.heldCount).toBe(3);

			utilization = 0.7;
			await vi.advanceTimersByTimeAsync(1_000);
			expect(productionHold.heldCount).toBe(2);

			utilization = 0.7;
			await vi.advanceTimersByTimeAsync(1_000);
			expect(productionHold.heldCount).toBe(0);
			await Promise.all(held);
		});
	});

	describe('stop', () => {
		it('should stop the execution with the most run data after two samples at the stop level', async () => {
			addExecution('small', { megabytes: 10 });
			addExecution('large', { megabytes: 300 });
			utilization = 0.87;

			await sample();
			expect(activeExecutions.stopExecution).not.toHaveBeenCalled();

			await sample();
			expect(stoppedIds()).toEqual(['large']);
			expect(activeExecutions.stopExecution).toHaveBeenCalledWith(
				'large',
				expect.any(MemoryPressureExecutionCancelledError),
			);
		});

		it('should stop at once at the critical level', async () => {
			addExecution('large', { megabytes: 300 });
			utilization = 0.96;

			await sample();

			expect(stoppedIds()).toEqual(['large']);
		});

		it('should record an error that names the running node and the node with the most data', async () => {
			addExecution('large', { megabytes: 300 });
			const engine = executions.get('large')!.workflowExecution;
			utilization = 0.96;
			let recorded: IRun | undefined;
			memoryStoppedExecutions.enabled = true;
			activeExecutions.stopExecution.mockImplementation((id) => {
				// The cancel save runs while the execution is still marked as stopped.
				const run = mock<IRun>({ status: 'canceled', data: { resultData: { runData: {} } } });
				memoryStoppedExecutions.onWorkflowExecuteAfter(id, run);
				recorded = run;
			});

			await sample();

			expect(recorded?.status).toBe('error');
			expect(recorded?.data.resultData.lastNodeExecuted).toBe('Fetch');
			expect(recorded?.data.resultData.error?.message).toBe(
				'Execution stopped because the instance was running out of memory. Running node: "Fetch". Node holding the most data: "Big" (about 300MB).',
			);
			await engine;
		});

		it('should size and stop a parent and its sub-workflows together, parent first', async () => {
			addExecution('parent', { megabytes: 100 });
			addExecution('child', { megabytes: 100, parentId: 'parent', mode: 'integrated' });
			addExecution('other', { megabytes: 150 });
			utilization = 0.96;

			await sample();

			expect(stoppedIds()).toEqual(['parent', 'child']);
		});

		it('should not stop a finishing execution or one without an engine', async () => {
			addExecution('finishing', { megabytes: 300 });
			addExecution('starting', { megabytes: 200, engine: null });
			addExecution('running', { megabytes: 10 });
			memoryStoppedExecutions.enabled = true;
			memoryStoppedExecutions.onWorkflowExecuteAfter('finishing', mock<IRun>());
			utilization = 0.96;

			await sample();

			expect(stoppedIds()).toEqual(['running']);
		});

		it('should not stop an execution without estimated run data', async () => {
			addExecution('fetching');
			utilization = 0.96;

			await sample();

			expect(activeExecutions.stopExecution).not.toHaveBeenCalled();
		});

		it('should let no held execution start while the stopped engine still runs', async () => {
			addExecution('large', { megabytes: 300, engine: new Promise<IRun>(() => {}) });
			utilization = 0.96;
			await sample();
			expect(stoppedIds()).toEqual(['large']);

			const held = concurrencyControl.throttle({ mode: 'webhook', executionId: 'held' });
			await sample();

			expect(await isAdmitted(held)).toBe(false);
		});

		it('should stop the largest execution when a held execution waits too long', async () => {
			addExecution('large', { megabytes: 300 });
			utilization = 0.82;
			await sample(2);
			void concurrencyControl.throttle({ mode: 'webhook', executionId: 'held' });

			await vi.advanceTimersByTimeAsync(HOLD_LIMIT_MS - 100);
			expect(activeExecutions.stopExecution).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(400);
			expect(stoppedIds()).toEqual(['large']);
		});

		it('should wait the hold limit again after a stop before it stops another execution', async () => {
			addExecution('first', { megabytes: 60 });
			addExecution('second', { megabytes: 50 });
			activeExecutions.stopExecution.mockImplementation((id) => {
				executions.delete(id);
				utilization = 0.78;
			});
			utilization = 0.82;
			await sample(2);
			void concurrencyControl.throttle({ mode: 'webhook', executionId: 'held' });

			await vi.advanceTimersByTimeAsync(HOLD_LIMIT_MS + 300);
			expect(stoppedIds()).toEqual(['first']);

			await vi.advanceTimersByTimeAsync(HOLD_LIMIT_MS - 1_000);
			expect(stoppedIds()).toEqual(['first']);

			await vi.advanceTimersByTimeAsync(1_500);
			expect(stoppedIds()).toEqual(['first', 'second']);
		});

		it('should keep stopping at the stop level when a stop below it frees no memory', async () => {
			addExecution('first', { megabytes: 300 });
			addExecution('second', { megabytes: 200 });
			utilization = 0.82;
			await sample(2);
			void concurrencyControl.throttle({ mode: 'webhook', executionId: 'held' });
			utilization = 0.78;

			await vi.advanceTimersByTimeAsync(HOLD_LIMIT_MS + 300);
			await vi.advanceTimersByTimeAsync(3_000);
			expect(stoppedIds()).toEqual(['first']);
			expect(guardLogger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('freed less memory than expected'),
			);

			utilization = 0.9;
			await sample(2);
			expect(stoppedIds()).toEqual(['first', 'second']);
		});

		it.each([0.82, 0.9, 0.96])(
			'should stop holding at %s until memory falls when a held execution waits too long and nothing can be stopped',
			async (level) => {
				addExecution('fetching');
				utilization = level;
				await sample(2);
				const held = concurrencyControl.throttle({ mode: 'webhook', executionId: 'held' });

				await vi.advanceTimersByTimeAsync(HOLD_LIMIT_MS + 300);
				expect(await isAdmitted(held)).toBe(true);
				expect(activeExecutions.stopExecution).not.toHaveBeenCalled();

				const arrival = concurrencyControl.throttle({ mode: 'webhook', executionId: 'arrival' });
				await sample(2);
				expect(await isAdmitted(arrival)).toBe(true);

				utilization = 0.7;
				await sample();
				utilization = 0.82;
				await sample(2);
				const later = concurrencyControl.throttle({ mode: 'webhook', executionId: 'later' });
				expect(await isAdmitted(later)).toBe(false);
			},
		);

		it('should still stop a growing execution while the hold is suspended', async () => {
			addExecution('fetching');
			utilization = 0.82;
			await sample(2);
			void concurrencyControl.throttle({ mode: 'webhook', executionId: 'held' });
			await vi.advanceTimersByTimeAsync(HOLD_LIMIT_MS + 300);

			estimates.set('fetching', {
				totalBytes: 300 * MB,
				bytesByNode: new Map([['Big', 300 * MB]]),
				runningNode: 'Fetch',
			});
			utilization = 0.96;
			await sample();

			expect(stoppedIds()).toEqual(['fetching']);
		});

		it('should not stop at the stop level when memory falls after a garbage collection', async () => {
			addExecution('large', { megabytes: 300 });
			utilization = 0.9;
			readMemoryUsageOnce(0.9);
			readMemoryUsageOnce(0.9);
			readMemoryUsageOnce(0.8);

			await sample(2);
			expect(activeExecutions.stopExecution).not.toHaveBeenCalled();

			await sample(2);
			expect(stoppedIds()).toEqual(['large']);
		});

		it('should not collect garbage at the stop level when no execution can be stopped', async () => {
			utilization = 0.9;
			vi.mocked(readMemoryUsage).mockClear();

			await sample(4);

			expect(readMemoryUsage).toHaveBeenCalledTimes(4);
		});

		it('should wait for the stopped engine before it measures memory', async () => {
			let endEngine!: () => void;
			const engine = new Promise<IRun>((resolve) => {
				endEngine = () => resolve(mock<IRun>());
			});
			addExecution('large', { megabytes: 300, engine });
			utilization = 0.96;
			await sample();

			utilization = 0.5;
			await vi.advanceTimersByTimeAsync(1_000);
			expect(stopLogs()).toHaveLength(0);

			endEngine();
			await vi.advanceTimersByTimeAsync(0);
			expect(stopLogs()).toHaveLength(1);
		});

		it('should log the stop with the memory before and after it', async () => {
			addExecution('large', { megabytes: 300 });
			utilization = 0.96;
			readMemoryUsageOnce(0.96);
			readMemoryUsageOnce(0.95);
			readMemoryUsageOnce(0.6);

			await sample();

			expect(stopLogs()).toEqual([
				'Stopped execution large of workflow workflow-large at 950MB of 1000MB (critical). It held an estimated 300MB of run data. Memory after the stop: 600MB',
			]);
			expect(guardLogger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('freed less memory than expected'),
			);
		});

		it('should not count memory that a garbage collection frees before the stop', async () => {
			addExecution('large', { megabytes: 200 });
			utilization = 0.99;
			readMemoryUsageOnce(0.99);
			readMemoryUsageOnce(0.9);
			readMemoryUsageOnce(0.88);

			await sample();
			utilization = 0.88;
			await vi.advanceTimersByTimeAsync(3_000);

			expect(stoppedIds()).toEqual(['large']);
			expect(guardLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('freed less memory than expected'),
			);
		});

		it('should measure memory again while the stopped execution saves its result', async () => {
			addExecution('large', { megabytes: 300 });
			utilization = 0.6;
			readMemoryUsageOnce(0.96);
			readMemoryUsageOnce(0.96);

			await sample();
			await vi.advanceTimersByTimeAsync(1_000);

			expect(stopLogs()).toEqual([expect.stringContaining('Memory after the stop: 600MB')]);
			expect(guardLogger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('freed less memory than expected'),
			);
		});

		it('should count a stop as freeing memory when memory drops by half its estimate', async () => {
			addExecution('small', { megabytes: 20 });
			utilization = 0.96;
			readMemoryUsageOnce(0.96);
			readMemoryUsageOnce(0.96);
			readMemoryUsageOnce(0.95);

			await sample();
			await vi.advanceTimersByTimeAsync(3_000);

			expect(stopLogs()).toEqual([expect.stringContaining('Memory after the stop: 950MB')]);
			expect(guardLogger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('freed less memory than expected'),
			);
		});

		it('should keep holding and stop only at the critical level after a stop frees no memory', async () => {
			addExecution('first', { megabytes: 300 });
			addExecution('second', { megabytes: 200 });
			addExecution('third', { megabytes: 100 });
			utilization = 0.96;
			await sample();
			utilization = 0.9;
			await vi.advanceTimersByTimeAsync(3_000);
			expect(stoppedIds()).toEqual(['first']);
			expect(guardLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('freed less memory than expected'),
			);

			const arrival = concurrencyControl.throttle({ mode: 'webhook', executionId: 'arrival' });
			await sample(3);
			expect(stoppedIds()).toEqual(['first']);
			expect(await isAdmitted(arrival)).toBe(false);

			utilization = 0.96;
			await sample();
			expect(stoppedIds()).toEqual(['first', 'second']);
		});

		it('should act normally again when memory falls after a stop that freed no memory', async () => {
			addExecution('first', { megabytes: 300 });
			addExecution('second', { megabytes: 200 });
			utilization = 0.96;
			await sample();
			utilization = 0.9;
			await vi.advanceTimersByTimeAsync(3_000);
			await sample(2);
			expect(stoppedIds()).toEqual(['first']);

			utilization = 0.7;
			await sample();
			expect(guardLogger.info).toHaveBeenCalledWith(
				expect.stringContaining('again stops executions at 85%'),
			);

			utilization = 0.9;
			await sample(2);
			expect(stoppedIds()).toEqual(['first', 'second']);
		});

		it('should not hold the result of a stopped engine when it measures memory', async () => {
			// The engine result references the full run data, which the stop must free.
			const addEngineWithResult = () => {
				const result = { data: { items: new Array(100_000).fill(0) } } as unknown as IRun;
				addExecution('large', { megabytes: 300, engine: Promise.resolve(result) });
				return new WeakRef(result);
			};
			const result = addEngineWithResult();
			activeExecutions.stopExecution.mockImplementation((id) => {
				executions.delete(id);
				activeExecutions.getExecutionOrFail.mockClear();
			});
			let isResultHeld: boolean | undefined;
			readMemoryUsageOnce(0.96);
			readMemoryUsageOnce(0.96);
			vi.mocked(readMemoryUsage).mockImplementationOnce(() => {
				isResultHeld = result.deref() !== undefined;
				return { utilization: 0.5, usedBytes: 500 * MB, limitBytes: 1_000 * MB };
			});

			await sample();

			expect(stoppedIds()).toEqual(['large']);
			expect(isResultHeld).toBe(false);
		});

		it('should forget finishing executions that ended, at every sample', async () => {
			memoryStoppedExecutions.onWorkflowExecuteAfter('ended', mock<IRun>());
			expect(memoryStoppedExecutions.isFinishing('ended')).toBe(true);

			await sample();

			expect(memoryStoppedExecutions.isFinishing('ended')).toBe(false);
		});
	});

	/** Make only the next memory read return `value`. Later reads return `utilization`. */
	function readMemoryUsageOnce(value: number) {
		vi.mocked(readMemoryUsage).mockImplementationOnce(() => ({
			utilization: value,
			usedBytes: value * 1_000 * MB,
			limitBytes: 1_000 * MB,
		}));
	}
});
