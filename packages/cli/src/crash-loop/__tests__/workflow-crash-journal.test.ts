import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CRASH_WINDOW_MS, WorkflowCrashJournal } from '../workflow-crash-journal';

const crashJournal = vi.hoisted(() => ({ file: '', failWrites: false, failRemoves: false }));

vi.mock('node:fs', async (importOriginal) => {
	const fs = await importOriginal<typeof import('node:fs')>();
	return {
		...fs,
		writeSync: (...args: Parameters<typeof fs.writeSync>) => {
			if (crashJournal.failWrites) throw new Error('ENOSPC');
			return fs.writeSync(...args);
		},
		ftruncateSync: (...args: Parameters<typeof fs.ftruncateSync>) => {
			if (crashJournal.failRemoves) throw new Error('EROFS');
			fs.ftruncateSync(...args);
		},
	};
});

vi.mock('@/crash-journal', () => ({
	get journalFile() {
		return crashJournal.file;
	},
}));

const attempt = (id: string, workflowId: string, leaseEpoch = 1) => ({
	id,
	leaseEpoch,
	payload: { workflowId, nodeId: 'node-1' },
});

const HOUR = 60 * 60 * 1000;
const t0 = 1_700_000_000_000;

describe('WorkflowCrashJournal', () => {
	let dir: string;

	const journalPath = () => `${crashJournal.file}.workflows`;
	/** The state after the header line, cut to the length that the header gives. */
	const readJournal = (): unknown => {
		const [header, ...rest] = readFileSync(journalPath(), 'utf8').split('\n');
		const length = Number(header.split(' ')[1]);
		return JSON.parse(rest.join('\n').slice(0, length));
	};
	const executionsConfig = (workflowDeactivationEnabled = true) =>
		mock<ExecutionsConfig>({ recovery: { workflowDeactivationEnabled } });
	const newSession = () => new WorkflowCrashJournal(mockLogger(), executionsConfig());

	/** One session that starts the attempts and then crashes with them in flight. */
	const crashWith = (...attempts: Array<ReturnType<typeof attempt>>) => {
		const journal = newSession();
		journal.startSession(false, t0);
		for (const a of attempts) journal.recordStart(a);
	};

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'workflow-crash-journal-'));
		crashJournal.file = join(dir, 'crash.journal');
		crashJournal.failWrites = false;
		crashJournal.failRemoves = false;
	});

	afterEach(() => {
		crashJournal.failWrites = false;
		crashJournal.failRemoves = false;
		rmSync(dir, { recursive: true, force: true });
	});

	describe('startSession after a crash', () => {
		it('counts a crash for the one workflow with a scheduled job in flight', () => {
			crashWith(attempt('1', 'wf-a'));

			const suspect = newSession().startSession(true, t0);

			expect(suspect).toEqual({ workflowId: 'wf-a', crashes: 1 });
			expect(readJournal()).toEqual({
				streak: { workflowId: 'wf-a', crashedAt: [t0] },
				inFlight: {},
			});
		});

		it('counts a crash for the one workflow with an execution that did not finish', () => {
			const journal = newSession();
			journal.noteUnfinishedExecutions(['wf-a']);

			const suspect = journal.startSession(true, t0);

			expect(suspect).toEqual({ workflowId: 'wf-a', crashes: 1 });
		});

		it('counts the workflow once when several jobs and executions of it were in flight', () => {
			crashWith(attempt('1', 'wf-a'), attempt('2', 'wf-a'));
			const journal = newSession();
			journal.noteUnfinishedExecutions(['wf-a', 'wf-a']);

			const suspect = journal.startSession(true, t0);

			expect(suspect).toEqual({ workflowId: 'wf-a', crashes: 1 });
		});

		it('names no suspect when two workflows were in flight', () => {
			crashWith(attempt('1', 'wf-a'));
			const journal = newSession();
			journal.noteUnfinishedExecutions(['wf-b']);

			const suspect = journal.startSession(true, t0);

			expect(suspect).toBeUndefined();
			expect(readJournal()).toEqual({ streak: null, inFlight: {} });
		});

		it('names no suspect when nothing was in flight', () => {
			crashWith();

			expect(newSession().startSession(true, t0)).toBeUndefined();
		});

		it('adds up crashes in a row across sessions', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);
			crashWith(attempt('2', 'wf-a'));
			newSession().startSession(true, t0 + HOUR);
			crashWith(attempt('3', 'wf-a'));

			const suspect = newSession().startSession(true, t0 + 2 * HOUR);

			expect(suspect).toEqual({ workflowId: 'wf-a', crashes: 3 });
		});

		it('ends the streak when another workflow was alone in flight at the next crash', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);
			crashWith(attempt('2', 'wf-b'));
			newSession().startSession(true, t0 + HOUR);
			crashWith(attempt('3', 'wf-a'));

			const suspect = newSession().startSession(true, t0 + 2 * HOUR);

			expect(suspect).toEqual({ workflowId: 'wf-a', crashes: 1 });
		});

		it('ends the streak when the next crash names no suspect', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);
			crashWith(attempt('2', 'wf-a'), attempt('3', 'wf-b'));
			newSession().startSession(true, t0 + HOUR);
			crashWith(attempt('4', 'wf-a'));

			const suspect = newSession().startSession(true, t0 + 2 * HOUR);

			expect(suspect).toEqual({ workflowId: 'wf-a', crashes: 1 });
		});

		it('drops a crash older than the window', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);
			crashWith(attempt('2', 'wf-a'));
			newSession().startSession(true, t0 + HOUR);
			crashWith(attempt('3', 'wf-a'));

			const suspect = newSession().startSession(true, t0 + CRASH_WINDOW_MS);

			expect(suspect).toEqual({ workflowId: 'wf-a', crashes: 2 });
			expect(readJournal()).toEqual({
				streak: { workflowId: 'wf-a', crashedAt: [t0 + HOUR, t0 + CRASH_WINDOW_MS] },
				inFlight: {},
			});
		});

		it('counts an attempt that a timeout abandoned but that had not settled', () => {
			const journal = newSession();
			journal.startSession(false, t0);
			journal.recordStart(attempt('1', 'wf-a'));
			// The task completed, but the poll never settled before the crash.

			expect(newSession().startSession(true, t0)).toEqual({ workflowId: 'wf-a', crashes: 1 });
		});

		it('does not count an attempt that settled before the crash', () => {
			const journal = newSession();
			journal.startSession(false, t0);
			const settle = journal.recordStart(attempt('1', 'wf-a'));
			settle();

			expect(newSession().startSession(true, t0)).toBeUndefined();
		});

		it('does not count a job again at a crash before any job of the new session started', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);

			expect(newSession().startSession(true, t0 + HOUR)).toBeUndefined();
		});

		it('clears the file when a write fails, so the next session blames no workflow', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);
			const journal = newSession();
			journal.startSession(false, t0 + HOUR);
			const settle = journal.recordStart(attempt('2', 'wf-a'));
			crashJournal.failWrites = true;
			settle();

			expect(readFileSync(journalPath()).length).toBe(0);
			crashJournal.failWrites = false;
			expect(newSession().startSession(true, t0 + 2 * HOUR)).toBeUndefined();
		});

		it('does not throw when the write and the cleanup both fail', () => {
			const logger = mockLogger();
			const journal = new WorkflowCrashJournal(logger, executionsConfig());
			journal.startSession(false, t0);
			const settle = journal.recordStart(attempt('1', 'wf-a'));
			crashJournal.failWrites = true;
			crashJournal.failRemoves = true;

			expect(() => settle()).not.toThrow();

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to write and to clear the workflow crash journal',
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});

		it('starts over from a corrupt file', () => {
			writeFileSync(journalPath(), '{"streak":1}');

			expect(newSession().startSession(true, t0)).toBeUndefined();
		});

		it('starts over from a write that a crash cut short', () => {
			crashWith(attempt('1', 'wf-a'));
			const content = readFileSync(journalPath());
			writeFileSync(journalPath(), content.subarray(0, content.length - 5));

			expect(newSession().startSession(true, t0)).toBeUndefined();
		});

		it('ignores the bytes that a longer earlier state left after the current one', () => {
			const journal = newSession();
			journal.startSession(false, t0);
			const settleFirst = journal.recordStart(attempt('1', 'wf-a'));
			journal.recordStart(attempt('2', 'wf-a'));
			settleFirst();

			expect(newSession().startSession(true, t0 + HOUR)).toEqual({
				workflowId: 'wf-a',
				crashes: 1,
			});
		});
	});

	describe('startSession after a clean shutdown', () => {
		it('keeps the streak and forgets what was in flight', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);
			crashWith(attempt('2', 'wf-a'));
			const journal = newSession();
			journal.noteUnfinishedExecutions(['wf-b']);

			const suspect = journal.startSession(false, t0 + HOUR);

			expect(suspect).toBeUndefined();
			expect(readJournal()).toEqual({
				streak: { workflowId: 'wf-a', crashedAt: [t0] },
				inFlight: {},
			});
		});

		it('drops the crashes older than the window', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);

			newSession().startSession(false, t0 + CRASH_WINDOW_MS);

			expect(readJournal()).toEqual({ streak: null, inFlight: {} });
		});
	});

	describe('recordStart', () => {
		it('lists the attempt as in flight until it settles', () => {
			const journal = newSession();
			journal.startSession(false, t0);

			const settle = journal.recordStart(attempt('1', 'wf-a', 2));

			expect(readJournal()).toEqual({ streak: null, inFlight: { '1:2': 'wf-a' } });
			settle();
			expect(readJournal()).toEqual({ streak: null, inFlight: {} });
		});

		it('ignores an attempt whose payload names no workflow and node', () => {
			const journal = newSession();
			journal.startSession(false, t0);

			journal.recordStart({ id: '1', leaseEpoch: 1, payload: { kind: 'system' } });

			expect(readJournal()).toEqual({ streak: null, inFlight: {} });
		});

		it('writes nothing when workflow deactivation is disabled', () => {
			const journal = new WorkflowCrashJournal(mockLogger(), executionsConfig(false));
			journal.startSession(false, t0);
			rmSync(journalPath());

			journal.recordStart(attempt('1', 'wf-a'))();

			expect(existsSync(journalPath())).toBe(false);
		});
	});

	describe('clearWorkflow', () => {
		it('forgets the streak of the workflow', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);

			newSession().clearWorkflow('wf-a');

			expect(readJournal()).toEqual({ streak: null, inFlight: {} });
		});

		it('keeps the streak of another workflow', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);

			newSession().clearWorkflow('wf-b');

			expect(readJournal()).toEqual({
				streak: { workflowId: 'wf-a', crashedAt: [t0] },
				inFlight: {},
			});
		});
	});
});
