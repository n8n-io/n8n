import type { IDataObject } from 'n8n-workflow';

import type { TemplateRun } from './factory-pack-runtime';
import {
	AGENT_IDS,
	CHOSEN_AGENTS,
	configured,
	earlierNodes,
	failingTestOutput,
	runtime,
	ticketOutput,
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
		])('stops the run when the critic is %s', (_case, patches) => {
			expect(separate(patches)).toBe(false);
		});

		it('stops the run when nobody chose the agents after the import', () => {
			expect(runtime.passesIf('Critic is separate?', { json: ticketOutput })).toBe(false);
		});
	});

	it('needs acceptance criteria', () => {
		const run = (criteria: string[]) => ({ json: { ...ticketOutput, acceptanceCriteria: criteria } });

		expect(configured.passesIf('Has acceptance criteria?', run(['One']))).toBe(true);
		expect(configured.passesIf('Has acceptance criteria?', run([]))).toBe(false);
	});

	it('asks a person only about a plan with a summary and steps', () => {
		const ready = (structuredOutput: IDataObject | null) =>
			configured.passesIf('Plan ready?', { json: { structuredOutput } });

		expect(ready(plan)).toBe(true);
		expect(ready({ ...plan, summary: '' })).toBe(false);
		expect(ready({ ...plan, steps: [] })).toBe(false);
		// Message an Agent returns null when the agent gives no structured output.
		expect(ready(null)).toBe(false);
	});

	it('continues after the approval only on an explicit approval', () => {
		const decide = (data?: Record<string, string>) =>
			configured.routeOf('Plan decision', { json: data ? { data } : {} });

		expect(decide({ decision: 'Approve the plan' })).toBe(0);
		expect(decide({ decision: 'Change the plan', feedback: 'Smaller' })).toBe(1);
		expect(decide({ decision: 'Reject the ticket' })).toBe('fallback');
		// The wait time ran out: Slack resumes without a decision.
		expect(decide()).toBe('fallback');
	});

	describe('Prep ready?', () => {
		const prep = (workspace: IDataObject, test: IDataObject) =>
			configured.passesIf('Prep ready?', {
				nodes: { 'Prepare workspace': workspace, 'Draft failing test': test },
				json: test,
			});
		const ready = { structuredContent: { phase: 'ready' } };
		const testWith = (fields: IDataObject) => ({
			structuredOutput: { ...failingTestOutput.structuredOutput, ...fields },
		});

		it('starts the implementation when the workspace and the failing test are ready', () => {
			expect(prep(ready, failingTestOutput)).toBe(true);
		});

		it.each([
			['the workspace is in error', { structuredContent: { phase: 'error' } }, failingTestOutput],
			['the workspace step failed', { error: { message: 'No tool' } }, failingTestOutput],
			['the test has no path', ready, testWith({ testPath: '' })],
			['the command does not name the test file', ready, testWith({ runCommand: 'pnpm test' })],
			['the planner failed', ready, { error: 'The agent stopped.' }],
			['the planner returned no test', ready, { structuredOutput: null }],
		])('stops when %s', (_case, workspace, test) => {
			expect(prep(workspace, test)).toBe(false);
		});
	});

	describe('Check result', () => {
		const check = (fields: IDataObject, runIndex = 0) =>
			configured.routeOf('Check result', { json: checkResult(fields), runIndex });

		it('continues only when the check and the failing test pass', () => {
			expect(check({}, 3)).toBe(0);
		});

		it('retries when the check or the failing test fails, at most 3 times', () => {
			const failures = [{ check: 'failed' }, { test: 'failed' }, { check: 'failed', test: 'failed' }];

			for (const failure of failures) {
				expect([0, 1, 2].map((runIndex) => check(failure, runIndex))).toEqual([1, 1, 1]);
				expect(check(failure, 3)).toBe('fallback');
			}
		});

		it('counts the retries for the whole run, also after a critic round', () => {
			// Three failed checks, a pass and a critic round: the next check is the fifth run.
			expect(check({ check: 'failed' }, 4)).toBe('fallback');
		});

		it.each([
			['a check that did not start', { check: 'not_started' }],
			['a test that did not run', { test: 'not_started' }],
			['a missing test result', { test: undefined }],
			['a check that stopped', { check: 'stopped' }],
		])('never retries %s', (_case, fields) => {
			expect(check(fields)).toBe('fallback');
		});

		it('never retries a missing result', () => {
			expect(configured.routeOf('Check result', { json: {} })).toBe('fallback');
		});
	});

	it('reviews only a change that has a diff', () => {
		const hasDiff = (structuredContent?: IDataObject) =>
			configured.passesIf('Has a diff?', { json: structuredContent ? { structuredContent } : {} });

		expect(hasDiff({ diff: 'diff --git a/a.ts b/a.ts', changes: lines(1) })).toBe(true);
		expect(hasDiff({ diff: '', changes: [] })).toBe(false);
		expect(hasDiff()).toBe(false);
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
		const finding = (severity: string) => ({ path: 'a.ts', line: 1, severity, body: 'Fix it' });

		expect(review({ verdict: 'approve', findings: [finding('minor')], scopeCreep: [] })).toBe(0);
		expect(review({ verdict: 'approve', findings: [finding('major')], scopeCreep: [] })).toBe(
			'fallback',
		);
		expect(review({ verdict: 'approve', findings: [finding('blocker')], scopeCreep: [] })).toBe(
			'fallback',
		);
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
		const ready = (fields: IDataObject, reviewed = lines(60, 40)) =>
			configured.passesIf('Ready for PR?', {
				json: checkResult(fields),
				nodes: { ...earlierNodes, 'Get diff': { structuredContent: { changes: reviewed } } },
			});

		it('opens a pull request for a passing change that fits the budget and did not grow', () => {
			expect(ready({ changes: lines(60, 40) })).toBe(true);
			expect(ready({ changes: lines(10, 5) })).toBe(true);
		});

		it.each([
			['the check failed', { check: 'failed', changes: lines(1) }],
			['the failing test failed', { test: 'failed', changes: lines(1) }],
			['the test result is missing', { test: undefined, changes: lines(1) }],
			['the change is empty', { changes: [] }],
			['the change is over the budget', { changes: lines(61, 40) }],
		])('stops when %s', (_case, fields) => {
			expect(ready(fields)).toBe(false);
		});

		it('stops when minimising made the change larger than the change that the critic approved', () => {
			expect(ready({ changes: lines(21) }, lines(20))).toBe(false);
			expect(ready({ changes: lines(20) }, lines(20))).toBe(true);
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

	describe('a step that fails as a whole', () => {
		// n8n then sends the input item of the step to its success output. The gate after the step
		// gets that item and must stop.
		const passes = (gate: string, run: TemplateRun) =>
			gate === 'Check result' || gate === 'Critic verdict'
				? configured.routeOf(gate, run) === 0
				: configured.passesIf(gate, run);
		const approval = { data: { decision: 'Approve the plan' } };

		it.each([
			['Plan', 'Plan ready?', { json: ticketOutput }],
			['Prepare workspace', 'Prep ready?', { nodes: { ...earlierNodes, 'Prepare workspace': approval } }],
			['Draft failing test', 'Prep ready?', { nodes: { 'Prepare workspace': { structuredContent: { phase: 'ready' } }, 'Draft failing test': approval } }],
			['Verify', 'Check result', { json: { structuredOutput: { summary: 'Done.' } } }],
			['Get diff', 'Has a diff?', { json: checkResult() }],
			['Fresh critic', 'Critic verdict', { json: { diff: 'diff --git a/a.ts b/a.ts' }, nodes: { 'Critic input': { diff: 'diff' } } }],
			['Re-verify', 'Ready for PR?', { json: { structuredOutput: { summary: 'Smaller.', removed: [] } }, nodes: { ...earlierNodes, 'Get diff': checkResult() } }],
			['Push branch', 'Branch pushed?', { json: checkResult(), nodes: earlierNodes }],
		])('stops the run when %s fails as a whole', (_step, gate, run) => {
			expect(passes(gate, run)).toBe(false);
		});
	});
});
