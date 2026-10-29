import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { didLastSessionCrash, journalFile } from '@/crash-journal';

export type GuardAction = 'none' | 'hold' | 'stop';

const GUARD_ACTIONS: readonly GuardAction[] = ['none', 'hold', 'stop'];

const guardJournalFile = () => `${journalFile}.memory-guard`;

/** Call when the guard stays off, so that the next session does not count a crash of this one by an older action. */
export function removeMemoryGuardJournal() {
	try {
		rmSync(guardJournalFile(), { force: true });
	} catch {}
}

interface JournalState {
	/** The strongest action since memory was last low. */
	action: GuardAction;
	/** Crashes so far, by the action at the time of each crash. */
	crashes: Record<GuardAction, number>;
}

/**
 * Keeps the memory guard action in a file next to the crash journal. An OOM kill resets
 * the guard metrics, so the next session counts the crash by the action in the file. The
 * file also keeps the crash totals, so the crash counter only grows across restarts.
 */
@Service()
export class MemoryGuardJournal {
	private readonly file = guardJournalFile();

	private readonly state: JournalState;

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('memory-guard');

		const previous = this.read();
		this.state = { action: 'none', crashes: previous?.crashes ?? { none: 0, hold: 0, stop: 0 } };
		// Without a file, the last session ran without the guard, so its crash says nothing about the guard.
		if (previous && didLastSessionCrash()) this.state.crashes[previous.action]++;
		this.write();
	}

	get crashes(): Readonly<Record<GuardAction, number>> {
		return this.state.crashes;
	}

	/** A stop stays recorded over a later hold, until `reset()`. */
	record(action: 'hold' | 'stop') {
		if (this.state.action === 'stop' || this.state.action === action) return;
		this.state.action = action;
		this.write();
	}

	/** Call when memory is low again, so that a later crash does not count an old action. */
	reset() {
		if (this.state.action === 'none') return;
		this.state.action = 'none';
		this.write();
	}

	private read(): JournalState | undefined {
		try {
			const parsed: unknown = JSON.parse(readFileSync(this.file, 'utf8'));
			return isJournalState(parsed) ? parsed : undefined;
		} catch {
			return undefined;
		}
	}

	/** Synchronous, so that the action is on disk before a kill, which can come at any moment. */
	private write() {
		try {
			// A rename replaces the file in one step, so a kill during the write cannot corrupt it.
			writeFileSync(`${this.file}.tmp`, JSON.stringify(this.state));
			renameSync(`${this.file}.tmp`, this.file);
		} catch (error) {
			this.logger.debug('Failed to write the memory guard journal', { error: ensureError(error) });
		}
	}
}

function isGuardAction(value: unknown): value is GuardAction {
	return GUARD_ACTIONS.some((action) => action === value);
}

function isJournalState(value: unknown): value is JournalState {
	if (!isRecord(value) || !isGuardAction(value.action) || !isRecord(value.crashes)) return false;
	const { crashes } = value;
	return GUARD_ACTIONS.every((action) => typeof crashes[action] === 'number');
}
