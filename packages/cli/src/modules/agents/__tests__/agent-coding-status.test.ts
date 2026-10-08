import { OperationalError } from 'n8n-workflow';

import {
	CODING_HEARTBEAT_STALE_SECONDS,
	codingProcessState,
	codingStatusFromFacts,
	isHeartbeatFresh,
	parseCodingBranches,
	parseCodingChanges,
	parseCodingSessionsOutput,
	parseCodingStatusOutput,
	parseExitCode,
	parseNumstatEntry,
	parseUncommittedPaths,
	type CodingGitFacts,
	type CodingMetaFacts,
	type CodingProcessFacts,
} from '../agent-coding-status';

const RUN = 'boot-a:4242';
const STALE_MS = CODING_HEARTBEAT_STALE_SECONDS * 1000;

function processFacts(overrides: Partial<CodingProcessFacts> = {}): CodingProcessFacts {
	return {
		pid: null,
		exit: null,
		stopped: null,
		started: null,
		heartbeatAgeMs: null,
		alive: false,
		...overrides,
	};
}

/** A process that this sandbox run started and that still runs. */
function runningProcess(overrides: Partial<CodingProcessFacts> = {}): CodingProcessFacts {
	return processFacts({
		pid: '4100',
		started: RUN,
		heartbeatAgeMs: 2_000,
		alive: true,
		...overrides,
	});
}

function gitFacts(overrides: Partial<CodingGitFacts> = {}): CodingGitFacts {
	return {
		branch: 'main\n',
		nameStatus: '',
		numstat: '',
		porcelain: '',
		untracked: [],
		...overrides,
	};
}

function metaFacts(
	processes: Partial<CodingMetaFacts['processes']> = {},
	overrides: Partial<Omit<CodingMetaFacts, 'processes'>> = {},
): CodingMetaFacts {
	return {
		stage: '',
		repoExists: true,
		appResponds: false,
		processes: { setup: processFacts(), app: processFacts(), check: processFacts(), ...processes },
		git: gitFacts(),
		...overrides,
	};
}

function status(
	processes: Partial<CodingMetaFacts['processes']> = {},
	overrides: Partial<Omit<CodingMetaFacts, 'processes'>> = {},
) {
	return codingStatusFromFacts(metaFacts(processes, overrides), RUN);
}

describe('parseExitCode', () => {
	it.each([
		['0', 0],
		[' 143\n', 143],
		['-1', -1],
		['124', 124],
	])('reads %j as %i', (text, code) => {
		expect(parseExitCode(text)).toBe(code);
	});

	it.each([null, '', '  ', 'abc', '1.5', '12abc'])('returns null for %j', (text) => {
		expect(parseExitCode(text)).toBeNull();
	});
});

describe('isHeartbeatFresh', () => {
	it.each([0, 1, STALE_MS, -5_000])('accepts an age of %i ms', (age) => {
		expect(isHeartbeatFresh(age)).toBe(true);
	});

	it.each([STALE_MS + 1, 10 * 60_000, null, Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects an age of %s ms',
		(age) => {
			expect(isHeartbeatFresh(age)).toBe(false);
		},
	);
});

describe('codingProcessState', () => {
	it('is idle when the process was never launched', () => {
		expect(codingProcessState(processFacts(), RUN)).toBe('idle');
	});

	it('is running when this sandbox run started it and the heartbeat is fresh', () => {
		expect(codingProcessState(runningProcess(), RUN)).toBe('running');
		expect(codingProcessState(runningProcess({ started: ` ${RUN}\n` }), RUN)).toBe('running');
	});

	it('prefers the exit code over every other fact', () => {
		const facts = runningProcess({ exit: '0', started: 'boot-b:1', stopped: 'stopped' });
		expect(codingProcessState(facts, RUN)).toBe('exited');
	});

	it('is stopped when the stop marker exists, also when it is empty', () => {
		expect(codingProcessState(runningProcess({ stopped: 'stopped' }), RUN)).toBe('stopped');
		expect(codingProcessState(runningProcess({ stopped: '' }), RUN)).toBe('stopped');
	});

	it('is restarted when another sandbox run started it', () => {
		expect(codingProcessState(runningProcess({ started: 'boot-b:4242' }), RUN)).toBe('restarted');
		expect(codingProcessState(runningProcess({ started: 'boot-a:9999' }), RUN)).toBe('restarted');
	});

	it('is restarted when the run marker is missing', () => {
		expect(codingProcessState(runningProcess({ started: null }), RUN)).toBe('restarted');
	});

	it('is lost when the process is gone', () => {
		expect(codingProcessState(runningProcess({ alive: false }), RUN)).toBe('lost');
	});

	it.each([STALE_MS + 1, null, Number.NaN])(
		'is lost when the heartbeat age is %s ms although the PID answers',
		(heartbeatAgeMs) => {
			expect(codingProcessState(runningProcess({ heartbeatAgeMs }), RUN)).toBe('lost');
		},
	);

	it('is not exited while the exit file is still empty', () => {
		expect(codingProcessState(runningProcess({ exit: '' }), RUN)).toBe('running');
	});
});

describe('codingStatusFromFacts phase', () => {
	it.each([
		['cloning', 'cloning'],
		['installing', 'installing'],
		['ready', 'ready'],
		[' cloning\n', 'cloning'],
		['', 'installing'],
		['unexpected', 'installing'],
	] as const)('shows stage %j as %s while setup runs', (stage, phase) => {
		expect(status({ setup: runningProcess() }, { stage }).phase).toBe(phase);
	});

	it('is ready after setup exits with 0', () => {
		const result = status({ setup: processFacts({ pid: '10', exit: '0' }) });
		expect(result.phase).toBe('ready');
		expect(result.setupExitCode).toBe(0);
	});

	it.each(['1', '143'])('is error after setup exits with %s', (exit) => {
		const result = status({ setup: processFacts({ pid: '10', exit }) });
		expect(result.phase).toBe('error');
		expect(result.setupExitCode).toBe(Number(exit));
	});

	it('is restarted, not ready, when the sandbox restarted during setup', () => {
		const setup = runningProcess({ started: 'boot-b:1', heartbeatAgeMs: 5 * 60_000 });
		const result = status({ setup }, { stage: 'installing', repoExists: true });
		expect(result.phase).toBe('restarted');
		expect(result.setupExitCode).toBeNull();
	});

	it('is stopped, not ready, when setup stopped without an exit code', () => {
		expect(status({ setup: runningProcess({ heartbeatAgeMs: STALE_MS * 4 }) }).phase).toBe(
			'stopped',
		);
		expect(status({ setup: runningProcess({ alive: false }) }).phase).toBe('stopped');
		expect(status({ setup: runningProcess({ stopped: 'stopped' }) }).phase).toBe('stopped');
	});

	it('is ready for a checkout without setup, and not started without a checkout', () => {
		expect(status({}, { repoExists: true }).phase).toBe('ready');
		expect(status({}, { repoExists: false }).phase).toBe('not_started');
	});
});

describe('codingStatusFromFacts app', () => {
	it('is running when the app runs and answers the probe', () => {
		expect(status({ app: runningProcess() }, { appResponds: true }).app).toBe('running');
	});

	it('is starting when the app runs but does not answer yet', () => {
		expect(status({ app: runningProcess() }, { appResponds: false }).app).toBe('starting');
	});

	it('is error when the app exits with a non-zero code by itself', () => {
		expect(status({ app: processFacts({ pid: '20', exit: '1' }) }).app).toBe('error');
	});

	it('is stopped when the app exits after a stop request', () => {
		const app = processFacts({ pid: '20', exit: '143', stopped: 'stopped' });
		expect(status({ app }).app).toBe('stopped');
	});

	it('is stopped when the app exits with 0', () => {
		expect(status({ app: processFacts({ pid: '20', exit: '0' }) }).app).toBe('stopped');
	});

	it('is stopped after a sandbox restart, also when a new process answers on the port', () => {
		const app = runningProcess({ started: 'boot-b:1' });
		expect(status({ app }, { appResponds: true }).app).toBe('stopped');
	});

	it('is stopped when the heartbeat is stale or the app never ran', () => {
		const app = runningProcess({ heartbeatAgeMs: STALE_MS + 1 });
		expect(status({ app }, { appResponds: true }).app).toBe('stopped');
		expect(status({}, { appResponds: true }).app).toBe('stopped');
	});
});

describe('codingStatusFromFacts check', () => {
	it('is running while the check runs', () => {
		expect(status({ check: runningProcess() }).check).toBe('running');
	});

	it('is passed or failed from the exit code', () => {
		expect(status({ check: processFacts({ pid: '30', exit: '0' }) }).check).toBe('passed');
		const failed = status({ check: processFacts({ pid: '30', exit: '124' }) });
		expect(failed.check).toBe('failed');
		expect(failed.checkExitCode).toBe(124);
	});

	it('is stopped when the check did not finish', () => {
		expect(status({ check: runningProcess({ started: 'boot-b:1' }) }).check).toBe('stopped');
		expect(status({ check: runningProcess({ alive: false }) }).check).toBe('stopped');
		expect(status({ check: runningProcess({ heartbeatAgeMs: null }) }).check).toBe('stopped');
	});

	it('is not started when no check ran', () => {
		const result = status();
		expect(result.check).toBe('not_started');
		expect(result.checkExitCode).toBeNull();
	});
});

describe('parseNumstatEntry', () => {
	it('reads additions, deletions and the path', () => {
		expect(parseNumstatEntry('12\t3\tsrc/app.ts')).toEqual({
			path: 'src/app.ts',
			additions: 12,
			deletions: 3,
		});
	});

	it('keeps tabs in the path', () => {
		expect(parseNumstatEntry('1\t0\ta\tb.txt')?.path).toBe('a\tb.txt');
	});

	it('counts values that are not whole numbers as 0', () => {
		expect(parseNumstatEntry('1x\tx2\tapp.txt')).toEqual({
			path: 'app.txt',
			additions: 0,
			deletions: 0,
		});
	});

	it('counts binary files as 0', () => {
		expect(parseNumstatEntry('-\t-\timage.png')).toEqual({
			path: 'image.png',
			additions: 0,
			deletions: 0,
		});
	});

	it.each(['', 'app.txt', '1\tapp.txt'])('ignores the incomplete entry %j', (entry) => {
		expect(parseNumstatEntry(entry)).toBeUndefined();
	});
});

describe('parseCodingChanges', () => {
	it('merges status and line counts for each changed file', () => {
		const git = gitFacts({
			nameStatus: 'M\0app.txt\0D\0gone.txt\0A\0image.png\0',
			numstat: '1\t1\tapp.txt\0' + '0\t3\tgone.txt\0' + '-\t-\timage.png\0' + '5\t5\tunknown.txt\0',
		});
		expect(parseCodingChanges(git)).toEqual([
			{ path: 'app.txt', status: 'M', additions: 1, deletions: 1 },
			{ path: 'gone.txt', status: 'D', additions: 0, deletions: 3 },
			{ path: 'image.png', status: 'A', additions: 0, deletions: 0 },
		]);
	});

	it('adds untracked files and lets them replace a diff entry for the same path', () => {
		const git = gitFacts({
			nameStatus: 'M\0twice.txt\0',
			numstat: '2\t2\ttwice.txt\0',
			untracked: [
				{ path: 'new file.txt', additions: 1 },
				{ path: 'twice.txt', additions: 7 },
			],
		});
		expect(parseCodingChanges(git)).toEqual([
			{ path: 'new file.txt', status: '??', additions: 1, deletions: 0 },
			{ path: 'twice.txt', status: '??', additions: 7, deletions: 0 },
		]);
	});

	it('sorts paths by code point, not by UTF-16 unit or locale', () => {
		const paths = ['😀.txt', '�.txt', 'é.txt', 'b.txt', 'a.txt', 'B.txt'];
		const git = gitFacts({ untracked: paths.map((path) => ({ path, additions: 0 })) });
		expect(parseCodingChanges(git).map((change) => change.path)).toEqual([
			'B.txt',
			'a.txt',
			'b.txt',
			'é.txt',
			'�.txt',
			'😀.txt',
		]);
	});

	it('skips a final status that has no path, for example in cut output', () => {
		const git = gitFacts({ nameStatus: 'M\0app.txt\0D', numstat: '1\t1\tapp.txt\0' });
		expect(parseCodingChanges(git)).toEqual([
			{ path: 'app.txt', status: 'M', additions: 1, deletions: 1 },
		]);
		expect(parseCodingChanges(gitFacts({ nameStatus: 'M\0\0' }))).toEqual([]);
	});

	it('returns no changes for empty output', () => {
		expect(parseCodingChanges(gitFacts())).toEqual([]);
	});
});

describe('parseUncommittedPaths', () => {
	it('reads paths from porcelain entries', () => {
		expect(parseUncommittedPaths(' M app.txt\0?? new file.txt\0D  gone.txt\0')).toEqual([
			'app.txt',
			'new file.txt',
			'gone.txt',
		]);
	});

	it('returns no paths for a clean checkout', () => {
		expect(parseUncommittedPaths('')).toEqual([]);
	});

	it('counts each entry once in the status', () => {
		const result = status({}, { git: gitFacts({ porcelain: ' M a\0?? b\0' }) });
		expect(result.uncommittedChanges).toBe(2);
		expect(result.uncommittedPaths).toEqual(['a', 'b']);
		expect(result.branch).toBe('main');
	});
});

describe('parseCodingBranches', () => {
	it('lists local and remote branches without origin/HEAD', () => {
		expect(parseCodingBranches('main\nfeature/x\norigin/HEAD\norigin/main\n')).toEqual([
			'main',
			'feature/x',
			'origin/main',
		]);
	});

	it('accepts CRLF line ends and empty output', () => {
		expect(parseCodingBranches('main\r\ndev\r\n')).toEqual(['main', 'dev']);
		expect(parseCodingBranches('')).toEqual([]);
	});

	it('leaves out an alias, so the bare remote name does not show as a branch', () => {
		const output = [
			'agent/due-dates\t',
			'main\t',
			'origin\trefs/remotes/origin/main',
			'origin/main\t',
			'',
		].join('\n');
		expect(parseCodingBranches(output)).toEqual(['agent/due-dates', 'main', 'origin/main']);
	});

	it('keeps a local branch that git prints as heads/origin and leaves out its alias', () => {
		const output = 'heads/origin\t\norigin/HEAD\trefs/remotes/origin/main\norigin/main\t\n';
		expect(parseCodingBranches(output)).toEqual(['heads/origin', 'origin/main']);
	});

	it.each([
		['an alias with CRLF line ends', 'main\t\r\norigin\trefs/remotes/origin/main\r\n', ['main']],
		['a line without a name', '\t\n\trefs/heads/main\nmain\t\n', ['main']],
		['origin/HEAD that is not an alias', 'origin/HEAD\t\norigin/main\t\n', ['origin/main']],
		['a name without a tab at the end', 'main\t\ndev', ['main', 'dev']],
	])('handles %s', (_case, output, expected) => {
		expect(parseCodingBranches(output)).toEqual(expected);
	});
});

describe('parseCodingStatusOutput', () => {
	it('classifies the facts with the run id of the same output', () => {
		const output = JSON.stringify({
			incarnation: RUN,
			status: metaFacts({ app: runningProcess() }, { appResponds: true }),
		});
		expect(parseCodingStatusOutput(output)).toMatchObject({ phase: 'ready', app: 'running' });
	});

	it('keeps untracked files with their line counts', () => {
		const git = gitFacts({ untracked: [{ path: 'new file.txt', additions: 3 }] });
		const output = JSON.stringify({ incarnation: RUN, status: metaFacts({}, { git }) });
		expect(parseCodingStatusOutput(output).changes).toEqual([
			{ path: 'new file.txt', status: '??', additions: 3, deletions: 0 },
		]);
	});

	it('keeps the parse failure as the cause of the error', () => {
		const error = (() => {
			try {
				parseCodingStatusOutput('not json');
			} catch (caught) {
				return caught;
			}
			return undefined;
		})();
		expect(error).toBeInstanceOf(OperationalError);
		expect((error as OperationalError).cause).toBeInstanceOf(SyntaxError);
	});

	it.each(['', 'not json', '{"incarnation":"x"}', '{"incarnation":1,"status":{}}'])(
		'throws an operational error for the output %j',
		(output) => {
			expect(() => parseCodingStatusOutput(output)).toThrow(OperationalError);
			expect(() => parseCodingStatusOutput(output)).toThrow('cannot be read');
		},
	);
});

describe('parseCodingSessionsOutput', () => {
	it('adds the classified status to each session and parses the branches', () => {
		const session = { id: 'b0f2d2a8-5ab8-4d3c-9d6a-2c0f8a0d4c11', name: 'First', original: false };
		const output = JSON.stringify({
			incarnation: RUN,
			sessions: [{ session, status: metaFacts({ setup: runningProcess({ started: 'old:1' }) }) }],
			branches: 'main\norigin/HEAD\n',
		});
		const result = parseCodingSessionsOutput(output);
		expect(result.branches).toEqual(['main']);
		expect(result.sessions).toHaveLength(1);
		expect(result.sessions[0]).toMatchObject({ ...session, status: { phase: 'restarted' } });
	});

	it('throws an operational error when a session is not an object', () => {
		const output = JSON.stringify({
			incarnation: RUN,
			sessions: [{ session: 'x', status: metaFacts() }],
			branches: '',
		});
		expect(() => parseCodingSessionsOutput(output)).toThrow(OperationalError);
	});
});
