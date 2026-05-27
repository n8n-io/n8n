import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { MessageEventBusLogWriter } from '../../message-event-bus-writer/message-event-bus-log-writer';
import { MessageEventBus } from '../message-event-bus';

jest.unmock('@/eventbus/message-event-bus/message-event-bus');
jest.unmock('node:fs');

interface BusConfigOverrides {
	logFullPath?: string;
	logBaseName?: string;
	keepLogCount?: number;
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
			crashRecoveryMode: 'extensive',
		},
		executions: { mode: 'regular', recovery: { workflowDeactivationEnabled: false } },
	});

describe('MessageEventBus.initialize', () => {
	let tempDir: string;
	let logger: ReturnType<typeof mock<Logger>>;
	let getInstanceSpy: jest.SpyInstance;
	const mockedWriter = mock<MessageEventBusLogWriter>();
	const executionRepository = mock<ExecutionRepository>();

	const buildBus = (globalConfig: GlobalConfig) =>
		new MessageEventBus(
			logger,
			executionRepository,
			mock(),
			mock(),
			globalConfig,
			mock<InstanceSettings>({ n8nFolder: tempDir }),
		);

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'message-event-bus-test-'));
		logger = mock<Logger>();
		getInstanceSpy = jest
			.spyOn(MessageEventBusLogWriter, 'getInstance')
			.mockResolvedValue(mockedWriter);
		mockedWriter.getUnsentAndUnfinishedExecutions.mockResolvedValue({
			unsentMessages: [],
			unfinishedExecutions: {},
		});
		mockedWriter.getLogFileName.mockReturnValue('mocked.log');
		mockedWriter.isRecoveryProcessRunning.mockReturnValue(false);
		executionRepository.find.mockResolvedValue([]);
	});

	afterEach(() => {
		getInstanceSpy.mockRestore();
		rmSync(tempDir, { recursive: true, force: true });
		jest.clearAllMocks();
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
});
