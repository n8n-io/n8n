import type { Logger } from '@n8n/backend-common';
import { createDispatchReporter, type ClaimedTask } from '@n8n/scheduler';
import { mock } from 'vitest-mock-extended';

import type { AgentTaskService } from '../../agent-task.service';
import type { AgentTaskSnapshot } from '../../entities/agent-task-snapshot.entity';
import type { AgentTaskSnapshotRepository } from '../../repositories/agent-task-snapshot.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import { AGENT_TASK_TASK_TYPE } from '../agent-task-job';
import type { AgentTaskJobRegistrar } from '../agent-task-job-registrar';
import { AgentTaskTaskHandler } from '../agent-task-task-handler';

const AGENT_ID = 'agent-1';
const TASK_ID = 'task-1';

describe('AgentTaskTaskHandler', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const agentRepository = mock<AgentRepository>();
	const taskSnapshotRepository = mock<AgentTaskSnapshotRepository>();
	const agentTaskService = mock<AgentTaskService>();
	const registrar = mock<AgentTaskJobRegistrar>();

	const handler = new AgentTaskTaskHandler(
		logger,
		agentRepository,
		taskSnapshotRepository,
		agentTaskService,
		registrar,
	);

	// The dispatch-marker callback of the executor. vi.clearAllMocks() clears it in each test.
	const onDispatch = vi.fn();
	const report = createDispatchReporter(onDispatch);

	const scheduledFor = new Date('2026-08-04T09:00:00.000Z');

	const buildTask = (overrides: Partial<ClaimedTask> = {}): ClaimedTask => ({
		id: 'occurrence-1',
		jobId: 7,
		taskType: AGENT_TASK_TASK_TYPE,
		payload: { agentId: AGENT_ID, taskId: TASK_ID },
		scheduledFor,
		runAt: scheduledFor,
		status: 'running',
		attempts: 0,
		maxAttempts: 1,
		leaseEpoch: 1,
		...overrides,
	});

	const snapshot = (overrides: Partial<AgentTaskSnapshot> = {}): AgentTaskSnapshot =>
		mock<AgentTaskSnapshot>({
			versionId: 'version-1',
			taskId: TASK_ID,
			enabled: true,
			cronExpression: '0 9 * * *',
			...overrides,
		});

	const flushAsyncWork = async () => await new Promise(setImmediate);

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		agentRepository.findActiveVersionId.mockResolvedValue('version-1');
		taskSnapshotRepository.findByVersionAndTaskId.mockResolvedValue(snapshot());
		agentTaskService.startScheduledRun.mockResolvedValue('started');
		registrar.reconcile.mockResolvedValue(undefined);
	});

	it('throws on a malformed payload without reporting a dispatch', async () => {
		const task = buildTask({ payload: { agentId: AGENT_ID } });

		await expect(handler.execute(task, report)).rejects.toThrow(
			'Agent-task payload is missing agentId or taskId',
		);
		expect(onDispatch).not.toHaveBeenCalled();
		expect(agentTaskService.startScheduledRun).not.toHaveBeenCalled();
	});

	describe('stale occurrences', () => {
		it.each([
			[
				'the agent is gone or unpublished',
				() => agentRepository.findActiveVersionId.mockResolvedValue(null),
			],
			[
				'the snapshot is missing',
				() => taskSnapshotRepository.findByVersionAndTaskId.mockResolvedValue(null),
			],
			[
				'the snapshot is disabled',
				() =>
					taskSnapshotRepository.findByVersionAndTaskId.mockResolvedValue(
						snapshot({ enabled: false }),
					),
			],
		])('completes without effect and self-heals when %s', async (_name, arrange) => {
			arrange();

			const decision = await handler.execute(buildTask(), report);
			await flushAsyncWork();

			expect(decision).toBe(report.notDispatched());
			expect(onDispatch).not.toHaveBeenCalled();
			expect(agentTaskService.startScheduledRun).not.toHaveBeenCalled();
			expect(registrar.reconcile).toHaveBeenCalledWith(AGENT_ID);
		});

		it('completes the occurrence and logs when the self-heal reconcile fails', async () => {
			agentRepository.findActiveVersionId.mockResolvedValue(null);
			registrar.reconcile.mockRejectedValue(new Error('db down'));

			const decision = await handler.execute(buildTask(), report);
			await flushAsyncWork();

			expect(decision).toBe(report.notDispatched());
			expect(onDispatch).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to reconcile an agent after a stale occurrence',
				expect.objectContaining({ agentId: AGENT_ID, error: 'db down' }),
			);
		});
	});

	it('skips the tick without dispatching when the previous run still holds the lock', async () => {
		agentTaskService.startScheduledRun.mockResolvedValue('skipped-active');

		const decision = await handler.execute(buildTask(), report);

		expect(decision).toBe(report.notDispatched());
		expect(onDispatch).not.toHaveBeenCalled();
		expect(registrar.reconcile).not.toHaveBeenCalled();
	});

	it('reports dispatched after handing the run off', async () => {
		const decision = await handler.execute(buildTask(), report);

		expect(agentTaskService.startScheduledRun).toHaveBeenCalledWith(AGENT_ID, TASK_ID);
		expect(onDispatch).toHaveBeenCalledTimes(1);
		expect(decision).toBe(report.dispatched());
	});
});
