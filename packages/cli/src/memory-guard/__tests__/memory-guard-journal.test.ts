import { mockLogger } from '@n8n/backend-test-utils';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { MemoryGuardJournal, removeMemoryGuardJournal } from '../memory-guard-journal';

const crashJournal = vi.hoisted(() => ({ file: '', crashed: false }));

vi.mock('@/crash-journal', () => ({
	get journalFile() {
		return crashJournal.file;
	},
	didLastSessionCrash: () => crashJournal.crashed,
}));

describe('MemoryGuardJournal', () => {
	let dir: string;

	const guardFile = () => `${crashJournal.file}.memory-guard`;
	const readGuardFile = (): unknown => JSON.parse(readFileSync(guardFile(), 'utf8'));
	const newSession = ({ crashed }: { crashed: boolean }) => {
		crashJournal.crashed = crashed;
		return new MemoryGuardJournal(mockLogger());
	};

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'memory-guard-journal-'));
		crashJournal.file = join(dir, 'crash.journal');
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it('should not count a crash of a session that ran without the guard', () => {
		const journal = newSession({ crashed: true });

		expect(journal.crashes).toEqual({ none: 0, hold: 0, stop: 0 });
		expect(readGuardFile()).toEqual({ action: 'none', crashes: { none: 0, hold: 0, stop: 0 } });
	});

	it('should count a crash by the action of the last session', () => {
		newSession({ crashed: false }).record('stop');

		const journal = newSession({ crashed: true });

		expect(journal.crashes).toEqual({ none: 0, hold: 0, stop: 1 });
	});

	it('should keep the totals across sessions', () => {
		newSession({ crashed: false }).record('stop');
		newSession({ crashed: true }).record('stop');
		newSession({ crashed: true }).record('hold');
		newSession({ crashed: true });

		const journal = newSession({ crashed: true });

		expect(journal.crashes).toEqual({ none: 1, hold: 1, stop: 2 });
	});

	it('should count nothing when the last session shut down cleanly', () => {
		newSession({ crashed: false }).record('stop');

		const journal = newSession({ crashed: false });

		expect(journal.crashes).toEqual({ none: 0, hold: 0, stop: 0 });
		expect(readGuardFile()).toEqual({ action: 'none', crashes: { none: 0, hold: 0, stop: 0 } });
	});

	it('should keep a stop recorded over a later hold until a reset', () => {
		const journal = newSession({ crashed: false });

		journal.record('stop');
		journal.record('hold');
		expect(readGuardFile()).toMatchObject({ action: 'stop' });

		journal.reset();
		expect(readGuardFile()).toMatchObject({ action: 'none' });

		journal.record('hold');
		expect(readGuardFile()).toMatchObject({ action: 'hold' });
	});

	it('should treat an unreadable file as a session without the guard', () => {
		writeFileSync(guardFile(), '{"action":"stop"');

		const journal = newSession({ crashed: true });

		expect(journal.crashes).toEqual({ none: 0, hold: 0, stop: 0 });
	});

	it('should leave only the journal file after a write', () => {
		newSession({ crashed: false }).record('stop');

		expect(readdirSync(dir)).toEqual(['crash.journal.memory-guard']);
	});

	it('should not count a crash of a session that removed the file because the guard stayed off', () => {
		newSession({ crashed: false }).record('stop');
		removeMemoryGuardJournal();
		expect(existsSync(guardFile())).toBe(false);

		const journal = newSession({ crashed: true });

		expect(journal.crashes).toEqual({ none: 0, hold: 0, stop: 0 });
	});
});
