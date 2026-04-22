import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { EventMessageTypeNames } from 'n8n-workflow';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { EventMessageTypes } from '../../event-message-classes';
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

	const setMaxMessagesPerParse = (maxMessagesPerParse: number) => {
		const globalConfig = mock<GlobalConfig>({
			eventBus: { logWriter: { maxMessagesPerParse, keepLogCount: 3 } },
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
});
