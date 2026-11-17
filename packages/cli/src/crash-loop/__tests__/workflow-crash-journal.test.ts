import { mockLogger } from '@n8n/backend-test-utils';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CRASH_WINDOW_MS, WorkflowCrashJournal } from '../workflow-crash-journal';

const crashJournal = vi.hoisted(() => ({ file: '' }));

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
	const readJournal = (): unknown => JSON.parse(readFileSync(journalPath(), 'utf8'));
	const newSession = () => new WorkflowCrashJournal(mockLogger());

	/** One session that starts the attempts and then crashes with them in flight. */
	const crashWith = (...attempts: Array<ReturnType<typeof attempt>>) => {
		const journal = newSession();
		journal.startSession(false, t0);
		for (const a of attempts) journal.recordStart(a);
	};

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'workflow-crash-journal-'));
		crashJournal.file = join(dir, 'crash.journal');
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	describe('startSession after a crash', () => {
		it('counts a crash for each workflow with a scheduled job in flight', () => {
			crashWith(attempt('1', 'wf-a'), attempt('2', 'wf-b'));

			const crashed = newSession().startSession(true, t0);

			expect(crashed).toEqual([
				{ workflowId: 'wf-a', crashes: 1 },
				{ workflowId: 'wf-b', crashes: 1 },
			]);
			expect(readJournal()).toEqual({ crashes: { 'wf-a': [t0], 'wf-b': [t0] }, inFlight: {} });
		});

		it('counts a crash for each workflow with an execution that did not finish', () => {
			const journal = newSession();
			journal.noteUnfinishedExecutions(['wf-a', 'wf-b']);

			const crashed = journal.startSession(true, t0);

			expect(crashed).toEqual([
				{ workflowId: 'wf-a', crashes: 1 },
				{ workflowId: 'wf-b', crashes: 1 },
			]);
			expect(readJournal()).toEqual({ crashes: { 'wf-a': [t0], 'wf-b': [t0] }, inFlight: {} });
		});

		it('counts a workflow once per crash when several jobs and executions of it were in flight', () => {
			crashWith(attempt('1', 'wf-a'), attempt('2', 'wf-a'));
			const journal = newSession();
			journal.noteUnfinishedExecutions(['wf-a']);

			const crashed = journal.startSession(true, t0);

			expect(crashed).toEqual([{ workflowId: 'wf-a', crashes: 1 }]);
		});

		it('adds up the crashes within the window across sessions', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);
			crashWith(attempt('2', 'wf-a'));
			newSession().startSession(true, t0 + HOUR);
			crashWith(attempt('3', 'wf-a'));

			const crashed = newSession().startSession(true, t0 + 2 * HOUR);

			expect(crashed).toEqual([{ workflowId: 'wf-a', crashes: 3 }]);
		});

		it('drops a crash older than the window', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);
			crashWith(attempt('2', 'wf-a'));
			newSession().startSession(true, t0 + HOUR);
			crashWith(attempt('3', 'wf-a'));

			const crashed = newSession().startSession(true, t0 + CRASH_WINDOW_MS);

			expect(crashed).toEqual([{ workflowId: 'wf-a', crashes: 2 }]);
			expect(readJournal()).toEqual({
				crashes: { 'wf-a': [t0 + HOUR, t0 + CRASH_WINDOW_MS] },
				inFlight: {},
			});
		});

		it('keeps the crashes of a workflow that was not in flight at the latest crash', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);
			crashWith(attempt('2', 'wf-b'));

			const crashed = newSession().startSession(true, t0 + HOUR);

			expect(crashed).toEqual([{ workflowId: 'wf-b', crashes: 1 }]);
			expect(readJournal()).toEqual({
				crashes: { 'wf-a': [t0], 'wf-b': [t0 + HOUR] },
				inFlight: {},
			});
		});

		it('counts an attempt that a timeout abandoned but that had not settled', () => {
			const journal = newSession();
			journal.startSession(false, t0);
			journal.recordStart(attempt('1', 'wf-a'));
			// The task completed, but the poll never settled before the crash.

			const crashed = newSession().startSession(true, t0);

			expect(crashed).toEqual([{ workflowId: 'wf-a', crashes: 1 }]);
		});

		it('does not count an attempt that settled before the crash', () => {
			const journal = newSession();
			journal.startSession(false, t0);
			const settle = journal.recordStart(attempt('1', 'wf-a'));
			settle();

			const crashed = newSession().startSession(true, t0);

			expect(crashed).toEqual([]);
		});

		it('does not count a job again at a crash before any job of the new session started', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);

			const crashed = newSession().startSession(true, t0 + HOUR);

			expect(crashed).toEqual([]);
		});

		it('starts over from a corrupt file', () => {
			writeFileSync(journalPath(), '{"crashes":1}');

			expect(newSession().startSession(true, t0)).toEqual([]);
		});
	});

	describe('startSession after a clean shutdown', () => {
		it('keeps the recent crashes and forgets what was in flight', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);
			crashWith(attempt('2', 'wf-a'));
			const journal = newSession();
			journal.noteUnfinishedExecutions(['wf-b']);

			const crashed = journal.startSession(false, t0 + HOUR);

			expect(crashed).toEqual([]);
			expect(readJournal()).toEqual({ crashes: { 'wf-a': [t0] }, inFlight: {} });
		});

		it('drops the crashes older than the window', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true, t0);

			newSession().startSession(false, t0 + CRASH_WINDOW_MS);

			expect(readJournal()).toEqual({ crashes: {}, inFlight: {} });
		});
	});

	describe('recordStart', () => {
		it('lists the attempt as in flight until it settles', () => {
			const journal = newSession();
			journal.startSession(false, t0);

			const settle = journal.recordStart(attempt('1', 'wf-a', 2));

			expect(readJournal()).toEqual({ crashes: {}, inFlight: { '1:2': 'wf-a' } });
			settle();
			expect(readJournal()).toEqual({ crashes: {}, inFlight: {} });
		});

		it('ignores an attempt whose payload names no workflow and node', () => {
			const journal = newSession();
			journal.startSession(false, t0);

			journal.recordStart({ id: '1', leaseEpoch: 1, payload: { kind: 'system' } });

			expect(readJournal()).toEqual({ crashes: {}, inFlight: {} });
		});
	});

	describe('clearWorkflow', () => {
		it('forgets the crashes of the workflow', () => {
			crashWith(attempt('1', 'wf-a'), attempt('2', 'wf-b'));
			newSession().startSession(true, t0);

			newSession().clearWorkflow('wf-a');

			expect(readJournal()).toEqual({ crashes: { 'wf-b': [t0] }, inFlight: {} });
		});
	});
});
