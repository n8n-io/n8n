import fc from 'fast-check';
import { jsonParse, type IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { nodeByName, readPackText } from './factory-pack-files';
import {
	AGENT_IDS,
	MCP_CLIENT,
	configured,
	earlierNodes,
	failingTestOutput,
	parameterOf,
	runtime,
	settingsOutput,
	ticketOutput,
	workflow,
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
	unreviewed: [],
	...fields,
});
const finding = { path: 'src/a.ts', line: 12, severity: 'minor', body: 'Handle null.' };
const review = (fields: IDataObject = {}) => ({
	structuredOutput: { verdict: 'approve', findings: [], scopeCreep: [], ...fields },
});

/** The value of one field of a Set node. */
function assignmentOf(nodeName: string, field: string): unknown {
	const assignments = z
		.object({
			assignments: z.object({
				assignments: z.array(z.object({ name: z.string(), value: z.unknown() })),
			}),
		})
		.parse(nodeByName(workflow, nodeName).parameters).assignments.assignments;
	const match = assignments.find((assignment) => assignment.name === field);
	if (!match) throw new Error(`"${nodeName}" sets no field "${field}"`);
	return match.value;
}

const textOf = (nodeName: string, value: unknown, run: TemplateRun) =>
	z.string().parse(configured.evaluate(nodeName, value, run));

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

describe('MCP tool calls', () => {
	/** The rows of the tool table in the README: name, input fields and result text. */
	const toolTable = new Map(
		[...readPackText('README.md').matchAll(/^\| `(coding_\w+)` +\| ([^|]+)\| ([^|]+)\|$/gm)].map(
			([, tool, input, result]) => [
				tool,
				{ input: [...input.matchAll(/`(\w+)`/g)].map((match) => match[1]), result },
			],
		),
	);
	const mcpNodes = workflow.nodes.filter((node) => node.type === MCP_CLIENT);
	const inputOf = (nodeName: string) =>
		z
			.record(z.unknown())
			.parse(
				jsonParse(textOf(nodeName, parameterOf(nodeName, 'jsonInput'), { nodes: earlierNodes })),
			);
	const toolOf = (nodeName: string) =>
		z.object({ value: z.string() }).parse(parameterOf(nodeName, 'tool')).value;

	it('documents the four proposed tools', () => {
		expect([...toolTable.keys()]).toEqual([
			'coding_prepare',
			'coding_check',
			'coding_diff',
			'coding_push',
		]);
		expect(new Set(mcpNodes.map((node) => toolOf(node.name)))).toEqual(new Set(toolTable.keys()));
	});

	it.each(mcpNodes.map((node) => node.name))('%s sends the input that the README shows', (name) => {
		const input = inputOf(name);

		expect(Object.keys(input)).toEqual(toolTable.get(toolOf(name))?.input);
		expect(input).toMatchObject({
			agentId: AGENT_IDS.implementer,
			session: 'factory-1234-implement',
		});
	});

	it('works on the branch of the run and runs the failing test', () => {
		const branch = { branch: ticketOutput.branch };
		const testCommand = failingTestOutput.structuredOutput.runCommand;

		expect(inputOf('Prepare workspace')).toMatchObject({ ...branch, baseBranch: 'master' });
		expect(inputOf('Push branch')).toMatchObject({
			...branch,
			message: 'ENG-42: Show the run count',
		});
		expect(inputOf('Verify')).toMatchObject({ testCommand });
		expect(inputOf('Re-verify')).toMatchObject({ testCommand });
	});

	it('reads only result fields that the README documents', () => {
		const fields = new Set(
			[...JSON.stringify(workflow.nodes).matchAll(/structuredContent\??\.(\w+)/g)].map(
				(match) => match[1],
			),
		);
		const documented = [...toolTable.values()].map((row) => row.result).join(' ');

		expect(fields.size).toBeGreaterThan(8);
		expect([...fields].filter((field) => !documented.includes(`\`${field}\``))).toEqual([]);
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

	describe('Outcome: prep failed', () => {
		const repository = 'https://github.com/acme/factory';
		const prepRun = (workspace: IDataObject, test: IDataObject) => ({
			nodes: {
				'Factory settings': settingsOutput,
				'Prepare workspace': workspace,
				'Draft failing test': test,
			},
		});
		const workspaceOn = (repositoryUrl: unknown, phase: unknown = 'ready') => ({
			structuredContent: { phase, repositoryUrl },
		});
		const testWith = (fields: IDataObject) => ({
			structuredOutput: { ...failingTestOutput.structuredOutput, ...fields },
		});

		it.each([
			[
				'the error of the workspace step',
				{ error: { message: 'Unknown tool: coding_prepare' } },
				failingTestOutput,
				'Workspace: Unknown tool: coding_prepare. Failing test: ready.',
			],
			[
				'the phase of the workspace and a missing test',
				{ structuredContent: { phase: 'error' } },
				{ structuredOutput: null },
				'Workspace: phase error. Failing test: no test.',
			],
			[
				'the error of the planner',
				workspaceOn(repository),
				{ error: 'The agent stopped.' },
				'Workspace: ready. Failing test: The agent stopped.',
			],
			[
				'a workspace on another repository',
				workspaceOn('https://github.com/n8n-io/n8n'),
				failingTestOutput,
				`Workspace: the repository is https://github.com/n8n-io/n8n, not ${repository}.`,
			],
			[
				'a run command that does not name the test',
				workspaceOn(repository),
				testWith({ runCommand: 'pnpm test' }),
				'Failing test: the run command does not name packages/cli/test/unit/run-count.test.ts.',
			],
			[
				'a test path without a file name',
				workspaceOn(repository),
				testWith({ testPath: 'packages/cli/test/', runCommand: 'pnpm test' }),
				'Failing test: the test path packages/cli/test/ names no file.',
			],
		])('explains a failed preparation with %s', (_case, workspace, test, expected) => {
			const text = summary('Outcome: prep failed', prepRun(workspace, test));

			expect(text).toMatch(/^The preparation did not finish\. /);
			expect(text).toContain(expected);
		});

		it('says "ready" for both parts exactly when the gate "Prep ready?" passes', () => {
			const workspace = fc.oneof(
				fc.record({ error: fc.constantFrom('No tool', { message: 'Timeout' }) }),
				fc
					.tuple(
						fc.constantFrom<unknown>('ready', 'error', undefined, ['ready']),
						fc.constantFrom<unknown>(
							repository,
							'https://github.com/ACME/factory.git/',
							'https://github.com/acme/factory-old',
							undefined,
							7,
							[repository],
						),
					)
					.map(([phase, repositoryUrl]) => workspaceOn(repositoryUrl, phase)),
			);
			const test = fc.oneof(
				fc.record({ error: fc.constantFrom('The agent stopped.', { message: 'Rate limit' }) }),
				fc.constant({ structuredOutput: null }),
				fc
					.tuple(
						fc.constantFrom<unknown>(
							'a/run.test.ts',
							' a/run.test.ts',
							'a/',
							'  ',
							'',
							7,
							undefined,
						),
						fc.constantFrom<unknown>(
							'pnpm test a/run.test.ts',
							'pnpm test',
							'pnpm test 7',
							7,
							undefined,
						),
					)
					.map(([testPath, runCommand]) => ({ structuredOutput: { testPath, runCommand } })),
			);

			fc.assert(
				fc.property(workspace, test, (workspaceJson, testJson) => {
					const run = prepRun(workspaceJson, testJson);
					const text = summary('Outcome: prep failed', run);

					expect(text.endsWith('Workspace: ready. Failing test: ready.')).toBe(
						configured.passesIf('Prep ready?', run),
					);
				}),
				{ numRuns: 150 },
			);
		});
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
			summary('Outcome: not ready for PR', { json: comparison(fields) });
		const unreviewed = Array.from({ length: 7 }, (_, index) => `a.ts: +call${index}();`);

		expect(notReady({ test: 'failed', changedLines: 30, approvedLines: 25 })).toBe(
			'After minimising, the check is passed, the failing test is failed and the change has 30 changed lines (budget 100, the critic approved 25).',
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
			'The fresh critic did not approve the change (verdict: block, 2 findings).',
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
