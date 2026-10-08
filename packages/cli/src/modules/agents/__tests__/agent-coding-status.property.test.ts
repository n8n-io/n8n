import { AgentCodingStatusSchema } from '@n8n/api-types';
import fc from 'fast-check';

import {
	CODING_HEARTBEAT_STALE_SECONDS,
	codingProcessState,
	codingStatusFromFacts,
	isHeartbeatFresh,
	parseCodingChanges,
	type CodingMetaFacts,
	type CodingProcessFacts,
} from '../agent-coding-status';

const STALE_MS = CODING_HEARTBEAT_STALE_SECONDS * 1000;

// Small pools make equal and unequal run ids both common.
const runArb = fc.constantFrom('boot-a:1', 'boot-a:2', 'boot-b:1', ':', '');

const textArb = fc.oneof(
	fc.constant(null),
	fc.constant(''),
	fc.constantFrom('0', '1', '124', '143', ' 0\n', '-1', 'abc', '12abc'),
	fc.string(),
);

const ageArb = fc.oneof(
	fc.constant(null),
	fc.constant(Number.NaN),
	fc.constant(Number.POSITIVE_INFINITY),
	fc.integer({ min: -STALE_MS, max: STALE_MS * 3 }),
	fc.double(),
);

const staleAgeArb = fc.oneof(
	fc.constant(null),
	fc.constant(Number.NaN),
	fc.constant(Number.POSITIVE_INFINITY),
	fc.integer({ min: STALE_MS + 1, max: STALE_MS * 100 }),
	fc.double({ min: STALE_MS + 0.001, noNaN: true }),
);

const processArb: fc.Arbitrary<CodingProcessFacts> = fc.record({
	pid: textArb,
	exit: textArb,
	stopped: fc.oneof(fc.constant(null), fc.constant(''), fc.constant('stopped')),
	started: fc.oneof(fc.constant(null), runArb),
	heartbeatAgeMs: ageArb,
	alive: fc.boolean(),
});

// Git prints well-formed UTF-8 paths without NUL bytes. A small shared pool makes repeated paths common.
const pathArb = fc.oneof(
	fc.constantFrom('app.txt', 'B.txt', 'é.txt', '😀.txt', 'a\tb.txt'),
	fc
		.string({ unit: 'binary', minLength: 1, maxLength: 12 })
		.map((path) => path.replaceAll('\0', '_')),
);

const nameStatusArb = fc
	.array(fc.tuple(fc.constantFrom('M', 'A', 'D', 'T'), pathArb), { maxLength: 6 })
	.map((entries) => entries.map(([status, path]) => `${status}\0${path}\0`).join(''));

const countArb = fc.oneof(fc.nat({ max: 500 }).map(String), fc.constant('-'));

const numstatArb = fc
	.array(fc.tuple(countArb, countArb, pathArb), { maxLength: 6 })
	.map((entries) =>
		entries.map(([added, deleted, path]) => `${added}\t${deleted}\t${path}\0`).join(''),
	);

const metaArb: fc.Arbitrary<CodingMetaFacts> = fc.record({
	stage: fc.oneof(fc.constantFrom('', 'cloning', 'installing', 'ready'), fc.string()),
	repoExists: fc.boolean(),
	appResponds: fc.boolean(),
	processes: fc.record({ setup: processArb, app: processArb, check: processArb }),
	git: fc.record({
		branch: fc.string(),
		nameStatus: fc.oneof(nameStatusArb, fc.string()),
		numstat: fc.oneof(numstatArb, fc.string()),
		porcelain: fc.string(),
		untracked: fc.array(fc.record({ path: pathArb, additions: fc.nat() }), { maxLength: 5 }),
	}),
});

/** Launched in some run, with no exit code and no stop marker yet. */
function unfinished(facts: CodingProcessFacts): CodingProcessFacts {
	return { ...facts, pid: facts.pid ?? '4100', exit: null, stopped: null };
}

describe('codingStatusFromFacts properties', () => {
	it('returns a status that matches the API schema and never throws', () => {
		fc.assert(
			fc.property(metaArb, runArb, (facts, run) => {
				expect(AgentCodingStatusSchema.safeParse(codingStatusFromFacts(facts, run)).success).toBe(
					true,
				);
			}),
		);
	});

	it('never reports ready while setup has a stale heartbeat and no exit code', () => {
		fc.assert(
			fc.property(metaArb, runArb, staleAgeArb, (facts, run, heartbeatAgeMs) => {
				const setup = { ...unfinished(facts.processes.setup), heartbeatAgeMs };
				const result = codingStatusFromFacts(
					{ ...facts, processes: { ...facts.processes, setup } },
					run,
				);
				expect(['stopped', 'restarted']).toContain(result.phase);
			}),
		);
	});

	it('never reports a running app or check while its heartbeat is stale', () => {
		fc.assert(
			fc.property(metaArb, runArb, staleAgeArb, (facts, run, heartbeatAgeMs) => {
				const app = { ...facts.processes.app, heartbeatAgeMs };
				const check = { ...facts.processes.check, heartbeatAgeMs };
				const result = codingStatusFromFacts(
					{ ...facts, processes: { ...facts.processes, app, check } },
					run,
				);
				expect(['starting', 'running']).not.toContain(result.app);
				expect(result.check).not.toBe('running');
			}),
		);
	});

	it('reports restarted for setup that another sandbox run started', () => {
		fc.assert(
			fc.property(metaArb, runArb, runArb, (facts, run, other) => {
				fc.pre(other !== run);
				const setup = { ...unfinished(facts.processes.setup), started: other };
				const result = codingStatusFromFacts(
					{ ...facts, processes: { ...facts.processes, setup } },
					run,
				);
				expect(result.phase).toBe('restarted');
			}),
		);
	});

	it('trusts an exit code of 0 over every other setup fact', () => {
		fc.assert(
			fc.property(metaArb, runArb, (facts, run) => {
				const setup = { ...facts.processes.setup, exit: '0' };
				const result = codingStatusFromFacts(
					{ ...facts, processes: { ...facts.processes, setup } },
					run,
				);
				expect(result.phase).toBe('ready');
				expect(result.setupExitCode).toBe(0);
			}),
		);
	});
});

describe('codingProcessState properties', () => {
	it('is running only for a live process of this run with a fresh heartbeat', () => {
		fc.assert(
			fc.property(processArb, runArb, (facts, run) => {
				if (codingProcessState(facts, run) !== 'running') return;
				expect(facts.alive).toBe(true);
				expect(facts.started?.trim()).toBe(run);
				expect(isHeartbeatFresh(facts.heartbeatAgeMs)).toBe(true);
				expect(facts.stopped).toBeNull();
			}),
		);
	});
});

describe('parseCodingChanges properties', () => {
	it('keeps the line counts of numstat for every changed path', () => {
		fc.assert(
			fc.property(nameStatusArb, numstatArb, (nameStatus, numstat) => {
				const changes = parseCodingChanges({
					branch: '',
					nameStatus,
					numstat,
					porcelain: '',
					untracked: [],
				});
				const counted = new Map<string, [number, number]>();
				for (const entry of numstat.split('\0').filter(Boolean)) {
					const [added, deleted, ...path] = entry.split('\t');
					const toCount = (value: string) => (value === '-' ? 0 : Number(value));
					counted.set(path.join('\t'), [toCount(added), toCount(deleted)]);
				}
				for (const change of changes) {
					const [additions, deletions] = counted.get(change.path) ?? [0, 0];
					expect(change).toMatchObject({ additions, deletions });
				}
			}),
		);
	});

	it('lists each path once, in code point order', () => {
		fc.assert(
			fc.property(metaArb, (facts) => {
				const paths = parseCodingChanges(facts.git).map((change) => change.path);
				expect(new Set(paths).size).toBe(paths.length);
				const codePoints = (path: string) => Array.from(path, (char) => char.codePointAt(0) ?? 0);
				for (let index = 1; index < paths.length; index++) {
					const left = codePoints(paths[index - 1]);
					const right = codePoints(paths[index]);
					const firstDifference = left.findIndex((point, offset) => point !== right[offset]);
					if (firstDifference === -1) expect(left.length).toBeLessThan(right.length);
					else if (firstDifference < right.length)
						expect(left[firstDifference]).toBeLessThan(right[firstDifference]);
					else expect.unreachable('a longer path sorts after its prefix');
				}
			}),
		);
	});

	it('marks every untracked file as untracked with its line count', () => {
		fc.assert(
			fc.property(metaArb, (facts) => {
				const changes = new Map(
					parseCodingChanges(facts.git).map((change) => [change.path, change]),
				);
				for (const file of facts.git.untracked) {
					const last = facts.git.untracked.filter((item) => item.path === file.path).at(-1);
					expect(changes.get(file.path)).toEqual({
						path: file.path,
						status: '??',
						additions: last?.additions,
						deletions: 0,
					});
				}
			}),
		);
	});
});
