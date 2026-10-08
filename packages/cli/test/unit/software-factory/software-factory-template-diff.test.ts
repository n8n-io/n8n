import fc from 'fast-check';
import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { binaryDiff, changesOf, sha256Of, unifiedDiff, type DiffFile } from './factory-pack-diffs';
import {
	configured,
	earlierNodes,
	FAILING_TEST_FILE,
	ticketOutput,
	workflow,
} from './factory-pack-fixtures';

/**
 * The diff gates. "Check the diff" stops a diff that does not show every changed file before the
 * critic. "Compare with approved change" repeats the same rule for the diff after Minimise.
 */

const READY = 0;
const NOT_READY = 1;
const NO_RESULT = 'fallback';

const diffFacts = z
	.array(
		z.object({ json: z.object({ diffProblems: z.array(z.string()), testListed: z.boolean() }) }),
	)
	.length(1);

/** The problems that "Check the diff" finds in the result of Get diff. */
function problemsOf(structuredContent: IDataObject): string[] {
	return checkedDiffOf(structuredContent).diffProblems;
}

/** The facts that "Check the diff" gives "Has a diff?" for the result of Get diff. */
function checkedDiffOf(structuredContent: IDataObject) {
	const item = configured.runCode('Check the diff', {
		json: { structuredContent },
		nodes: { 'Draft failing test': earlierNodes['Draft failing test'] },
	});
	return diffFacts.parse(item)[0].json;
}

/**
 * Runs "Compare with approved change" and routes its facts through "Ready for PR?". The
 * minimised result holds the hash of its diff, as coding_diff returns it, unless a test sets
 * `diffSha256` to another value.
 */
function compare(parts: { approved: IDataObject; minimised: IDataObject; checked?: IDataObject }) {
	const minimised: IDataObject = {
		diffSha256: sha256Of(typeof parts.minimised.diff === 'string' ? parts.minimised.diff : ''),
		...parts.minimised,
	};
	const facts = z
		.array(
			z.object({
				json: z.object({
					hasResult: z.boolean(),
					check: z.string(),
					test: z.string(),
					changedLines: z.number(),
					approvedLines: z.number(),
					diffBudget: z.number(),
					testListed: z.boolean(),
					unreviewed: z.array(z.string()),
				}),
			}),
		)
		.length(1)
		.parse(
			configured.runCode('Compare with approved change', {
				nodes: {
					'Read factory ticket': ticketOutput,
					'Draft failing test': earlierNodes['Draft failing test'],
					'Get diff': { structuredContent: parts.approved },
					'Re-verify': {
						structuredContent: parts.checked ?? {
							check: 'passed',
							test: 'passed',
							changes: minimised.changes,
						},
					},
					'Get minimised diff': { structuredContent: minimised },
				},
			}),
		)[0].json;
	return {
		facts,
		unreviewed: facts.unreviewed,
		changedLines: facts.changedLines,
		route: configured.routeOf('Ready for PR?', { json: facts }),
	};
}

const targetsOf = (gate: string) =>
	(workflow.connections[gate]?.main ?? []).map((targets) => targets?.map((target) => target.node));

describe('software factory diff gates', () => {
	describe('Check the diff', () => {
		const files: DiffFile[] = [
			{ path: 'src/a.ts', lines: ['+const a = 1;', '-const old = 0;', ' context'] },
			{ path: 'src/b.test.ts', lines: ["+it('counts', () => {});", '+expect(1).toBe(1);'] },
		];
		const whole = { diff: unifiedDiff(files), changes: changesOf(files) };

		it('shows no problem for a diff that holds every listed change', () => {
			expect(problemsOf(whole)).toEqual([]);
		});

		it('shows no problem for an empty change, which "Has a diff?" then stops', () => {
			expect(problemsOf({ diff: '', changes: [] })).toEqual([]);
		});

		it('reports whether the listed changes hold the failing test', () => {
			const withTest = [...files, FAILING_TEST_FILE];
			const testOf = (changes: DiffFile[]) =>
				checkedDiffOf({ diff: unifiedDiff(changes), changes: changesOf(changes) }).testListed;

			expect(testOf(withTest)).toBe(true);
			expect(testOf(files)).toBe(false);
			expect(testOf([{ path: `${FAILING_TEST_FILE.path}.bak`, lines: ['+x();'] }])).toBe(false);
		});

		it('lists each listed file that the diff leaves out', () => {
			expect(problemsOf({ diff: '', changes: changesOf(files) })).toEqual([
				'src/a.ts: missing from the diff',
				'src/b.test.ts: missing from the diff',
			]);
		});

		it('lists an untracked file that the diff does not hold', () => {
			const untracked = { path: 'src/new.ts', status: '??', additions: 10, deletions: 0 };

			expect(
				problemsOf({ diff: unifiedDiff(files), changes: [...changesOf(files), untracked] }),
			).toEqual(['src/new.ts: missing from the diff']);
		});

		it('accepts a name with a space, which git ends with a tab in the header lines', () => {
			const spaced: DiffFile[] = [{ path: 'my file.ts', lines: ['+const a = 1;'] }];
			const tabbed = unifiedDiff(spaced).replace(/^(?:---|\+\+\+) .*$/gm, (line) => line + '\t');

			expect(problemsOf({ diff: tabbed, changes: changesOf(spaced) })).toEqual([]);
		});

		it('lists a quoted name, which matches no listed change', () => {
			const quoted = [
				'diff --git "a/q\\"x.ts" "b/q\\"x.ts"',
				'index 1111111..2222222 100644',
				'--- "a/q\\"x.ts"',
				'+++ "b/q\\"x.ts"',
				'@@ -1,1 +1,1 @@',
				'+const a = 1;',
				'',
			].join('\n');
			const change = { path: 'q"x.ts', status: 'M', additions: 1, deletions: 0 };

			expect(problemsOf({ diff: quoted, changes: [change] })).toContain(
				'q"x.ts: missing from the diff',
			);
		});

		it('lists a diff that is cut after a hunk header', () => {
			const single: DiffFile[] = [{ path: 'src/a.ts', lines: ['+a();', '+b();'] }];
			const cut = unifiedDiff(single).split('\n').slice(0, 5).join('\n');

			expect(problemsOf({ diff: cut, changes: changesOf(single) })).toEqual([
				'src/a.ts: the diff has 0 added and 0 deleted lines, the list has 2 and 0',
			]);
		});

		it('lists a file whose line counts differ from the change list', () => {
			const changes = changesOf(files).map((change, index) =>
				index === 0 ? { ...change, additions: change.additions + 1 } : change,
			);

			expect(problemsOf({ diff: unifiedDiff(files), changes })).toEqual([
				'src/a.ts: the diff has 1 added and 1 deleted lines, the list has 2 and 1',
			]);
		});

		it('lists a file that the diff holds but the change list does not name', () => {
			expect(
				problemsOf({ diff: unifiedDiff(files), changes: changesOf(files).slice(0, 1) }),
			).toEqual(['src/b.test.ts: not in the list of changed files']);
		});

		it('lists a file that the change list names twice, and a file that the diff holds twice', () => {
			expect(
				problemsOf({
					diff: unifiedDiff(files.slice(0, 1)),
					changes: [...changesOf(files).slice(0, 1), ...changesOf(files).slice(0, 1)],
				}),
			).toEqual(['src/a.ts: listed twice']);
			expect(
				problemsOf({
					diff: unifiedDiff([files[0], files[0]]),
					changes: changesOf(files.slice(0, 1)),
				}),
			).toEqual(['src/a.ts: appears twice in the diff']);
		});

		it('lists a truncated diff even when every count matches', () => {
			expect(problemsOf({ ...whole, truncated: true })).toEqual(['the diff is truncated']);
		});

		it('treats a change list that is not a list as an empty one', () => {
			expect(problemsOf({ diff: unifiedDiff(files), changes: 'many' })).toEqual([
				'src/a.ts: not in the list of changed files',
				'src/b.test.ts: not in the list of changed files',
			]);
		});

		it.each([
			[
				'a binary file',
				binaryDiff('logo.png', '2222222'),
				[{ path: 'logo.png', additions: 0, deletions: 0 }],
			],
			[
				'a mode change',
				'diff --git a/run.sh b/run.sh\nold mode 100644\nnew mode 100755\n',
				[{ path: 'run.sh', additions: 0, deletions: 0 }],
			],
			[
				'a rename',
				'diff --git a/old name.ts b/new name.ts\nsimilarity index 100%\nrename from old name.ts\nrename to new name.ts\n',
				[{ path: 'new name.ts', additions: 0, deletions: 0 }],
			],
			[
				'a deleted file',
				'diff --git a/gone.ts b/gone.ts\ndeleted file mode 100644\nindex 1111111..0000000\n--- a/gone.ts\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-const a = 1;\n-const b = 2;\n',
				[{ path: 'gone.ts', additions: 0, deletions: 2 }],
			],
		])('accepts %s with the same header and counts', (_case, diff, changes) => {
			expect(problemsOf({ diff, changes })).toEqual([]);
		});

		const lineArb = fc
			.tuple(
				fc.constantFrom('+', '-', ' '),
				fc.constantFrom('const a = 1;', '}', '-- note', '++ total', '@@ x', 'diff --git y', ''),
			)
			.map(([sign, text]) => sign + text);
		const fileArb = fc.record({
			path: fc.constantFrom('a.ts', 'b.ts', 'c/d.ts', 'e f.ts'),
			lines: fc.array(lineArb, { minLength: 1, maxLength: 6 }),
		});
		const filesArb = fc.uniqueArray(fileArb, {
			minLength: 1,
			maxLength: 3,
			selector: (file) => file.path,
		});

		it('accepts every diff that holds exactly the listed changes, whatever the lines', () => {
			fc.assert(
				fc.property(filesArb, (generated) => {
					expect(
						problemsOf({ diff: unifiedDiff(generated), changes: changesOf(generated) }),
					).toEqual([]);
				}),
				{ numRuns: 100 },
			);
		});

		it('lists each file that the diff leaves out', () => {
			fc.assert(
				fc.property(filesArb, fc.nat(), (generated, pick) => {
					const dropped = generated[pick % generated.length];
					const kept = generated.filter((file) => file !== dropped);

					expect(problemsOf({ diff: unifiedDiff(kept), changes: changesOf(generated) })).toContain(
						`${dropped.path}: missing from the diff`,
					);
				}),
				{ numRuns: 100 },
			);
		});

		it('lists the one file whose line counts differ from the change list', () => {
			fc.assert(
				fc.property(filesArb, fc.nat(), (generated, pick) => {
					const target = pick % generated.length;
					const grown = generated.map((file, index) =>
						index === target ? { ...file, lines: [...file.lines, '+extra();'] } : file,
					);

					expect(problemsOf({ diff: unifiedDiff(grown), changes: changesOf(generated) })).toEqual([
						expect.stringContaining(`${generated[target].path}: the diff has`),
					]);
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe('Compare with approved change', () => {
		const approved: DiffFile[] = [
			{ path: 'src/a.ts', lines: ['+const a = 1;', '+const b = 2;', ' context'] },
		];
		const approvedDiff = { diff: unifiedDiff(approved), changes: changesOf(approved) };

		it('sends a change whose minimised diff leaves out a listed file to "Not ready"', () => {
			const result = compare({
				approved: approvedDiff,
				minimised: { diff: '', changes: changesOf(approved) },
			});

			expect(result.route).toBe(NOT_READY);
			expect(result.unreviewed).toEqual(['src/a.ts: missing from the diff']);
		});

		it('stops when Minimise keeps an untracked file out of the minimised diff', () => {
			const untracked: DiffFile = { path: 'src/new.ts', lines: ['+export const n = 1;'] };
			const result = compare({
				approved: {
					diff: unifiedDiff([...approved, untracked]),
					changes: changesOf([...approved, untracked]),
				},
				minimised: {
					diff: unifiedDiff(approved),
					changes: changesOf([...approved, untracked]),
				},
			});

			expect(result.route).toBe(NOT_READY);
			expect(result.unreviewed).toContain('src/new.ts: missing from the diff');
		});

		it('stops when the minimised diff is cut after a hunk header', () => {
			const cut = unifiedDiff(approved).split('\n').slice(0, 5).join('\n');
			const result = compare({
				approved: approvedDiff,
				minimised: { diff: cut, changes: changesOf(approved) },
			});

			expect(result.route).toBe(NOT_READY);
			expect(result.unreviewed).toEqual([
				'src/a.ts: the diff has 0 added and 0 deleted lines, the list has 2 and 0',
			]);
		});

		it('stops when the minimised diff is flagged as truncated', () => {
			const result = compare({
				approved: approvedDiff,
				minimised: { ...approvedDiff, truncated: true },
			});

			expect(result.unreviewed).toEqual(['the diff is truncated']);
		});

		it('stops when Minimise adds a mode change to a file with an approved hunk', () => {
			const hunk = unifiedDiff(approved).split('\n').slice(4).join('\n');
			const modeChange = [
				'diff --git a/src/a.ts b/src/a.ts',
				'old mode 100644',
				'new mode 100755',
				'index 1111111..2222222',
				'--- a/src/a.ts',
				'+++ b/src/a.ts',
				hunk,
			].join('\n');
			const result = compare({
				approved: approvedDiff,
				minimised: { diff: modeChange, changes: changesOf(approved) },
			});

			expect(result.route).toBe(NOT_READY);
			expect(result.unreviewed).toEqual(['src/a.ts: old mode 100644', 'src/a.ts: new mode 100755']);
		});

		it('accepts a mode change that the approved diff already holds', () => {
			const modeChange = [
				'diff --git a/src/a.ts b/src/a.ts',
				'old mode 100644',
				'new mode 100755',
				'index 1111111..2222222',
				'--- a/src/a.ts',
				'+++ b/src/a.ts',
				unifiedDiff(approved).split('\n').slice(4).join('\n'),
			].join('\n');
			const diff = [modeChange, unifiedDiff([FAILING_TEST_FILE])].join('\n');
			const changes = [...changesOf(approved), ...changesOf([FAILING_TEST_FILE])];
			const result = compare({
				approved: { diff, changes },
				minimised: { diff, changes },
			});

			expect(result.route).toBe(READY);
			expect(result.unreviewed).toEqual([]);
		});

		it('accepts a name with a space in the minimised diff, as it accepts it in the approved diff', () => {
			const spaced: DiffFile[] = [{ path: 'my file.ts', lines: ['+const a = 1;'] }];
			const tabbed = unifiedDiff(spaced).replace(/^(?:---|\+\+\+) .*$/gm, (line) => line + '\t');
			const diff = [tabbed, unifiedDiff([FAILING_TEST_FILE])].join('\n');
			const changes = [...changesOf(spaced), ...changesOf([FAILING_TEST_FILE])];
			const result = compare({
				approved: { diff, changes },
				minimised: { diff, changes },
			});

			expect(result.route).toBe(READY);
			expect(result.unreviewed).toEqual([]);
		});

		it('stops when Minimise removes the failing test, though every other change is reviewed', () => {
			const withTest = [...approved, FAILING_TEST_FILE];
			const result = compare({
				approved: { diff: unifiedDiff(withTest), changes: changesOf(withTest) },
				minimised: { diff: unifiedDiff(approved), changes: changesOf(approved) },
			});

			expect(result.facts.testListed).toBe(false);
			expect(result.unreviewed).toEqual([]);
			expect(result.route).toBe(NOT_READY);
		});

		it('sends a check after Minimise that is not final to "No result", as "Check result" does', () => {
			const withTest = [...approved, FAILING_TEST_FILE];
			const routeWith = (state: IDataObject) =>
				compare({
					approved: { diff: unifiedDiff(withTest), changes: changesOf(withTest) },
					minimised: { diff: unifiedDiff(withTest), changes: changesOf(withTest) },
					checked: { ...state, changes: changesOf(withTest) },
				});

			expect(routeWith({ check: 'running', test: 'passed' }).route).toBe(NO_RESULT);
			expect(routeWith({ check: 'passed', test: 'not_started' }).route).toBe(NO_RESULT);
			expect(routeWith({ check: 'passed', test: 'passed' }).route).toBe(READY);
			expect(routeWith({ check: 'failed', test: 'passed' }).route).toBe(NOT_READY);
		});

		it.each([
			['no hash', undefined],
			['a hash of another length', 'a'.repeat(40)],
			['a hash in capitals', 'A'.repeat(64)],
		])(
			'sends a minimised diff with %s to "No result", so that no change is pushed unchecked',
			(_case, hash) => {
				const withTest = [...approved, FAILING_TEST_FILE];
				const result = compare({
					approved: { diff: unifiedDiff(withTest), changes: changesOf(withTest) },
					minimised: {
						diff: unifiedDiff(withTest),
						changes: changesOf(withTest),
						diffSha256: hash,
					},
				});

				expect(result.facts.hasResult).toBe(false);
				expect(result.route).toBe(NO_RESULT);
			},
		);

		it('stops when the check after Minimise lists other changes than the minimised diff', () => {
			const result = compare({
				approved: approvedDiff,
				minimised: approvedDiff,
				checked: { check: 'passed', test: 'passed', changes: [] },
			});

			expect(result.route).toBe(NOT_READY);
			expect(result.unreviewed).toEqual([
				'the check after Minimise lists other changes than the minimised diff',
			]);
		});

		it('takes the changed lines from the minimised diff, not from the check after Minimise', () => {
			const large: DiffFile[] = [
				{
					path: 'src/a.ts',
					lines: Array.from({ length: 150 }, (_, index) => `+const a${index} = ${index};`),
				},
			];
			const result = compare({
				approved: { diff: unifiedDiff(large), changes: changesOf(large) },
				minimised: { diff: unifiedDiff(large), changes: changesOf(large) },
				checked: {
					check: 'passed',
					test: 'passed',
					changes: changesOf([{ path: 'src/a.ts', lines: ['+const a = 1;'] }]),
				},
			});

			expect(result.changedLines).toBe(150);
			expect(result.route).toBe(NOT_READY);
		});

		it('reports the same diff problems as "Check the diff" for the same diff', () => {
			fc.assert(
				fc.property(
					fc.uniqueArray(
						fc.record({
							path: fc.constantFrom('a.ts', 'b.ts', 'c/d.ts'),
							lines: fc.array(fc.constantFrom('+x();', '-y();', ' z();'), {
								minLength: 1,
								maxLength: 4,
							}),
						}),
						{ minLength: 1, maxLength: 3, selector: (file) => file.path },
					),
					fc.boolean(),
					(generated, dropFirst) => {
						const minimised = {
							diff: unifiedDiff(dropFirst ? generated.slice(1) : generated),
							changes: changesOf(generated),
						};
						const result = compare({
							approved: { diff: unifiedDiff(generated), changes: changesOf(generated) },
							minimised,
						});

						expect(result.unreviewed).toEqual(problemsOf(minimised));
					},
				),
				{ numRuns: 100 },
			);
		});

		it('routes a comparison that fails to the step failed outcome', () => {
			expect(targetsOf('Compare with approved change')).toEqual([
				['Ready for PR?'],
				['Outcome: step failed'],
			]);
		});
	});
});
