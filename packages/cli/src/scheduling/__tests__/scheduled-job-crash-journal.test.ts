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

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'scheduled-job-crash-journal-'));
		crashJournal.file = join(dir, 'crash.journal');
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	describe('recordCrash', () => {
		it('starts a streak for each job in flight at the crash', () => {
			const streaks = newSession().recordCrash([
				attempt('1', 'wf-a'),
				attempt('2', 'wf-b', 'node-2'),
			]);

			expect(streaks).toEqual([
				{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 },
				{ workflowId: 'wf-b', nodeId: 'node-2', crashes: 1 },
			]);
			expect(readJournal()).toEqual({
				streaks: {
					'wf-a:node-1': { workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 },
					'wf-b:node-2': { workflowId: 'wf-b', nodeId: 'node-2', crashes: 1 },
				},
				counted: ['1:1', '2:1'],
			});
		});

		it('extends the streak across sessions', () => {
			newSession().recordCrash([attempt('1', 'wf-a')]);
			newSession().recordCrash([attempt('2', 'wf-a')]);

			const streaks = newSession().recordCrash([attempt('3', 'wf-a')]);

			expect(streaks).toEqual([{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 3 }]);
		});

		it('counts a job once per crash when several of its occurrences are in flight', () => {
			const streaks = newSession().recordCrash([attempt('1', 'wf-a'), attempt('2', 'wf-a')]);

			expect(streaks).toEqual([{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 }]);
		});

		it('does not count an attempt again while the reaper has not recovered it', () => {
			newSession().recordCrash([attempt('1', 'wf-a')]);

			const streaks = newSession().recordCrash([attempt('1', 'wf-a')]);

			expect(streaks).toEqual([]);
			expect(readJournal()).toEqual({ streaks: {}, counted: ['1:1'] });
		});

		it('counts a recovered attempt that ran again under a new lease', () => {
			newSession().recordCrash([attempt('1', 'wf-a')]);

			const streaks = newSession().recordCrash([attempt('1', 'wf-a', 'node-1', 2)]);

			expect(streaks).toEqual([{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 2 }]);
		});

		it('ends the streak of a job that was not in flight at the latest crash', () => {
			newSession().recordCrash([attempt('1', 'wf-a')]);
			newSession().recordCrash([attempt('2', 'wf-b')]);

			const streaks = newSession().recordCrash([attempt('3', 'wf-a')]);

			expect(streaks).toEqual([{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 }]);
		});

		it('ignores an attempt whose payload names no workflow and node', () => {
			const streaks = newSession().recordCrash([
				{ id: '1', leaseEpoch: 1, payload: { kind: 'system' } },
			]);

			expect(streaks).toEqual([]);
		});

		it('starts over from a corrupt file', () => {
			writeFileSync(journalPath(), '{"streaks":1}');

			const streaks = newSession().recordCrash([attempt('1', 'wf-a')]);

			expect(streaks).toEqual([{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 }]);
		});
	});

	describe('recordCompletion', () => {
		it('ends the streak of the job', () => {
			newSession().recordCrash([attempt('1', 'wf-a')]);

			newSession().recordCompletion({ workflowId: 'wf-a', nodeId: 'node-1' });

			expect(readJournal()).toEqual({ streaks: {}, counted: ['1:1'] });
			const streaks = newSession().recordCrash([attempt('2', 'wf-a')]);
			expect(streaks).toEqual([{ workflowId: 'wf-a', nodeId: 'node-1', crashes: 1 }]);
		});

		it('does not write when the job has no streak', () => {
			newSession().recordCompletion({ workflowId: 'wf-a', nodeId: 'node-1' });

			expect(existsSync(journalPath())).toBe(false);
		});
	});
});
