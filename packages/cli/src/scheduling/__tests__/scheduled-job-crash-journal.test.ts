import { mockLogger } from '@n8n/backend-test-utils';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ScheduledJobCrashJournal } from '../scheduled-job-crash-journal';

const crashJournal = vi.hoisted(() => ({ file: '' }));

vi.mock('@/crash-journal', () => ({
	get journalFile() {
		return crashJournal.file;
	},
}));

const attempt = (id: string, workflowId: string, nodeId = 'node-1', leaseEpoch = 1) => ({
	id,
	leaseEpoch,
	payload: { workflowId, nodeId },
});

describe('ScheduledJobCrashJournal', () => {
	let dir: string;

	const journalPath = () => `${crashJournal.file}.scheduled-jobs`;
	const readJournal = (): unknown => JSON.parse(readFileSync(journalPath(), 'utf8'));
	const newSession = () => new ScheduledJobCrashJournal(mockLogger());

	/** One session that starts the attempts and then crashes with them in flight. */
	const crashWith = (...attempts: Array<ReturnType<typeof attempt>>) => {
		const journal = newSession();
		journal.startSession(false);
		for (const a of attempts) journal.recordStart(a);
	};

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'scheduled-job-crash-journal-'));
		crashJournal.file = join(dir, 'crash.journal');
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	describe('startSession after a crash', () => {
		it('starts a streak for each job in flight at the crash', () => {
			crashWith(attempt('1', 'wf-a'), attempt('2', 'wf-b', 'node-2'));

			const streaks = newSession().startSession(true);

			expect(streaks).toEqual([
				{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 },
				{ workflowId: 'wf-b', nodeId: 'node-2', crashes: 1 },
			]);
			expect(readJournal()).toEqual({
				streaks: {
					'wf-a:node-1': { workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 },
					'wf-b:node-2': { workflowId: 'wf-b', nodeId: 'node-2', crashes: 1 },
				},
				inFlight: {},
			});
		});

		it('extends the streak across sessions', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true);
			crashWith(attempt('2', 'wf-a'));
			newSession().startSession(true);
			crashWith(attempt('3', 'wf-a'));

			const streaks = newSession().startSession(true);

			expect(streaks).toEqual([{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 3 }]);
		});

		it('counts a job once per crash when several of its attempts are in flight', () => {
			crashWith(attempt('1', 'wf-a'), attempt('2', 'wf-a'));

			const streaks = newSession().startSession(true);

			expect(streaks).toEqual([{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 }]);
		});

		it('counts an attempt that a timeout abandoned but that had not settled', () => {
			const journal = newSession();
			journal.startSession(false);
			journal.recordStart(attempt('1', 'wf-a'));
			// The task completed, but the poll never settled before the crash.

			const streaks = newSession().startSession(true);

			expect(streaks).toEqual([{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 }]);
		});

		it('does not count an attempt that settled before the crash', () => {
			const journal = newSession();
			journal.startSession(false);
			const settle = journal.recordStart(attempt('1', 'wf-a'));
			settle();

			const streaks = newSession().startSession(true);

			expect(streaks).toEqual([]);
		});

		it('ends the streak of a job that was not in flight at the latest crash', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true);
			crashWith(attempt('2', 'wf-b'));
			newSession().startSession(true);
			crashWith(attempt('3', 'wf-a'));

			const streaks = newSession().startSession(true);

			expect(streaks).toEqual([{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 }]);
		});

		it('does not count a job again at a crash before any job of the new session started', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true);

			const streaks = newSession().startSession(true);

			expect(streaks).toEqual([]);
		});

		it('starts over from a corrupt file', () => {
			writeFileSync(journalPath(), '{"streaks":1}');

			expect(newSession().startSession(true)).toEqual([]);
		});
	});

	describe('startSession after a clean shutdown', () => {
		it('keeps the streaks and forgets the jobs in flight', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true);
			crashWith(attempt('2', 'wf-a'));

			const streaks = newSession().startSession(false);

			expect(streaks).toEqual([]);
			expect(readJournal()).toEqual({
				streaks: { 'wf-a:node-1': { workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 } },
				inFlight: {},
			});
		});
	});

	describe('recordStart', () => {
		it('ignores an attempt whose payload names no workflow and node', () => {
			const journal = newSession();
			journal.startSession(false);

			journal.recordStart({ id: '1', leaseEpoch: 1, payload: { kind: 'system' } });

			expect(readJournal()).toEqual({ streaks: {}, inFlight: {} });
		});
	});

	describe('recordCompletion', () => {
		it('ends the streak of the job', () => {
			crashWith(attempt('1', 'wf-a'));
			newSession().startSession(true);

			newSession().recordCompletion({ workflowId: 'wf-a', nodeId: 'node-1' });

			expect(readJournal()).toEqual({ streaks: {}, inFlight: {} });
		});

		it('does not write when the job has no streak', () => {
			newSession().recordCompletion({ workflowId: 'wf-a', nodeId: 'node-1' });

			expect(existsSync(journalPath())).toBe(false);
		});
	});

	describe('clearWorkflow', () => {
		it('ends the streaks of every job of the workflow', () => {
			crashWith(attempt('1', 'wf-a'), attempt('2', 'wf-a', 'node-2'), attempt('3', 'wf-b'));
			newSession().startSession(true);

			newSession().clearWorkflow('wf-a');

			expect(readJournal()).toEqual({
				streaks: { 'wf-b:node-1': { workflowId: 'wf-b', nodeId: 'node-1', crashes: 1 } },
				inFlight: {},
			});
		});
	});
});
