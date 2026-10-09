import fc from 'fast-check';
import type { GenericValue, IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { binaryDiff, changesOf, sha256Of, unifiedDiff, type DiffFile } from './factory-pack-diffs';
import { nodeByName } from './factory-pack-files';
import type { TemplateRun } from './factory-pack-runtime';
import {
	AGENT_IDS,
	CHOSEN_AGENTS,
	configured,
	earlierNodes,
	failingTestOutput,
	FAILING_TEST_FILE,
	runtime,
	ticketOutput,
	workflow,
} from './factory-pack-fixtures';

/** Each gate of the template, decided with the expression engine and the filter logic of n8n. */

const sha = 'a'.repeat(40);
const plan = {
	summary: 'Count the runs.',
	steps: ['Add a counter.'],
	files: ['a.ts'],
	tests: ['a.test.ts'],
	risks: [],
	estimatedChangedLines: 20,
};
const checkResult = (fields: IDataObject = {}) => ({
	structuredContent: {
		check: 'passed',
		checkExitCode: 0,
		test: 'passed',
		testExitCode: 0,
		changes: [{ path: 'a.ts', status: 'M', additions: 30, deletions: 10 }],
		...fields,
	},
});
const lines = (additions: number, deletions = 0) => [
	{ path: 'a.ts', status: 'M', additions, deletions },
];
const isSwitch = (gate: string) => nodeByName(workflow, gate).type === 'n8n-nodes-base.switch';
/** Whether an item leaves a gate on its first output, the one that continues the run. */
const continues = (gate: string, run: TemplateRun) =>
	isSwitch(gate) ? configured.routeOf(gate, run) === 0 : configured.passesIf(gate, run);
const targetsOf = (gate: string) =>
	(workflow.connections[gate]?.main ?? []).map((targets) => targets?.map((target) => target.node));

const comparisonFacts = z
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
	.length(1);

/** Runs "Compare with approved change" and routes its item through "Ready for PR?". */
function readyForPr(nodes: Record<string, IDataObject>) {
	const facts = comparisonFacts.parse(
		configured.runCode('Compare with approved change', {
			nodes: {
				'Read factory ticket': ticketOutput,
				'Draft failing test': failingTestOutput,
				...nodes,
			},
		}),
	)[0].json;
	return { facts, route: configured.routeOf('Ready for PR?', { json: facts }) };
}

/** The result of coding_diff for the files: the diff, its changes and the hash of the diff. */
const diffResultOf = (files: DiffFile[]) => ({
	diff: unifiedDiff(files),
	changes: changesOf(files),
	diffSha256: sha256Of(unifiedDiff(files)),
});

/** The run after Minimise: the approved diff, the minimised diff and the check of the minimised change. */
function minimised(
	after: DiffFile[],
	{ approved, check = {} }: { approved: DiffFile[]; check?: IDataObject },
) {
	return readyForPr({
		'Get diff': { structuredContent: diffResultOf(approved) },
		'Re-verify': checkResult({ changes: changesOf(after), ...check }),
		'Get minimised diff': { structuredContent: diffResultOf(after) },
	});
}

describe('software factory gates', () => {
	describe('Critic is separate?', () => {
		const agent = (value: string) => ({ agentId: { __rl: true, mode: 'list', value } });
		const separate = (patches: Record<string, ReturnType<typeof agent>> = {}) =>
			runtime
				.withParameters({ ...CHOSEN_AGENTS, ...patches })
				.passesIf('Critic is separate?', { json: ticketOutput });

		it('starts the run when the critic is not an author', () => {
			expect(separate()).toBe(true);
		});

		it.each([
			['the implementer', { 'Fresh critic': agent(AGENT_IDS.implementer) }],
			['the planner', { 'Fresh critic': agent(AGENT_IDS.planner) }],
			['the agent of Minimise', { Minimise: agent(AGENT_IDS.critic) }],
			['the agent of Draft failing test', { 'Draft failing test': agent(AGENT_IDS.critic) }],
			['no agent', { 'Fresh critic': agent('') }],
			['a blank agent id', { 'Fresh critic': agent('  ') }],
		])('stops the run when the critic is %s', (_case, patches) => {
			expect(separate(patches)).toBe(false);
		});

		it('stops the run when nobody chose the agents after the import', () => {
			expect(runtime.passesIf('Critic is separate?', { json: ticketOutput })).toBe(false);
		});
	});

	it('needs acceptance criteria', () => {
		const run = (criteria: string[]) => ({
			json: { ...ticketOutput, acceptanceCriteria: criteria },
		});

		expect(configured.passesIf('Has acceptance criteria?', run(['One']))).toBe(true);
		expect(configured.passesIf('Has acceptance criteria?', run([]))).toBe(false);
	});

	it('asks a person only about a plan with a summary and steps', () => {
		const ready = (structuredOutput: IDataObject | null) =>
			configured.passesIf('Plan ready?', { json: { structuredOutput } });

		expect(ready(plan)).toBe(true);
		expect(ready({ ...plan, summary: '' })).toBe(false);
		expect(ready({ ...plan, summary: ' \n' })).toBe(false);
		expect(ready({ ...plan, steps: [] })).toBe(false);
		// Message an Agent returns null when the agent gives no structured output.
		expect(ready(null)).toBe(false);
	});

	it('continues after the approval only on an explicit approval', () => {
		const decide = (data?: IDataObject) =>
			configured.routeOf('Plan decision', { json: data ? { data } : {} });

		expect(decide({ decision: 'Approve the plan' })).toBe(0);
		expect(decide({ decision: 'Change the plan', feedback: 'Smaller' })).toBe(1);
		expect(decide({ decision: 'Reject the ticket' })).toBe('fallback');
		// The wait time ran out: Slack resumes without a decision.
		expect(decide()).toBe('fallback');
	});

	describe('Check result', () => {
		const check = (fields: IDataObject, runIndex = 0) =>
			configured.routeOf('Check result', { json: checkResult(fields), runIndex });
		const NO_RESULT = 2;

		it('sends each route to its step or outcome', () => {
			expect(targetsOf('Check result')).toEqual([
				['Get diff'],
				['Fix the failing check'],
				['Outcome: step failed'],
				['Outcome: check failed'],
			]);
		});

		it('continues only when the check and the failing test pass', () => {
			expect(check({}, 3)).toBe(0);
		});

		it('retries a failed check only among the first 3 checks of a run', () => {
			const failures = [
				{ check: 'failed' },
				{ test: 'failed' },
				{ check: 'failed', test: 'failed' },
			];

			for (const failure of failures) {
				expect([0, 1, 2].map((runIndex) => check(failure, runIndex))).toEqual([1, 1, 1]);
				expect(check(failure, 3)).toBe('fallback');
			}
		});

		it('counts the checks that passed before a critic round', () => {
			// Two checks pass, each before a critic round. The third check fails and gets the only
			// retry. The fourth check fails and stops the run.
			expect([check({}, 0), check({}, 1)]).toEqual([0, 0]);
			expect(check({ check: 'failed' }, 2)).toBe(1);
			expect(check({ check: 'failed' }, 3)).toBe('fallback');
			expect(check({ check: 'failed' }, 4)).toBe('fallback');
		});

		it.each([
			['a check that did not start', { check: 'not_started' }],
			['a test that did not run', { test: 'not_started' }],
			['a missing test result', { test: undefined }],
			['a check that stopped', { check: 'stopped' }],
			['a check that is still running', { check: 'running' }],
			['a passed check without a test result', { check: 'passed', test: undefined }],
		])('sends %s to the step failed outcome, not to a retry', (_case, fields) => {
			expect([0, 3].map((runIndex) => check(fields, runIndex))).toEqual([NO_RESULT, NO_RESULT]);
		});

		it('names the failed check when the test did not finish', () => {
			// A failed check is a result. The unfinished test does not hide it.
			expect(check({ check: 'failed', test: 'running' }, 0)).toBe(1);
			expect(check({ check: 'failed', test: 'running' }, 3)).toBe('fallback');
		});

		it.each([
			// Verify failed as a whole, so n8n sent the output of Implement to its success output.
			['the output of Implement', { structuredOutput: { summary: 'Done.' } }],
			['an empty result', {}],
			['a check result of the wrong type', checkResult({ check: true })],
		])('sends %s to the step failed outcome, not to a retry', (_case, json) => {
			expect(configured.routeOf('Check result', { json })).toBe(NO_RESULT);
		});
	});

	it('reviews only a change that has a diff, and that shows every changed file', () => {
		// "Check the diff" puts the problems of the diff in diffProblems, and whether the change holds
		// the failing test in testListed. Any problem stops the run.
		const hasDiff = (
			structuredContent?: IDataObject,
			diffProblems: GenericValue = [],
			testListed: GenericValue = true,
		) =>
			configured.passesIf('Has a diff?', {
				json: {
					...(structuredContent ? { structuredContent } : {}),
					diffProblems,
					testListed,
				},
			});
		const diff = { diff: 'diff --git a/a.ts b/a.ts', changes: lines(1) };

		expect(hasDiff(diff)).toBe(true);
		expect(hasDiff({ diff: '', changes: [] })).toBe(false);
		expect(hasDiff({ diff: ' \n', changes: [] })).toBe(false);
		expect(hasDiff()).toBe(false);
		expect(hasDiff(diff, ['a.ts: missing from the diff'])).toBe(false);
		// A check result that is not a list of problems is no result.
		expect(hasDiff(diff, 'none')).toBe(false);
		// A change without the failing test, or with a fact of another type, goes no further.
		expect(hasDiff(diff, [], false)).toBe(false);
		expect(hasDiff(diff, [], 'yes')).toBe(false);
	});

	it('continues after the critic only on an explicit approval without serious findings', () => {
		const review = (
			structuredOutput: IDataObject | null,
			options: { diff?: string; runIndex?: number } = {},
		) =>
			configured.routeOf('Critic verdict', {
				json: { structuredOutput },
				nodes: { 'Critic input': { diff: options.diff ?? 'diff --git a/a.ts b/a.ts' } },
				runIndex: options.runIndex ?? 0,
			});
		const finding = (severity?: string) => ({ path: 'a.ts', line: 1, severity, body: 'Fix it' });
		const approval = (findings: GenericValue) =>
			review({ verdict: 'approve', findings, scopeCreep: [] });

		expect(approval([finding('minor'), finding('nit')])).toBe(0);
		// A blocker or major finding asks for a repair round, as request_changes does.
		expect(approval([finding('major')])).toBe(1);
		expect(approval([finding('blocker'), finding('minor')])).toBe(1);
		expect(
			review({ verdict: 'approve', findings: [finding('major')], scopeCreep: [] }, { runIndex: 1 }),
		).toBe(1);
		expect(
			review({ verdict: 'approve', findings: [finding('major')], scopeCreep: [] }, { runIndex: 2 }),
		).toBe('fallback');
		expect(approval([finding()])).toBe('fallback');
		expect(approval('none')).toBe('fallback');
		expect(review({ verdict: 'approve', findings: [], scopeCreep: [] }, { diff: '' })).toBe(
			'fallback',
		);
		expect(review({ verdict: 'request_changes', findings: [], scopeCreep: [] })).toBe(1);
		expect(
			review({ verdict: 'request_changes', findings: [], scopeCreep: [] }, { runIndex: 2 }),
		).toBe('fallback');
		expect(review({ verdict: 'block', findings: [], scopeCreep: [] })).toBe('fallback');
		expect(review(null)).toBe('fallback');
	});

	describe('Ready for PR?', () => {
		const READY = 0;
		const NOT_READY = 1;
		const NO_RESULT = 'fallback';
		const added = (count: number, prefix = 'line') =>
			Array.from({ length: count }, (_, index) => `+const ${prefix}${index} = ${index};`);
		// The change holds the failing test, as the gate "Compare with approved change" requires.
		const approved = [
			{ path: 'a.ts', lines: ['+const a = 1;', '+const b = 2;', ' context', '-const old = 0;'] },
			FAILING_TEST_FILE,
		];

		it('sends each route to its step or outcome', () => {
			expect(targetsOf('Ready for PR?')).toEqual([
				['Push branch'],
				['Outcome: not ready for PR'],
				['Outcome: step failed'],
			]);
		});

		it('opens a pull request for the approved change and for a change that only lost parts', () => {
			const unchanged = minimised(approved, { approved });
			const smaller = minimised(
				[{ path: 'a.ts', lines: ['+const a = 1;', ' context'] }, FAILING_TEST_FILE],
				{ approved },
			);

			expect(unchanged).toMatchObject({
				route: READY,
				facts: { changedLines: 4, testListed: true, unreviewed: [] },
			});
			expect(smaller).toMatchObject({ route: READY, facts: { changedLines: 2, approvedLines: 4 } });
		});

		it.each([
			['the check failed', { check: 'failed' }],
			['the failing test failed', { test: 'failed' }],
			['the changes are not a list', { changes: 'many' }],
		])('stops when %s', (_case, check) => {
			expect(minimised(approved, { approved, check }).route).toBe(NOT_READY);
		});

		it.each([
			['the check is still running', { check: 'running' }],
			['the test did not run', { test: 'not_started' }],
			['the test result is missing', { test: undefined }],
		])(
			'sends a result after Minimise with %s to "No result", as "Check result" does',
			(_case, check) => {
				expect(minimised(approved, { approved, check }).route).toBe('fallback');
			},
		);

		it('stops when Minimise removes the failing test, though the rest of the change is reviewed', () => {
			const result = minimised([{ path: 'a.ts', lines: ['+const a = 1;', ' context'] }], {
				approved,
			});

			expect(result.route).toBe(NOT_READY);
			expect(result.facts).toMatchObject({ testListed: false, unreviewed: [] });
		});

		it.each([
			['no hash', undefined],
			['a hash that is not 64 hexadecimal characters', 'a'.repeat(40)],
			['a hash in capitals', 'A'.repeat(64)],
		])(
			'sends a minimised diff with %s to "No result", so no change is pushed unchecked',
			(_case, hash) => {
				const result = readyForPr({
					'Get diff': { structuredContent: diffResultOf(approved) },
					'Re-verify': checkResult({ changes: changesOf(approved) }),
					'Get minimised diff': {
						structuredContent: { ...diffResultOf(approved), diffSha256: hash },
					},
				});

				expect(result.facts.hasResult).toBe(false);
				expect(result.route).toBe('fallback');
			},
		);

		it('stops when the change is empty or over the budget', () => {
			// The failing test adds one line, so the change at the budget has 99 more lines.
			const atBudget = [{ path: 'a.ts', lines: added(99) }, FAILING_TEST_FILE];
			const overBudget = [{ path: 'a.ts', lines: added(100) }, FAILING_TEST_FILE];

			expect(minimised([], { approved }).route).toBe(NOT_READY);
			expect(minimised(atBudget, { approved: atBudget }).route).toBe(READY);
			expect(minimised(overBudget, { approved: overBudget })).toMatchObject({
				route: NOT_READY,
				facts: { changedLines: 101, diffBudget: 100, unreviewed: [] },
			});
		});

		const CHECK_MISMATCH = 'the check after Minimise lists other changes than the minimised diff';

		it.each([
			['names other changes', { changes: [] }],
			['has no list of changes', { changes: undefined }],
		])('stops when the check after Minimise %s', (_case, check) => {
			const result = minimised([{ path: 'a.ts', lines: ['+const a = 1;'] }], { approved, check });

			expect(result.route).toBe(NOT_READY);
			expect(result.facts.unreviewed).toEqual([CHECK_MISMATCH]);
		});

		it('takes the changed lines from the minimised diff, not from the check after Minimise', () => {
			const big = [{ path: 'a.ts', lines: added(150) }];
			const result = minimised(big, {
				approved: big,
				check: { changes: changesOf([{ path: 'a.ts', lines: added(5) }]) },
			});

			expect(result.facts).toMatchObject({ changedLines: 150, unreviewed: [CHECK_MISMATCH] });
			expect(result.route).toBe(NOT_READY);
		});

		it('stops when Minimise swapped the approved change for a file that the critic did not review', () => {
			const result = minimised([{ path: 'new-unreviewed.ts', lines: added(15) }], {
				approved: [{ path: 'a.ts', lines: added(20) }],
			});

			expect(result.route).toBe(NOT_READY);
			expect(result.facts.unreviewed).toContain(
				'new-unreviewed.ts: a file that the critic did not review',
			);
		});

		it('stops when one file grew while another file got smaller', () => {
			const result = minimised(
				[
					{ path: 'a.ts', lines: [...added(10), ...added(5, 'extra')] },
					{ path: 'b.ts', lines: added(2) },
				],
				{
					approved: [
						{ path: 'a.ts', lines: added(10) },
						{ path: 'b.ts', lines: added(10) },
					],
				},
			);

			expect(result.route).toBe(NOT_READY);
			expect(result.facts.changedLines).toBeLessThan(result.facts.approvedLines);
			expect(result.facts.unreviewed).toContain(
				'a.ts: more changed lines than the critic reviewed',
			);
		});

		it.each([
			[
				'a rewrite of the same size in one file',
				[{ path: 'a.ts', lines: ['+const a = 2;'] }],
				[{ path: 'a.ts', lines: ['+const a = 1;'] }],
				'a.ts: +const a = 2;',
			],
			[
				'an approved line moved to another file',
				[
					{ path: 'a.ts', lines: ['+x();'] },
					{ path: 'b.ts', lines: ['+z();', '+y();'] },
				],
				[
					{ path: 'a.ts', lines: ['+x();', '+y();'] },
					{ path: 'b.ts', lines: ['+z();'] },
				],
				'b.ts: +y();',
			],
			[
				'a deleted line that the critic did not see',
				[{ path: 'a.ts', lines: ['+a();', '-base();'] }],
				[{ path: 'a.ts', lines: ['+a();', '+b();'] }],
				'a.ts: -base();',
			],
			[
				'a second copy of an approved line',
				[{ path: 'a.ts', lines: ['+}', '+}'] }],
				[{ path: 'a.ts', lines: ['+}', '+a();'] }],
				'a.ts: +}',
			],
			[
				'a changed line that looks like a file header',
				[{ path: 'a.sql', lines: ['--- other note', '+++ total'] }],
				[{ path: 'a.sql', lines: ['--- old note', '+++ total'] }],
				'a.sql: --- other note',
			],
		])('stops after %s', (_case, after, before, unreviewed) => {
			const result = minimised(after, { approved: before });

			expect(result.route).toBe(NOT_READY);
			expect(result.facts.unreviewed).toContain(unreviewed);
		});

		it('compares a file without line changes by its header', () => {
			// The list of changes names the binary file with no line counts, as coding_diff does.
			const binary = { path: 'logo.png', status: 'M', additions: 0, deletions: 0 };
			const routeWith = (minimisedDiff: string, changes: IDataObject[]) =>
				readyForPr({
					'Get diff': {
						structuredContent: {
							diff: unifiedDiff(approved) + binaryDiff('logo.png', '2222222'),
							changes: [...changesOf(approved), binary],
						},
					},
					// The check lists the changes of the minimised diff, as coding_check does.
					'Re-verify': checkResult({ changes }),
					'Get minimised diff': {
						structuredContent: {
							diff: minimisedDiff,
							changes,
							diffSha256: sha256Of(minimisedDiff),
						},
					},
				}).route;

			// The same binary file, the binary file removed, and other content in the binary file.
			const kept = [...changesOf(approved), binary];
			expect(routeWith(unifiedDiff(approved) + binaryDiff('logo.png', '2222222'), kept)).toBe(
				READY,
			);
			expect(routeWith(unifiedDiff(approved), changesOf(approved))).toBe(READY);
			expect(routeWith(unifiedDiff(approved) + binaryDiff('logo.png', '3333333'), kept)).toBe(
				NOT_READY,
			);
		});

		it('opens a pull request for any change that only removes parts of the approved change', () => {
			// The failing test is kept on both sides: removing it is tested on its own.
			const line = fc
				.tuple(
					fc.constantFrom('+', '-', ' '),
					fc.constantFrom('const a = 1;', '}', '-- note', '++ total', '@@ x', 'diff --git y', ''),
				)
				.map(([sign, text]) => sign + text);
			const file = fc.record({
				path: fc.constantFrom('a.ts', 'b.ts', 'c/d.ts', 'e f.ts'),
				lines: fc.array(fc.tuple(line, fc.boolean()), { minLength: 1, maxLength: 8 }),
				kept: fc.boolean(),
			});
			const files = fc.uniqueArray(file, { minLength: 1, maxLength: 3, selector: (f) => f.path });

			fc.assert(
				fc.property(files, fc.nat(), (generated, pick) => {
					const before = [
						...generated.map((f) => ({ path: f.path, lines: f.lines.map(([text]) => text) })),
						FAILING_TEST_FILE,
					];
					const after = [
						...generated
							.filter((f) => f.kept)
							.map((f) => ({
								path: f.path,
								lines: f.lines.filter(([, kept]) => kept).map(([text]) => text),
							})),
						FAILING_TEST_FILE,
					];
					const removedOnly = minimised(after, { approved: before });

					expect(removedOnly.facts).toMatchObject({ testListed: true, unreviewed: [] });
					expect(removedOnly.route).toBe(READY);

					// One added line that the critic did not review stops the run.
					const target = pick % after.length;
					const withExtra = after.map((f, index) =>
						index === target ? { ...f, lines: [...f.lines, '+unreviewed();'] } : f,
					);

					expect(minimised(withExtra, { approved: before }).route).toBe(NOT_READY);
				}),
				{ numRuns: 60 },
			);
		});

		describe('a step that fails as a whole', () => {
			// n8n then sends the input item of the step to its success output.
			const approvedDiff = {
				structuredContent: { diff: unifiedDiff(approved), changes: changesOf(approved) },
			};

			it.each([
				[
					'Re-verify',
					{
						'Re-verify': { structuredOutput: { summary: 'Smaller.', removed: [] } },
						'Get minimised diff': approvedDiff,
					},
				],
				[
					'Get minimised diff',
					{
						'Re-verify': checkResult({ changes: changesOf(approved) }),
						'Get minimised diff': checkResult({ changes: changesOf(approved) }),
					},
				],
			])('sends the run to the step failed outcome when %s fails', (_step, nodes) => {
				expect(readyForPr({ 'Get diff': approvedDiff, ...nodes }).route).toBe(NO_RESULT);
			});

			it('sends the run to the step failed outcome when the comparison fails', () => {
				expect(configured.routeOf('Ready for PR?', { json: approvedDiff })).toBe(NO_RESULT);
			});
		});
	});

	describe('Branch pushed?', () => {
		const pushed = (structuredContent?: IDataObject) =>
			configured.passesIf('Branch pushed?', {
				json: structuredContent ? { structuredContent } : {},
				nodes: earlierNodes,
			});
		const confirmation = { pushed: true, branch: ticketOutput.branch, commit: sha };

		it('opens the pull request after a confirmed push of the branch of this run', () => {
			expect(pushed(confirmation)).toBe(true);
		});

		it.each([
			['the push did not happen', { ...confirmation, pushed: false }],
			['another branch was pushed', { ...confirmation, branch: 'factory/eng-42-1' }],
			['the commit is not a commit hash', { ...confirmation, commit: 'HEAD' }],
			['the result is missing', undefined],
		])('stops when %s', (_case, structuredContent) => {
			expect(pushed(structuredContent)).toBe(false);
		});
	});

	it('records an opened pull request only with its link', () => {
		const opened = (json: IDataObject) => configured.passesIf('PR opened?', { json });

		expect(opened({ html_url: 'https://github.com/acme/factory/pull/7', draft: true })).toBe(true);
		expect(opened({ html_url: '' })).toBe(false);
		expect(opened({})).toBe(false);
	});

	describe('a step that fails as a whole', () => {
		// n8n then sends the input item of the step to its success output. The gate after the step
		// gets that item and must stop. Implement and Minimise have no gate of their own: the
		// deterministic check after them decides on the code, not on the answer of the agent.
		// "Ready for PR?" has its own cases above, and "Prep ready?" has its own test file.

		it.each([
			['Plan', 'Plan ready?', { json: ticketOutput }],
			['Verify', 'Check result', { json: { structuredOutput: { summary: 'Done.' } } }],
			// "Check the diff" failed as a whole: its input, the result of Get diff, has no problems list.
			['Check the diff', 'Has a diff?', { json: checkResult() }],
			[
				'Fresh critic',
				'Critic verdict',
				{ json: { diff: 'diff --git a/a.ts b/a.ts' }, nodes: { 'Critic input': { diff: 'diff' } } },
			],
			['Push branch', 'Branch pushed?', { json: checkResult(), nodes: earlierNodes }],
			[
				'Open draft PR',
				'PR opened?',
				{ json: { structuredContent: { pushed: true, branch: ticketOutput.branch, commit: sha } } },
			],
		])('stops the run when %s fails as a whole', (_step, gate, run) => {
			expect(continues(gate, run)).toBe(false);
		});
	});

	describe('a field of the wrong type', () => {
		// A strict filter throws on a value of another type, and the execution then ends without an
		// outcome. So each gate compares typed values and only stops the run.

		it.each([
			[
				'Plan ready?',
				{ json: { structuredOutput: { ...plan, summary: 5, steps: 'Add a counter.' } } },
			],
			['Plan decision', { json: { data: { decision: ['Approve the plan'] } } }],
			['Check result', { json: checkResult({ check: ['passed'], test: 1 }) }],
			['Has a diff?', { json: { structuredContent: { diff: 42 } } }],
			[
				'Critic verdict',
				{
					json: { structuredOutput: { verdict: 1, findings: 'none' } },
					nodes: { 'Critic input': { diff: 'd' } },
				},
			],
			[
				'Branch pushed?',
				{
					json: { structuredContent: { pushed: 'true', branch: 1, commit: [sha] } },
					nodes: earlierNodes,
				},
			],
			['PR opened?', { json: { html_url: 42 } }],
		])('%s stops the run and does not throw', (gate, run) => {
			expect(() => continues(gate, run)).not.toThrow();
			expect(continues(gate, run)).toBe(false);
		});

		it('Ready for PR? stops the run and does not throw', () => {
			const run = readyForPr({
				'Get diff': { structuredContent: { diff: 7, changes: 'all' } },
				'Re-verify': { structuredContent: { check: 1, test: true, changes: [null, 'a.ts'] } },
				'Get minimised diff': { structuredContent: { diff: ['diff'] } },
			});

			expect(run.route).toBe('fallback');
		});
	});
});
