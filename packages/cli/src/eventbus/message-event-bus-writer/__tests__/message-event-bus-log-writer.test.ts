import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import { EventMessageTypeNames } from 'n8n-workflow';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { EventMessageTypes } from '../../event-message-classes';
import { EventMessageAiNode } from '../../event-message-classes/event-message-ai-node';
import { EventMessageAudit } from '../../event-message-classes/event-message-audit';
import { EventMessageExecution } from '../../event-message-classes/event-message-execution';
import { EventMessageGeneric } from '../../event-message-classes/event-message-generic';
import { EventMessageNode } from '../../event-message-classes/event-message-node';
import { EventMessageQueue } from '../../event-message-classes/event-message-queue';
import { EventMessageRunner } from '../../event-message-classes/event-message-runner';
import { EventMessageWorkflow } from '../../event-message-classes/event-message-workflow';
import { MessageEventBusLogWriter } from '../message-event-bus-log-writer';

jest.unmock('node:fs');
jest.unmock('node:fs/promises');

describe('MessageEventBusLogWriter.readLoggedMessagesFromFile', () => {
	let tempDir: string;
	let logger: ReturnType<typeof mock<Logger>>;
	let writer: MessageEventBusLogWriter;

	const makeWorkflowStartedLine = (id: string, executionId: string) =>
		JSON.stringify({
			__type: EventMessageTypeNames.workflow,
			id,
			ts: '2026-04-16T12:00:00.000Z',
			eventName: 'n8n.workflow.started',
			message: 'n8n.workflow.started',
			payload: { executionId },
		});

	const makeConfirmLine = (id: string) =>
		JSON.stringify({
			__type: EventMessageTypeNames.confirm,
			confirm: id,
			ts: '2026-04-16T12:00:00.000Z',
			source: { id: '', name: '' },
		});

	const writeLogFile = (fileName: string, lines: string[]): string => {
		const path = join(tempDir, fileName);
		writeFileSync(path, lines.join('\n') + '\n');
		return path;
	};

	const setMaxMessagesPerParse = (
		maxMessagesPerParse: number,
		maxTotalMessagesPerFile: number = 500_000,
	) => {
		const globalConfig = mock<GlobalConfig>({
			eventBus: {
				logWriter: { maxMessagesPerParse, maxTotalMessagesPerFile, keepLogCount: 3 },
			},
		});
		Container.set(GlobalConfig, globalConfig);
	};

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'eventbus-log-writer-test-'));
		logger = mock<Logger>();
		Container.set(Logger, logger);
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
		Container.reset();
	});

	it('aborts parsing and warns when the in-memory working set exceeds the configured max', async () => {
		const maxMessagesPerParse = 5;
		setMaxMessagesPerParse(maxMessagesPerParse);
		writer = new MessageEventBusLogWriter();

		const lines: string[] = [];
		for (let i = 0; i < 100; i++) {
			lines.push(makeWorkflowStartedLine(`id-${i}`, `exec-${i}`));
		}
		const logFile = writeLogFile('bloated.log', lines);

		const results = {
			loggedMessages: [] as EventMessageTypes[],
			sentMessages: [] as EventMessageTypes[],
			unfinishedExecutions: {} as Record<string, EventMessageTypes[]>,
		};

		await writer.readLoggedMessagesFromFile(results, 'unsent', logFile);

		expect(results.loggedMessages.length).toBeLessThan(100);
		expect(results.loggedMessages.length).toBeLessThanOrEqual(maxMessagesPerParse + 1);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('exceeded 5 in-memory messages during parse'),
		);
	});

	it('uses per-file count so prior file accumulation does not abort the next file', async () => {
		const maxMessagesPerParse = 5;
		setMaxMessagesPerParse(maxMessagesPerParse);
		writer = new MessageEventBusLogWriter();

		// File 1: 4 unconfirmed messages (below limit)
		const lines1: string[] = [];
		for (let i = 0; i < 4; i++) {
			lines1.push(makeWorkflowStartedLine(`old-id-${i}`, `old-exec-${i}`));
		}
		const logFile1 = writeLogFile('old.log', lines1);

		// File 2: 4 unconfirmed messages (below limit per-file, but 8 total)
		const lines2: string[] = [];
		for (let i = 0; i < 4; i++) {
			lines2.push(makeWorkflowStartedLine(`new-id-${i}`, `new-exec-${i}`));
		}
		const logFile2 = writeLogFile('new.log', lines2);

		const results = {
			loggedMessages: [] as EventMessageTypes[],
			sentMessages: [] as EventMessageTypes[],
			unfinishedExecutions: {} as Record<string, EventMessageTypes[]>,
		};

		await writer.readLoggedMessagesFromFile(results, 'unsent', logFile1);
		await writer.readLoggedMessagesFromFile(results, 'unsent', logFile2);

		// Both files should be fully parsed (8 total, each file under limit)
		expect(results.loggedMessages).toHaveLength(8);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('does not apply the guard in "all" mode since confirms do not prune', async () => {
		const maxMessagesPerParse = 5;
		setMaxMessagesPerParse(maxMessagesPerParse);
		writer = new MessageEventBusLogWriter();

		const lines: string[] = [];
		for (let i = 0; i < 20; i++) {
			lines.push(makeWorkflowStartedLine(`id-${i}`, `exec-${i}`));
		}
		const logFile = writeLogFile('all-mode.log', lines);

		const results = {
			loggedMessages: [] as EventMessageTypes[],
			sentMessages: [] as EventMessageTypes[],
			unfinishedExecutions: {} as Record<string, EventMessageTypes[]>,
		};

		await writer.readLoggedMessagesFromFile(results, 'all', logFile);

		expect(results.loggedMessages).toHaveLength(20);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('does not abort when confirms prune the working set below the limit', async () => {
		const maxMessagesPerParse = 5;
		setMaxMessagesPerParse(maxMessagesPerParse);
		writer = new MessageEventBusLogWriter();

		const lines: string[] = [];
		for (let i = 0; i < 100; i++) {
			const id = `id-${i}`;
			lines.push(makeWorkflowStartedLine(id, `exec-${i}`));
			lines.push(makeConfirmLine(id));
		}
		const logFile = writeLogFile('healthy.log', lines);

		const results = {
			loggedMessages: [] as EventMessageTypes[],
			sentMessages: [] as EventMessageTypes[],
			unfinishedExecutions: {} as Record<string, EventMessageTypes[]>,
		};

		await writer.readLoggedMessagesFromFile(results, 'unsent', logFile);

		expect(results.loggedMessages).toHaveLength(0);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('aggregates malformed lines into a single warn and logs no per-line errors', async () => {
		setMaxMessagesPerParse(1000, 500_000);
		writer = new MessageEventBusLogWriter();

		const lines: string[] = [];
		for (let i = 0; i < 1000; i++) {
			lines.push(`malformed-${i}-not-json`);
		}
		const logFile = writeLogFile('malformed.log', lines);

		const results = {
			loggedMessages: [] as EventMessageTypes[],
			sentMessages: [] as EventMessageTypes[],
			unfinishedExecutions: {} as Record<string, EventMessageTypes[]>,
		};

		await writer.readLoggedMessagesFromFile(results, 'unsent', logFile);

		expect(results.loggedMessages).toHaveLength(0);
		expect(logger.error).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('skipped 1000 malformed line(s)'),
		);
	});

	it('returns valid messages and one aggregated warn on mixed valid/invalid input', async () => {
		setMaxMessagesPerParse(1000, 500_000);
		writer = new MessageEventBusLogWriter();

		const lines: string[] = [];
		for (let i = 0; i < 5; i++) {
			lines.push(makeWorkflowStartedLine(`id-${i}`, `exec-${i}`));
			lines.push(`malformed-${i}`);
		}
		const logFile = writeLogFile('mixed.log', lines);

		const results = {
			loggedMessages: [] as EventMessageTypes[],
			sentMessages: [] as EventMessageTypes[],
			unfinishedExecutions: {} as Record<string, EventMessageTypes[]>,
		};

		await writer.readLoggedMessagesFromFile(results, 'unsent', logFile);

		expect(results.loggedMessages).toHaveLength(5);
		expect(logger.error).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('skipped 5 malformed line(s)'),
		);
	});

	it('aborts "all"-mode parsing when the total line ceiling is exceeded', async () => {
		setMaxMessagesPerParse(1000, 10);
		writer = new MessageEventBusLogWriter();

		const lines: string[] = [];
		for (let i = 0; i < 50; i++) {
			lines.push(makeWorkflowStartedLine(`id-${i}`, `exec-${i}`));
		}
		const logFile = writeLogFile('large-all.log', lines);

		const results = {
			loggedMessages: [] as EventMessageTypes[],
			sentMessages: [] as EventMessageTypes[],
			unfinishedExecutions: {} as Record<string, EventMessageTypes[]>,
		};

		await writer.readLoggedMessagesFromFile(results, 'all', logFile);

		expect(results.loggedMessages.length).toBeLessThanOrEqual(11);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('exceeded 10 total lines during parse'),
		);
	});

	it('counts malformed lines toward the total-messages ceiling', async () => {
		setMaxMessagesPerParse(1000, 20);
		writer = new MessageEventBusLogWriter();

		const lines: string[] = [];
		for (let i = 0; i < 100; i++) {
			lines.push(`malformed-${i}`);
		}
		const logFile = writeLogFile('all-malformed.log', lines);

		const results = {
			loggedMessages: [] as EventMessageTypes[],
			sentMessages: [] as EventMessageTypes[],
			unfinishedExecutions: {} as Record<string, EventMessageTypes[]>,
		};

		await writer.readLoggedMessagesFromFile(results, 'all', logFile);

		expect(results.loggedMessages).toHaveLength(0);
		expect(logger.error).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('exceeded 20 total lines during parse'),
		);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('skipped'));
	});

	it('truncates the aggregated warn sample to 200 characters', async () => {
		setMaxMessagesPerParse(1000, 500_000);
		writer = new MessageEventBusLogWriter();

		const longMalformed = 'x'.repeat(500);
		const logFile = writeLogFile('long-malformed.log', [longMalformed]);

		const results = {
			loggedMessages: [] as EventMessageTypes[],
			sentMessages: [] as EventMessageTypes[],
			unfinishedExecutions: {} as Record<string, EventMessageTypes[]>,
		};

		await writer.readLoggedMessagesFromFile(results, 'unsent', logFile);

		expect(logger.warn).toHaveBeenCalledTimes(1);
		const warnCall = logger.warn.mock.calls[0]?.[0];
		const sampleMatch = warnCall?.match(/Sample \(truncated\): (.*)$/);
		expect(sampleMatch).not.toBeNull();
		expect(sampleMatch![1].length).toBeLessThanOrEqual(200);
	});
});

describe('MessageEventBusLogWriter.getInstance path resolution', () => {
	let tempDir: string;
	let startThreadSpy: jest.SpyInstance;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'eventbus-log-writer-getinstance-'));
		Container.set(Logger, mock<Logger>());
		Container.set(
			GlobalConfig,
			mock<GlobalConfig>({
				eventBus: {
					logWriter: {
						logBaseName: 'n8nEventLog',
						keepLogCount: 3,
						maxFileSizeInKB: 10240,
					},
				},
			}),
		);
		Container.set(InstanceSettings, mock<InstanceSettings>({ n8nFolder: tempDir }));
		startThreadSpy = jest
			.spyOn(MessageEventBusLogWriter.prototype as never, 'startThread')
			.mockResolvedValue(undefined as never);
	});

	afterEach(() => {
		(MessageEventBusLogWriter as unknown as { instance: undefined }).instance = undefined;
		startThreadSpy.mockRestore();
		rmSync(tempDir, { recursive: true, force: true });
		Container.reset();
	});

	it.each<{ name: string; resolvedPath?: { logFullBasePath: string }; expected: () => string }>([
		{
			name: 'uses resolvedPath verbatim when supplied',
			resolvedPath: { logFullBasePath: '/var/log/custom-events' },
			expected: () => '/var/log/custom-events',
		},
		{
			name: 'falls back to <n8nFolder>/<logBaseName> when no options supplied',
			resolvedPath: undefined,
			expected: () => join(tempDir, 'n8nEventLog'),
		},
	])('$name', async ({ resolvedPath, expected }) => {
		await MessageEventBusLogWriter.getInstance(resolvedPath ? { resolvedPath } : undefined);

		expect(MessageEventBusLogWriter.options.logFullBasePath).toBe(expected());
	});
});

describe('MessageEventBusLogWriter.getEventMessageObjectByType round-trip', () => {
	let tempDir: string;
	let writer: MessageEventBusLogWriter;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'eventbus-log-writer-roundtrip-'));
		Container.set(Logger, mock<Logger>());
		Container.set(
			GlobalConfig,
			mock<GlobalConfig>({
				eventBus: {
					logWriter: {
						maxMessagesPerParse: 1000,
						maxTotalMessagesPerFile: 500_000,
						keepLogCount: 3,
					},
				},
			}),
		);
		MessageEventBusLogWriter.options = {
			logFullBasePath: join(tempDir, 'eventlog'),
			keepNumberOfFiles: 3,
			maxFileSizeInKB: 10240,
		};
		writer = new MessageEventBusLogWriter();
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
		Container.reset();
	});

	// One representative instance per persisted message class. These cover every
	// member of `EventMessageTypeNames` (n8n-workflow) that `send()` can persist –
	// i.e. every member except `confirm`. Each must survive the
	// serialize -> persist -> deserialize round-trip without being dropped to null.
	const sampleMessages: Array<{ label: string; message: () => EventMessageTypes }> = [
		{
			label: EventMessageTypeNames.generic,
			message: () => new EventMessageGeneric({ eventName: 'n8n.worker.started' }),
		},
		{
			label: EventMessageTypeNames.workflow,
			message: () =>
				new EventMessageWorkflow({
					eventName: 'n8n.workflow.started',
					payload: { executionId: 'e1' },
				}),
		},
		{
			label: EventMessageTypeNames.audit,
			message: () => new EventMessageAudit({ eventName: 'n8n.audit.user.login.success' }),
		},
		{
			label: EventMessageTypeNames.node,
			message: () =>
				new EventMessageNode({
					eventName: 'n8n.node.started',
					payload: { executionId: 'e1', nodeName: 'Set', workflowName: 'wf' },
				}),
		},
		{
			label: EventMessageTypeNames.execution,
			message: () =>
				new EventMessageExecution({
					eventName: 'n8n.execution.throttled',
					payload: { executionId: 'e1', type: 'production' },
				}),
		},
		{
			label: EventMessageTypeNames.aiNode,
			message: () =>
				new EventMessageAiNode({
					eventName: 'n8n.ai.tool.called',
					payload: { executionId: 'e1', nodeName: 'Agent', workflowName: 'wf' },
				}),
		},
		{
			label: EventMessageTypeNames.runner,
			message: () => new EventMessageRunner({ eventName: 'n8n.runner.task.requested' }),
		},
		{
			label: EventMessageTypeNames.queue,
			message: () => new EventMessageQueue({ eventName: 'n8n.queue.job.enqueued' }),
		},
	];

	it.each(sampleMessages)(
		'reconstructs a non-null instance for persisted message $label',
		({ message }) => {
			const original = message();

			const reconstructed = writer.getEventMessageObjectByType(original.serialize());

			expect(reconstructed).not.toBeNull();
			expect(reconstructed?.eventName).toBe(original.eventName);
		},
	);

	it('returns a persisted execution message as unsent when no confirm line exists', async () => {
		const message = new EventMessageExecution({
			eventName: 'n8n.execution.throttled',
			payload: { executionId: 'e1', type: 'production' },
		});
		writeFileSync(writer.getLogFileName(), JSON.stringify(message.serialize()) + '\n');

		const unsent = await writer.getMessagesUnsent();

		expect(unsent).toHaveLength(1);
		expect(unsent[0]).toBeInstanceOf(EventMessageExecution);
		expect(unsent[0].payload?.executionId).toBe('e1');
	});
});
