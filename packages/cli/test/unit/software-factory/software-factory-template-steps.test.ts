import fc from 'fast-check';
import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { readPackText } from './factory-pack-files';
import {
	FAILING_TEST_PATH,
	assignmentOf,
	configured,
	earlierNodes,
	failingTestOutput,
	parameterOf,
	runtime,
	textOf,
	ticketOutput,
} from './factory-pack-fixtures';
import type { TemplateRun } from './factory-pack-runtime';

/** The Code nodes, the tool calls, the messages and the outcomes of the template, run by n8n. */

const sha = 'b'.repeat(40);
const lines = (additions: number, deletions = 0) => [
	{ path: 'a.ts', status: 'M', additions, deletions },
];
const checkResult = (fields: IDataObject = {}) => ({
	structuredContent: {
		check: 'passed',
		checkExitCode: 0,
		test: 'passed',
		testExitCode: 0,
		changes: lines(30, 10),
		...fields,
	},
});
/** The facts of "Compare with approved change" for a change that is ready for a pull request. */
const comparison = (fields: IDataObject = {}) => ({
	hasResult: true,
	check: 'passed',
	test: 'passed',
	changedLines: 40,
	approvedLines: 40,
	diffBudget: 100,
	testListed: true,
	unreviewed: [],
	...fields,
});
const finding = { path: 'src/a.ts', line: 12, severity: 'minor', body: 'Handle null.' };
const review = (fields: IDataObject = {}) => ({
	structuredOutput: { verdict: 'approve', findings: [], scopeCreep: [], ...fields },
});

describe('Read factory ticket', () => {
	const factoryLabel = { id: 'label-factory', name: 'factory' };
	const description = [
		'Show the number of runs on the workflow card.',
		'',
		'## Acceptance criteria',
		'- The card shows the number of runs.',
		'* [ ] The number is 0 without runs.',
		'1. A unit test covers both cases.',
		'',
		'## Notes',
		'- Not a criterion.',
	].join('\n');

	const issueEvent = (event: IDataObject = {}, issue: IDataObject = {}) => ({
		action: 'create',
		type: 'Issue',
		url: 'https://linear.app/acme/issue/ENG-42',
		data: {
			id: 'issue-42',
			identifier: 'ENG-42',
			title: 'Show the run count',
			description,
			url: 'https://linear.app/acme/issue/ENG-42/show-the-run-count',
			labels: [factoryLabel],
			...issue,
		},
		...event,
	});

	const readTicket = (event: IDataObject) =>
		runtime.runCode('Read factory ticket', {
			nodes: { 'Linear Trigger': event, 'Factory settings': { defaultDiffBudget: 400 } },
			executionId: '1234',
		});

	const ticketItems = z.array(
		z.object({
			json: z.object({ acceptanceCriteria: z.array(z.string()), diffBudget: z.number() }),
		}),
	);

	const criteriaOf = (text: string) =>
		ticketItems.parse(readTicket(issueEvent({}, { description: text })))[0].json.acceptanceCriteria;

	it('starts a run for a new issue with the factory label, on a branch of its own', () => {
		expect(readTicket(issueEvent())).toEqual([
			{
				json: {
					ticketId: 'issue-42',
					ticket: 'ENG-42',
					title: 'Show the run count',
					description,
					url: 'https://linear.app/acme/issue/ENG-42/show-the-run-count',
					acceptanceCriteria: [
						'The card shows the number of runs.',
						'The number is 0 without runs.',
						'A unit test covers both cases.',
					],
					diffBudget: 400,
					branch: 'factory/eng-42-1234',
					runKey: 'factory-1234',
				},
			},
		]);
	});

	it('starts a run when an update adds the factory label', () => {
		const event = issueEvent({ action: 'update', updatedFrom: { labelIds: ['label-other'] } });

		expect(readTicket(event)).toHaveLength(1);
	});

	it.each([
		[
			'an update that keeps the label',
			{ action: 'update', updatedFrom: { labelIds: ['label-factory'] } },
			{},
		],
		[
			'an update that does not change labels',
			{ action: 'update', updatedFrom: { title: 'Old' } },
			{},
		],
		['an issue without the label', {}, { labels: [{ id: 'label-bug', name: 'bug' }] }],
		['an issue without labels', {}, { labels: undefined }],
		['a removed issue', { action: 'remove' }, {}],
		['a comment event', { type: 'Comment' }, {}],
	])('ignores %s', (_case, event, issue) => {
		expect(readTicket(issueEvent(event, issue))).toEqual([]);
	});

	it.each([
		['no section', 'Fix the bug.\n- A list item outside a section.', []],
		['an empty section', '## Acceptance criteria\n\n## Notes\n- Not a criterion.', []],
		[
			'a bold heading',
			'**Acceptance criteria:**\n- First\n- Second\n**Out of scope**\n- Third',
			['First', 'Second'],
		],
		[
			'another heading level and checked items',
			'### ACCEPTANCE CRITERIA\n- [x] Done\n- [ ] Open',
			['Done', 'Open'],
		],
		['text after the list', '## Acceptance criteria\n- A\n- B\n\nOut of scope:\n- C', ['A', 'B']],
		[
			'sub-items',
			'## Acceptance criteria\n- A\n  - detail\n  * more\n- B',
			['A; detail; more', 'B'],
		],
		[
			'a wrapped item',
			'## Acceptance criteria\n- A long\n  criterion\n- B',
			['A long criterion', 'B'],
		],
		['empty checkbox items', '## Acceptance criteria\n- [ ]\n- [ ] B\n- [x]', ['B']],
		['an introduction', '## Acceptance criteria\nThe change must:\n- A', ['A']],
		['blank lines between items', '## Acceptance criteria\n- A\n\n- B', ['A', 'B']],
		['an indented list', '## Acceptance criteria\n  - A\n  - B\nEnd.', ['A', 'B']],
		['Windows line ends', '## Acceptance criteria\r\n- A\r\n- B\r\n', ['A', 'B']],
	])('reads the acceptance criteria of a description with %s', (_case, text, criteria) => {
		expect(criteriaOf(text)).toEqual(criteria);
	});

	it('reads exactly the items of the first list below the heading', () => {
		const criterion = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ,.'()]{0,30}[A-Za-z0-9.)]$/);
		const marker = fc.constantFrom('- ', '* ', '+ ', '1. ', '2) ', '- [ ] ', '- [x] ', '* [X] ');
		const heading = fc.constantFrom(
			'## Acceptance criteria',
			'**Acceptance criteria:**',
			'### ACCEPTANCE CRITERIA',
		);
		const after = fc.constantFrom(
			'',
			'## Notes\n- Not a criterion.',
			'Out of scope:\n- Not a criterion.',
			'**Later**\n- No.',
		);
		const items = fc.array(fc.tuple(marker, criterion, fc.boolean()), {
			minLength: 1,
			maxLength: 6,
		});

		fc.assert(
			fc.property(heading, fc.boolean(), items, after, (title, intro, list, trailer) => {
				const body = list.flatMap(([prefix, text, blank]) => [
					prefix + text,
					...(blank ? [''] : []),
				]);
				const text = [title, ...(intro ? ['The change must:'] : []), ...body, trailer].join('\n');

				expect(criteriaOf(text)).toEqual(list.map(([, item]) => item));
			}),
			{ numRuns: 60 },
		);
	});

	it('reads the acceptance criteria of the example ticket in the README', () => {
		const example = /```markdown\n([\s\S]*?)```/.exec(readPackText('README.md'))?.[1] ?? '';

		expect(criteriaOf(example)).toEqual([
			'The workflow card shows the number of runs in the last 7 days.',
			'The number is 0 for a workflow without runs.',
			'A unit test covers both cases.',
		]);
	});

	it.each([
		['budget:150', 150],
		['Budget:75', 75],
		['budget:0', 400],
		['budget:many', 400],
	])('takes the diff budget from the label %s', (name, budget) => {
		const labels = [factoryLabel, { id: 'label-budget', name }];
		const [item] = ticketItems.parse(readTicket(issueEvent({}, { labels })));

		expect(item.json.diffBudget).toBe(budget);
	});
});

describe('Run record', () => {
	const ticket = { ticket: 'ENG-42', url: 'https://linear.app/acme/issue/ENG-42' };
	const records = z.array(z.object({ json: z.record(z.unknown()) })).length(1);
	const recordOf = (run: TemplateRun) => records.parse(runtime.runCode('Run record', run))[0].json;
	const opened = {
		status: 'draft_pr_opened',
		summary: 'Opened',
		prUrl: 'https://example.com/pr/1',
	};

	it('records the verdict and the changed lines of a run that opened a draft PR', () => {
		// Without an output index, n8n would read the error output of the critic from here.
		expect(runtime.defaultOutputIndex('Run record', 'Fresh critic')).toBe(1);

		const record = recordOf({
			nodes: {
				'Read factory ticket': ticket,
				Verify: checkResult({ changes: lines(99) }),
				'Fresh critic': review(),
				'Re-verify': checkResult({ changes: [...lines(10, 4), ...lines(6)] }),
			},
			json: opened,
			previousNode: 'Outcome: draft PR opened',
			executionId: '77',
		});

		expect(record).toEqual({
			ticket: 'ENG-42',
			ticketUrl: ticket.url,
			status: 'draft_pr_opened',
			summary: 'Opened',
			criticVerdict: 'approve',
			linesChanged: 20,
			prUrl: 'https://example.com/pr/1',
			executionId: '77',
			finishedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
		});
	});

	it('takes the changed lines of the first check when the check after Minimise failed', () => {
		const record = recordOf({
			nodes: { 'Read factory ticket': ticket, Verify: checkResult({ changes: lines(5) }) },
			failed: { 'Re-verify': { error: { message: 'Timeout' } }, 'Fresh critic': { error: 'No' } },
			json: { status: 'step_failed', summary: 'Failed' },
		});

		expect(record).toMatchObject({ linesChanged: 5, criticVerdict: '' });
	});

	it('takes the changed lines of the first check when Re-verify passed its input through', () => {
		const record = recordOf({
			nodes: {
				'Read factory ticket': ticket,
				Verify: checkResult({ changes: [null, ...lines(7, 2)] }),
				'Re-verify': { structuredOutput: { summary: 'Smaller.', removed: [] } },
			},
			json: { status: 'step_failed', summary: 'Failed' },
		});

		expect(record).toMatchObject({ linesChanged: 9 });
	});

	it('records no changed lines and no verdict when the run stops before the check', () => {
		const record = recordOf({
			nodes: { 'Read factory ticket': ticket },
			json: { status: 'missing_acceptance_criteria', summary: 'No criteria' },
		});

		expect(record).toMatchObject({ criticVerdict: '', linesChanged: 0, prUrl: '' });
	});
});

describe('messages', () => {
	it('sends the critic findings to the implementer in the review format of the coding view', () => {
		const text = textOf(
			'Address critic findings',
			assignmentOf('Address critic findings', 'request'),
			{
				json: review({
					verdict: 'request_changes',
					findings: [{ ...finding, severity: 'major' }],
					scopeCreep: ['Renamed b.ts'],
				}),
				nodes: earlierNodes,
			},
		);

		expect(text).toContain('src/a.ts:12 (new version)\n[major] Handle null.');
		expect(text).toContain('Remove this scope creep:\n- Renamed b.ts');
	});

	it('tells the implementer that the factory runs the failing test after its turn', () => {
		const text = textOf(
			'Implementation request',
			assignmentOf('Implementation request', 'request'),
			{
				nodes: { ...earlierNodes, Plan: { structuredOutput: { summary: 'Count.' } } },
			},
		);

		expect(text).toContain('`pnpm --filter n8n test test/unit/run-count.test.ts`');
		expect(text).toContain('the factory runs this test and the check command. Both must pass.');
	});

	it('gives the implementer both results and the log when the check fails', () => {
		const text = textOf('Fix the failing check', assignmentOf('Fix the failing check', 'request'), {
			json: checkResult({ test: 'failed', testExitCode: 1, logTail: 'Expected 1, got 0' }),
			nodes: earlierNodes,
		});

		expect(text).toContain('Check command: passed (exit code 0)');
		expect(text).toContain(
			'`pnpm --filter n8n test test/unit/run-count.test.ts`: failed (exit code 1)',
		);
		expect(text).toContain('Expected 1, got 0');
	});

	it('lets Minimise only remove changes, and leaves the findings to the person who reviews', () => {
		const text = textOf('Minimise', parameterOf('Minimise', 'message'), {
			nodes: {
				...earlierNodes,
				'Get diff': checkResult(),
				'Fresh critic': review({ findings: [finding], scopeCreep: ['Renamed b.ts'] }),
			},
		});

		expect(text).toContain('you can only remove changes');
		expect(text).toContain('Do not add, rewrite or move code. Do not fix findings.');
		expect(text).toContain('A file or a line that the critic did not review stops the run.');
		expect(text).toContain('The change now has 40 changed lines.');
		expect(text).toContain('- Remove this scope creep: Renamed b.ts');
		expect(text).not.toContain('Handle null.');
	});

	it('counts no changed lines for Minimise when the diff has no list of changes', () => {
		const text = textOf('Minimise', parameterOf('Minimise', 'message'), {
			nodes: {
				...earlierNodes,
				'Get diff': { structuredContent: { diff: 'diff', changes: 'many' } },
				'Fresh critic': review(),
			},
		});

		expect(text).toContain('The change now has 0 changed lines.');
	});

	describe('follow-up requests', () => {
		// Each follow-up request holds what the agent needs. So a run also works when the agent has
		// no memory of the session, for example after a person created it without memory.
		const criteria = ['The card shows the number of runs.', 'The number is 0 without runs.'];
		const numbered = '1. The card shows the number of runs.\n2. The number is 0 without runs.';
		const nodes = {
			...earlierNodes,
			'Read factory ticket': { ...ticketOutput, acceptanceCriteria: criteria },
		};
		const { testPath, runCommand } = failingTestOutput.structuredOutput;

		it('gives the planner its last plan and the feedback when a person asks for changes', () => {
			const lastPlan = { summary: 'Count the runs.', steps: ['Add a counter.'], files: ['a.ts'] };
			const decision = { data: { decision: 'Change the plan', feedback: 'Reuse helper X.' } };
			const revisionRun = { nodes: { Plan: { structuredOutput: lastPlan } }, json: decision };
			const revision = {
				feedback: textOf('Revise plan', assignmentOf('Revise plan', 'feedback'), revisionRun),
				lastPlan: textOf('Revise plan', assignmentOf('Revise plan', 'lastPlan'), revisionRun),
			};
			const messageFor = (json: IDataObject) =>
				textOf('Plan', parameterOf('Plan', 'message'), { nodes, json });

			const revised = messageFor(revision);

			expect(revised).toContain(numbered);
			expect(revised).toContain(`Your last plan:\n${JSON.stringify(lastPlan, null, 2)}`);
			expect(revised).toContain('Feedback of the reviewer:\nReuse helper X.');
			expect(revised).toContain('Change the plan to address the feedback and keep the rest.');
			expect(messageFor(nodes['Read factory ticket'])).not.toContain('Your last plan');
		});

		it.each([
			['Minimise', () => parameterOf('Minimise', 'message'), { 'Get diff': checkResult() }, {}],
			[
				'Fix the failing check',
				() => assignmentOf('Fix the failing check', 'request'),
				{},
				checkResult({ test: 'failed', testExitCode: 1, logTail: 'Expected 1, got 0' }),
			],
			[
				'Address critic findings',
				() => assignmentOf('Address critic findings', 'request'),
				{},
				review({ verdict: 'request_changes', findings: [finding] }),
			],
		])(
			'gives the implementer the ticket, the criteria and the failing test in "%s"',
			(nodeName, valueOf, extraNodes, json) => {
				const text = textOf(nodeName, valueOf(), {
					nodes: { ...nodes, 'Fresh critic': review(), ...extraNodes },
					json,
				});

				expect(text).toContain('Ticket ENG-42: Show the run count');
				expect(text).toContain(numbered);
				expect(text).toContain(testPath);
				expect(text).toContain(`\`${runCommand}\``);
			},
		);

		it('keeps the end of the log last in the request after a failed check', () => {
			const text = textOf(
				'Fix the failing check',
				assignmentOf('Fix the failing check', 'request'),
				{
					json: checkResult({ test: 'failed', logTail: 'Expected 1, got 0' }),
					nodes,
				},
			);

			expect(text.indexOf('Expected 1, got 0')).toBeGreaterThan(text.indexOf(numbered));
			expect(text.trimEnd().endsWith('Expected 1, got 0\n```')).toBe(true);
		});
	});

	describe('pull request body', () => {
		const bodyWith = (critic: IDataObject) =>
			textOf('Open draft PR', parameterOf('Open draft PR', 'body'), {
				nodes: {
					...earlierNodes,
					Minimise: { structuredOutput: { summary: 'Counts runs.', removed: [] } },
					Implement: { structuredOutput: { summary: 'Older summary.' } },
					'Compare with approved change': comparison(),
					'Fresh critic': critic,
					'Push branch': {
						structuredContent: { pushed: true, branch: ticketOutput.branch, commit: sha },
					},
				},
			});

		it('reports the checks, the failing test, the critic and the commit', () => {
			const body = bodyWith(review());

			expect(body).toMatch(/^Counts runs\.\n/);
			expect(body).toContain('- [ ] The card shows the number of runs.');
			expect(body).toContain('- Deterministic check: passed');
			expect(body).toContain(
				'- Failing test `pnpm --filter n8n test test/unit/run-count.test.ts`: passed',
			);
			expect(body).toContain('- Changed lines: 40 of 100');
			expect(body).toContain(
				'- Minimise: each changed file and line is in the change that the critic approved',
			);
			expect(body).toContain('- Fresh critic: approve (0 findings)');
			expect(body).toContain(`- Commit: ${sha}`);
			expect(body).not.toContain('Critic findings to check');
		});

		it('lists the critic findings that nobody fixed', () => {
			expect(bodyWith(review({ findings: [finding] }))).toContain(
				'## Critic findings to check\n- `src/a.ts:12` [minor] Handle null.',
			);
		});
	});
});

describe('critic input', () => {
	it('gives the critic the command and the path of the failing test next to the check', () => {
		const check = configured.evaluate('Critic input', assignmentOf('Critic input', 'check'), {
			nodes: { ...earlierNodes, Verify: checkResult({ test: 'failed' }) },
		});

		expect(check).toMatchObject({
			check: 'passed',
			test: 'failed',
			testCommand: failingTestOutput.structuredOutput.runCommand,
			testPath: failingTestOutput.structuredOutput.testPath,
		});
	});
});

describe('outcomes', () => {
	const summary = (outcome: string, run: TemplateRun) =>
		textOf(outcome, assignmentOf(outcome, 'summary'), run);

	it('names the failed step and its error', () => {
		const failure = (previousNode: string, error: IDataObject['error']) =>
			summary('Outcome: step failed', { json: { error }, previousNode });

		expect(failure('Push branch', { message: 'Connection refused' })).toBe(
			'The step "Push branch" did not finish: Connection refused',
		);
		expect(failure('Implement', 'The agent stopped.')).toBe(
			'The step "Implement" did not finish: The agent stopped.',
		);
	});

	it('names the gate that found no usable result', () => {
		expect(
			summary('Outcome: step failed', { json: checkResult(), previousNode: 'Branch pushed?' }),
		).toBe('The gate "Branch pushed?" found no usable result of the step before it.');
	});

	it('names the diff that does not show every changed file, and an empty diff', () => {
		const partial = summary('Outcome: step failed', {
			json: {
				diffProblems: [
					'a.ts: missing from the diff',
					'b.ts: missing from the diff',
					'c.ts: x',
					'd.ts: y',
				],
				structuredContent: { diff: 'diff', changes: [] },
			},
			previousNode: 'Has a diff?',
		});
		const empty = summary('Outcome: step failed', {
			json: { diffProblems: [], structuredContent: { diff: ' \n' } },
			previousNode: 'Has a diff?',
		});
		const unusable = summary('Outcome: step failed', {
			json: { structuredContent: { diff: 7 } },
			previousNode: 'Has a diff?',
		});
		const withoutTest = summary('Outcome: step failed', {
			json: { diffProblems: [], testListed: false, structuredContent: { diff: 'diff' } },
			previousNode: 'Has a diff?',
			nodes: earlierNodes,
		});

		expect(partial).toBe(
			'The diff does not show every changed file, so the critic would review only part of the change: a.ts: missing from the diff; b.ts: missing from the diff; c.ts: x.',
		);
		expect(empty).toBe('The implementer made no change, so the critic has nothing to review.');
		expect(unusable).toBe('The gate "Has a diff?" found no usable diff.');
		expect(withoutTest).toBe(`The change does not include the failing test ${FAILING_TEST_PATH}.`);
	});

	it('does not blame the diff when Get diff failed as a whole', () => {
		// n8n sends the Verify result on, without a diff. The gate "Has a diff?" then sees no diff.
		const failed = summary('Outcome: step failed', {
			json: {
				diffProblems: ['a.ts: missing from the diff'],
				structuredContent: { check: 'passed', changes: lines(3) },
			},
			previousNode: 'Has a diff?',
		});

		expect(failed).toBe('The gate "Has a diff?" found no usable diff.');
	});

	it('reports both results of a failed check and why it got no retry', () => {
		const failed = (runIndex: number, fields: IDataObject) =>
			summary('Outcome: check failed', {
				json: { structuredContent: fields },
				previousNode: 'Check result',
				previousNodeRun: runIndex,
			});

		expect(failed(3, { check: 'failed', checkExitCode: 2, test: 'passed', testExitCode: 0 })).toBe(
			'The deterministic check did not pass (check: failed, exit code 2; failing test: passed, exit code 0). Only the first 3 checks of a run can get a retry, and this was check 4.',
		);
		expect(failed(5, { check: 'failed' })).toContain('and this was check 6.');
		expect(failed(0, { check: 'not_started' })).toBe(
			'The deterministic check did not pass (check: not_started, exit code none; failing test: no result, exit code none).',
		);
	});

	it('reports why a minimised change gets no pull request', () => {
		const notReady = (fields: IDataObject) =>
			summary('Outcome: not ready for PR', { json: comparison(fields), nodes: earlierNodes });
		const unreviewed = Array.from({ length: 7 }, (_, index) => `a.ts: +call${index}();`);

		expect(notReady({ test: 'failed', changedLines: 30, approvedLines: 25 })).toBe(
			'After minimising, the check is passed, the failing test is failed and the change has 30 changed lines (budget 100, the critic approved 25).',
		);
		expect(notReady({ testListed: false, changedLines: 40, approvedLines: 41 })).toBe(
			`After minimising, the check is passed, the failing test is passed and the change has 40 changed lines (budget 100, the critic approved 41). The change does not hold the failing test ${FAILING_TEST_PATH}.`,
		);
		expect(notReady({ check: '', unreviewed: unreviewed.slice(0, 2) })).toBe(
			'After minimising, the check is unknown, the failing test is passed and the change has 40 changed lines (budget 100, the critic approved 40). The critic did not review 2 of the changes:\n- a.ts: +call0();\n- a.ts: +call1();',
		);
		expect(notReady({ unreviewed })).toMatch(
			/The critic did not review 7 of the changes:\n(- a\.ts: \+call[0-4]\(\);\n){5}- and 2 more$/,
		);
	});

	it('reports the verdict or the error of the critic', () => {
		const blocked = (json: IDataObject) => summary('Outcome: critic blocked', { json });

		expect(blocked({ error: 'Rate limit' })).toBe(
			'The fresh critic returned no verdict: Rate limit',
		);
		expect(blocked(review({ verdict: 'block', findings: [finding, finding] }))).toBe(
			'The fresh critic did not approve the change (verdict: block, 2 findings, 0 of them blocker or major).',
		);
		// An approval with a serious finding is no approval. The text says why.
		const major = { ...finding, severity: 'major' };
		expect(blocked(review({ verdict: 'approve', findings: [major, finding] }))).toBe(
			'The fresh critic did not approve the change (verdict: approve, 2 findings, 1 of them blocker or major).',
		);
	});

	it('reports the decision of the person or the timeout', () => {
		const decided = (json: IDataObject) => summary('Outcome: plan not approved', { json });

		expect(decided({ data: { decision: 'Reject the ticket', feedback: 'Too big.' } })).toBe(
			'The reviewer chose: Reject the ticket. Feedback: Too big.',
		);
		expect(decided({})).toBe('Nobody approved the plan in time.');
	});

	it('tells the owner of the workflow how to fix the agent setup', () => {
		expect(summary('Outcome: setup error', {})).toContain(
			'Choose the critic agent in the workflow',
		);
	});

	it('records the link of the draft pull request', () => {
		const prUrl = configured.evaluate(
			'Outcome: draft PR opened',
			assignmentOf('Outcome: draft PR opened', 'prUrl'),
			{
				json: { html_url: 'https://github.com/acme/factory/pull/7', draft: true },
			},
		);

		expect(prUrl).toBe('https://github.com/acme/factory/pull/7');
	});
});
