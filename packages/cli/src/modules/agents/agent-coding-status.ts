import type { AgentCodingStatus } from '@n8n/api-types';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

/** A launched script touches its heartbeat file at this interval. */
export const CODING_HEARTBEAT_INTERVAL_SECONDS = 5;

/**
 * A heartbeat older than this means that the process stopped without an exit code, for example
 * after an idle stop. Six missed beats give a busy sandbox enough time.
 */
export const CODING_HEARTBEAT_STALE_SECONDS = 30;

// Raw file contents and probes that the sandbox facts script prints. All decisions are made here.
const CodingProcessFactsSchema = z.object({
	pid: z.string().nullable(),
	exit: z.string().nullable(),
	stopped: z.string().nullable(),
	started: z.string().nullable(),
	heartbeatAgeMs: z.number().nullable(),
	alive: z.boolean(),
});
export type CodingProcessFacts = z.infer<typeof CodingProcessFactsSchema>;

const CodingGitFactsSchema = z.object({
	branch: z.string(),
	nameStatus: z.string(),
	numstat: z.string(),
	porcelain: z.string(),
	untracked: z.array(z.object({ path: z.string(), additions: z.number().int().nonnegative() })),
});
export type CodingGitFacts = z.infer<typeof CodingGitFactsSchema>;

const CodingMetaFactsSchema = z.object({
	stage: z.string(),
	repoExists: z.boolean(),
	appResponds: z.boolean(),
	processes: z.object({
		setup: CodingProcessFactsSchema,
		app: CodingProcessFactsSchema,
		check: CodingProcessFactsSchema,
	}),
	git: CodingGitFactsSchema,
});
export type CodingMetaFacts = z.infer<typeof CodingMetaFactsSchema>;

const CodingStatusOutputSchema = z.object({
	incarnation: z.string(),
	status: CodingMetaFactsSchema,
});

const CodingSessionsOutputSchema = z.object({
	incarnation: z.string(),
	sessions: z.array(z.object({ session: z.record(z.unknown()), status: CodingMetaFactsSchema })),
	branches: z.string(),
});

/**
 * - idle: never launched.
 * - exited: wrote an exit code.
 * - stopped: a user stopped it.
 * - restarted: launched before the sandbox last restarted, so the process is gone and its PID can
 *   belong to another process.
 * - lost: launched in this sandbox run, but the process is gone or its heartbeat is stale.
 */
export type CodingProcessState = 'idle' | 'running' | 'exited' | 'stopped' | 'lost' | 'restarted';

type Change = AgentCodingStatus['changes'][number];

export function parseExitCode(text: string | null): number | null {
	const value = text?.trim() ?? '';
	return /^-?\d+$/.test(value) ? Number(value) : null;
}

export function isHeartbeatFresh(ageMs: number | null): boolean {
	return ageMs !== null && Number.isFinite(ageMs) && ageMs <= CODING_HEARTBEAT_STALE_SECONDS * 1000;
}

export function codingProcessState(
	facts: CodingProcessFacts,
	incarnation: string,
): CodingProcessState {
	if (parseExitCode(facts.exit) !== null) return 'exited';
	if (facts.stopped !== null) return 'stopped';
	if (facts.pid === null) return 'idle';
	if (facts.started?.trim() !== incarnation) return 'restarted';
	return facts.alive && isHeartbeatFresh(facts.heartbeatAgeMs) ? 'running' : 'lost';
}

function setupPhase(
	state: CodingProcessState,
	exitCode: number | null,
	facts: CodingMetaFacts,
): AgentCodingStatus['phase'] {
	const stage = facts.stage.trim();
	switch (state) {
		case 'running':
			return stage === 'cloning' || stage === 'ready' ? stage : 'installing';
		case 'exited':
			return exitCode === 0 ? 'ready' : 'error';
		case 'restarted':
			return 'restarted';
		case 'idle':
			// A checkout that this service did not set up (for example the original one) is ready.
			return facts.repoExists ? 'ready' : 'not_started';
		default:
			return 'stopped';
	}
}

function appState(state: CodingProcessState, facts: CodingMetaFacts): AgentCodingStatus['app'] {
	if (state === 'running') return facts.appResponds ? 'running' : 'starting';
	const app = facts.processes.app;
	// A stop sends SIGTERM, so a non-zero exit code after a stop is not an error.
	if (state === 'exited' && parseExitCode(app.exit) !== 0 && app.stopped === null) return 'error';
	return 'stopped';
}

function checkState(
	state: CodingProcessState,
	exitCode: number | null,
): AgentCodingStatus['check'] {
	switch (state) {
		case 'running':
			return 'running';
		case 'exited':
			return exitCode === 0 ? 'passed' : 'failed';
		case 'idle':
			return 'not_started';
		default:
			return 'stopped';
	}
}

function count(value: string): number {
	return /^\d+$/.test(value) ? Number(value) : 0;
}

/** Reads one `git diff --numstat -z` entry. Binary files show '-' and count as 0. */
export function parseNumstatEntry(
	entry: string,
): { path: string; additions: number; deletions: number } | undefined {
	const first = entry.indexOf('\t');
	// Without a first tab the search from index 0 also finds none.
	const second = entry.indexOf('\t', first + 1);
	if (second === -1) return undefined;
	return {
		path: entry.slice(second + 1),
		additions: count(entry.slice(0, first)),
		deletions: count(entry.slice(first + 1, second)),
	};
}

// UTF-8 byte order is code point order, which keeps the order stable for every file name.
function byPath(left: Change, right: Change): number {
	return Buffer.compare(Buffer.from(left.path), Buffer.from(right.path));
}

export function parseCodingChanges(git: CodingGitFacts): Change[] {
	const changes = new Map<string, Change>();
	const entries = git.nameStatus.split('\0');
	for (let index = 0; index < entries.length; index++) {
		const status = entries[index];
		if (!status) continue;
		index++;
		const path = entries[index];
		// Output cut after a status has no path. Skip that entry.
		if (!path) continue;
		changes.set(path, { path, status, additions: 0, deletions: 0 });
	}
	for (const entry of git.numstat.split('\0')) {
		const stats = parseNumstatEntry(entry);
		const change = stats && changes.get(stats.path);
		if (!stats || !change) continue;
		change.additions = stats.additions;
		change.deletions = stats.deletions;
	}
	for (const file of git.untracked) {
		changes.set(file.path, {
			path: file.path,
			status: '??',
			additions: file.additions,
			deletions: 0,
		});
	}
	return [...changes.values()].sort(byPath);
}

/** Reads `git status --porcelain=v1 -z --no-renames` output. Each entry is "XY path". */
export function parseUncommittedPaths(porcelain: string): string[] {
	return porcelain
		.split('\0')
		.filter((entry) => entry)
		.map((entry) => entry.slice(3));
}

export function parseCodingBranches(output: string): string[] {
	return output.split(/\r?\n/).filter((branch) => branch && branch !== 'origin/HEAD');
}

export function codingStatusFromFacts(
	facts: CodingMetaFacts,
	incarnation: string,
): AgentCodingStatus {
	const { setup, app, check } = facts.processes;
	const setupExitCode = parseExitCode(setup.exit);
	const checkExitCode = parseExitCode(check.exit);
	const uncommittedPaths = parseUncommittedPaths(facts.git.porcelain);
	return {
		phase: setupPhase(codingProcessState(setup, incarnation), setupExitCode, facts),
		branch: facts.git.branch.trim(),
		changes: parseCodingChanges(facts.git),
		uncommittedChanges: uncommittedPaths.length,
		uncommittedPaths,
		app: appState(codingProcessState(app, incarnation), facts),
		check: checkState(codingProcessState(check, incarnation), checkExitCode),
		setupExitCode,
		checkExitCode,
	};
}

function parseOutput<T>(schema: z.ZodType<T>, stdout: string): T {
	try {
		return schema.parse(JSON.parse(stdout));
	} catch (cause) {
		throw new OperationalError('The sandbox returned a coding status that cannot be read', {
			cause,
		});
	}
}

export function parseCodingStatusOutput(stdout: string): AgentCodingStatus {
	const output = parseOutput(CodingStatusOutputSchema, stdout);
	return codingStatusFromFacts(output.status, output.incarnation);
}

/** Session fields stay unchecked here. The service checks them with AgentCodingSessionSchema. */
export function parseCodingSessionsOutput(stdout: string) {
	const output = parseOutput(CodingSessionsOutputSchema, stdout);
	return {
		sessions: output.sessions.map((entry) => ({
			...entry.session,
			status: codingStatusFromFacts(entry.status, output.incarnation),
		})),
		branches: parseCodingBranches(output.branches),
	};
}
