import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { EventMessageWorkflow } from '../../event-message-classes/event-message-workflow';
import { MessageEventBusLogWriter } from '../../message-event-bus-writer/message-event-bus-log-writer';
import { MessageEventBus } from '../message-event-bus';
import type { WorkflowCrashJournal } from '@/crash-loop/workflow-crash-journal';
import type { ExecutionCrashService } from '@/executions/execution-crash.service';

vi.unmock('@/eventbus/message-event-bus/message-event-bus');
vi.unmock('node:fs');

interface BusConfigOverrides {
	logFullPath?: string;
	logBaseName?: string;
	keepLogCount?: number;
	crashRecoveryMode?: 'simple' | 'extensive';
	executionsMode?: 'regular' | 'queue';
}

const buildGlobalConfig = (overrides: BusConfigOverrides = {}) =>
	mock<GlobalConfig>({
		eventBus: {
			logWriter: {
				logBaseName: overrides.logBaseName ?? 'n8nEventLog',
				logFullPath: overrides.logFullPath ?? '',
				keepLogCount: overrides.keepLogCount ?? 3,
				maxFileSizeInKB: 10240,
				maxMessagesPerParse: 10_000,
				maxTotalMessagesPerFile: 500_000,
			},
			checkUnsentInterval: 0,
			crashRecoveryMode: overrides.crashRecoveryMode ?? 'extensive',
		},
		executions: {
			mode: overrides.executionsMode ?? 'regular',
			recovery: { workflowDeactivationEnabled: false },
		},
	});

describe('MessageEventBus.initialize', () => {
	let tempDir: string;
	let logger: ReturnType<typeof mock<Logger>>;
	let getInstanceSpy: MockInstance;
	const mockedWriter = mock<MessageEventBusLogWriter>();
	const executionRepository = mock<ExecutionRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const executionCrashService = mock<ExecutionCrashService>();
	const workflowCrashJournal = mock<WorkflowCrashJournal>();

	const buildBus = (globalConfig: GlobalConfig) =>
		new MessageEventBus(
			logger,
			executionRepository,
			workflowRepository,
			mock(),
			executionCrashService,
			globalConfig,
			mock<InstanceSettings>({ n8nFolder: tempDir }),
			workflowCrashJournal,
		);

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'message-event-bus-test-'));
		logger = mock<Logger>();
		getInstanceSpy = vi
			.spyOn(MessageEventBusLogWriter, 'getInstance')
			.mockResolvedValue(mockedWriter);
		mockedWriter.getUnsentAndUnfinishedExecutions.mockResolvedValue({
			unsentMessages: [],
			unfinishedExecutions: {},
		});
		mockedWriter.getLogFileName.mockReturnValue('mocked.log');
		mockedWriter.isRecoveryProcessRunning.mockReturnValue(false);
		executionRepository.findUnfinishedIds.mockResolvedValue([]);
		executionRepository.findRunningIds.mockResolvedValue([]);
		workflowRepository.getWorkflowInfo.mockResolvedValue([]);
	});

	afterEach(() => {
		getInstanceSpy.mockRestore();
		rmSync(tempDir, { recursive: true, force: true });
		vi.unstubAllEnvs();
		vi.clearAllMocks();
	});

	describe('path routing', () => {
		it.each<{
			name: string;
			workerId?: string;
			webhookProcessorId?: string;
			expectedBase: (dir: string) => string;
		}>([
			{
				name: 'worker default appends -worker suffix',
				workerId: 'host-1',
				expectedBase: (dir) => join(dir, 'n8nEventLog-worker'),
			},
			{
				name: 'webhook processor default appends -webhook-processor suffix',
				webhookProcessorId: 'host-2',
				expectedBase: (dir) => join(dir, 'n8nEventLog-webhook-processor'),
			},
			{
				name: 'main default has no suffix',
				expectedBase: (dir) => join(dir, 'n8nEventLog'),
			},
		])('$name', async ({ workerId, webhookProcessorId, expectedBase }) => {
			const bus = buildBus(buildGlobalConfig({ logFullPath: '' }));

			await bus.initialize({ workerId, webhookProcessorId });

			expect(getInstanceSpy).toHaveBeenCalledWith({
				resolvedPath: { logFullBasePath: expectedBase(tempDir) },
			});
		});
	});

	it('warns when logFullPath is set and a default-location log exists', async () => {
		const stalePath = join(tempDir, 'n8nEventLog-worker.log');
		writeFileSync(stalePath, '');
		const customLog = join(tempDir, 'custom.log');
		const bus = buildBus(buildGlobalConfig({ logFullPath: customLog }));

		await bus.initialize({ workerId: 'host-1' });

		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(stalePath));
	});

	describe('startup recovery', () => {
		it('merges log and database unfinished ids, logs active workflows, and marks them crashed in simple mode', async () => {
			mockedWriter.getUnsentAndUnfinishedExecutions.mockResolvedValue({
				unsentMessages: [],
				unfinishedExecutions: { b: [], c: [] },
			});
			executionRepository.findUnfinishedIds.mockResolvedValue(['a', 'b']);
			workflowRepository.getWorkflowInfo.mockResolvedValue([{ id: 'w1', name: 'W1' }]);
			const bus = buildBus(buildGlobalConfig({ crashRecoveryMode: 'simple' }));

			await bus.initialize({});

			expect(workflowRepository.getWorkflowInfo).toHaveBeenCalledWith({ activeOnly: true });
			expect(logger.info).toHaveBeenCalledWith('   - W1 (ID: w1)');
			expect(executionCrashService.markAsCrashed).toHaveBeenCalledWith(
				['b', 'c', 'a'],
				'startup-recovery',
			);
		});

		it('notes the workflows of the logged executions that are still running', async () => {
			const started = (workflowId?: string) =>
				new EventMessageWorkflow({ eventName: 'n8n.workflow.started', payload: { workflowId } });
			mockedWriter.getUnsentAndUnfinishedExecutions.mockResolvedValue({
				unsentMessages: [],
				unfinishedExecutions: {
					a: [started('wf-1')],
					b: [started('wf-2')],
					c: [started('wf-3')],
					d: [started()],
				},
			});
			executionRepository.findRunningIds.mockResolvedValue(['a', 'd']);
			const bus = buildBus(buildGlobalConfig({ crashRecoveryMode: 'simple' }));

			await bus.initialize({});

			expect(executionRepository.findRunningIds).toHaveBeenCalledWith(['a', 'b', 'c', 'd']);
			expect(workflowCrashJournal.noteUnfinishedExecutions).toHaveBeenCalledWith(new Set(['wf-1']));
		});

		it('notes only manual executions in queue mode, while they are not offloaded', async () => {
			vi.stubEnv('OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS', '');
			const started = (workflowId: string, isManual: boolean) =>
				new EventMessageWorkflow({
					eventName: 'n8n.workflow.started',
					payload: { workflowId, isManual },
				});
			mockedWriter.getUnsentAndUnfinishedExecutions.mockResolvedValue({
				unsentMessages: [],
				unfinishedExecutions: { a: [started('wf-1', true)], b: [started('wf-2', false)] },
			});
			executionRepository.findRunningIds.mockResolvedValue(['a']);
			const bus = buildBus(
				buildGlobalConfig({ crashRecoveryMode: 'simple', executionsMode: 'queue' }),
			);

			await bus.initialize({});

			expect(executionRepository.findRunningIds).toHaveBeenCalledWith(['a']);
			expect(workflowCrashJournal.noteUnfinishedExecutions).toHaveBeenCalledWith(new Set(['wf-1']));
		});

		it('skips the query in queue mode when manual executions are offloaded', async () => {
			vi.stubEnv('OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS', 'true');
			mockedWriter.getUnsentAndUnfinishedExecutions.mockResolvedValue({
				unsentMessages: [],
				unfinishedExecutions: {
					a: [
						new EventMessageWorkflow({
							eventName: 'n8n.workflow.started',
							payload: { workflowId: 'wf-1', isManual: true },
						}),
					],
				},
			});
			const bus = buildBus(
				buildGlobalConfig({ crashRecoveryMode: 'simple', executionsMode: 'queue' }),
			);

			await bus.initialize({});

			expect(executionRepository.findRunningIds).not.toHaveBeenCalled();
			expect(workflowCrashJournal.noteUnfinishedExecutions).not.toHaveBeenCalled();
		});

		it('does not read unfinished executions from the database in queue mode', async () => {
			mockedWriter.getUnsentAndUnfinishedExecutions.mockResolvedValue({
				unsentMessages: [],
				unfinishedExecutions: { b: [], c: [] },
			});
			const bus = buildBus(
				buildGlobalConfig({ crashRecoveryMode: 'simple', executionsMode: 'queue' }),
			);

			await bus.initialize({});

			expect(executionRepository.findUnfinishedIds).not.toHaveBeenCalled();
			expect(executionRepository.findRunningIds).not.toHaveBeenCalled();
			expect(executionCrashService.markAsCrashed).toHaveBeenCalledWith(
				['b', 'c'],
				'startup-recovery',
			);
		});
	});
});
