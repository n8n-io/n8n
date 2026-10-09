import fc from 'fast-check';
import type { GenericValue, IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import {
	assignmentOf,
	configured,
	failingTestOutput,
	settingsOutput,
	textOf,
	workflow,
} from './factory-pack-fixtures';

/**
 * The prep gate. "Check prep" holds the rules for the workspace and for the run command of the
 * failing test. "Prep ready?" and the outcome "prep failed" read only the facts that it returns.
 */

const REPOSITORY = 'https://github.com/acme/factory';
const TEST_PATH = 'pkg/a.test.ts';

const prepFacts = z
	.array(z.object({ json: z.object({ workspaceProblem: z.string(), testProblem: z.string() }) }))
	.length(1);

/** The facts that "Check prep" returns for the results of the two prep steps. */
function factsOf(workspace: IDataObject, test: IDataObject) {
	const output = configured.runCode('Check prep', {
		nodes: {
			'Factory settings': settingsOutput,
			'Prepare workspace': workspace,
			'Draft failing test': test,
		},
	});
	return prepFacts.parse(output)[0].json;
}

/** Whether "Prep ready?" starts the implementation for an item. */
const passes = (json: IDataObject) => configured.passesIf('Prep ready?', { json });
const prepReady = (workspace: IDataObject, test: IDataObject) => passes(factsOf(workspace, test));
const summaryOf = (json: IDataObject) =>
	textOf('Outcome: prep failed', assignmentOf('Outcome: prep failed', 'summary'), { json });

const workspaceOn = (repositoryUrl: GenericValue, phase: GenericValue = 'ready') => ({
	structuredContent: { phase, repositoryUrl },
});
const ready = workspaceOn(REPOSITORY);
const testWith = (fields: IDataObject) => ({
	structuredOutput: { ...failingTestOutput.structuredOutput, ...fields },
});
const commandFor = (runCommand: string) => testWith({ testPath: TEST_PATH, runCommand });
const targetsOf = (name: string) =>
	(workflow.connections[name]?.main ?? []).map((targets) => targets?.map((target) => target.node));

describe('software factory prep', () => {
	it('sends the facts of "Check prep" through the gate, and a failed check to "step failed"', () => {
		expect(targetsOf('Repro and workspace done')).toEqual([['Check prep']]);
		expect(targetsOf('Check prep')).toEqual([['Prep ready?'], ['Outcome: step failed']]);
		expect(targetsOf('Prep ready?')).toEqual([
			['Implementation request'],
			['Outcome: prep failed'],
		]);
	});

	describe('Prep ready?', () => {
		it('starts the implementation when the workspace and the failing test are ready', () => {
			expect(factsOf(ready, failingTestOutput)).toEqual({ workspaceProblem: '', testProblem: '' });
			expect(prepReady(ready, failingTestOutput)).toBe(true);
		});

		it.each([
			'https://github.com/Acme/Factory',
			'https://github.com/acme/factory.git',
			'https://github.com/acme/factory/',
			' https://github.com/acme/factory.git// ',
		])('accepts the repository of the pull request as %s', (repositoryUrl) => {
			expect(prepReady(workspaceOn(repositoryUrl), failingTestOutput)).toBe(true);
		});

		it.each([
			['the file name of the test', 'pnpm test a.test.ts'],
			['the path of the test', 'pnpm test pkg/a.test.ts --run'],
			['the path quoted', "pnpm test 'pkg/a.test.ts'"],
			['a chain that runs the test first, with &&', 'pnpm test pkg/a.test.ts && echo done'],
			['a change of directory before the test', 'cd packages/cli && pnpm test pkg/a.test.ts'],
		])('accepts a command that names the test file as %s', (_case, runCommand) => {
			expect(prepReady(ready, commandFor(runCommand))).toBe(true);
		});

		it.each([
			['the workspace is in error', { structuredContent: { phase: 'error' } }, failingTestOutput],
			['the workspace step failed', { error: { message: 'No tool' } }, failingTestOutput],
			[
				'the workspace step failed, though it says ready',
				{ ...ready, error: 'x' },
				failingTestOutput,
			],
			[
				'the workspace is on another repository',
				workspaceOn('https://github.com/n8n-io/n8n'),
				failingTestOutput,
			],
			[
				'the workspace repository only starts the same',
				workspaceOn(`${REPOSITORY}-old`),
				failingTestOutput,
			],
			['the workspace names no repository', workspaceOn(undefined), failingTestOutput],
			['the test has no path', ready, testWith({ testPath: '' })],
			['the test path is not text', ready, testWith({ testPath: 7, runCommand: 'pnpm test 7' })],
			[
				'the test path names no file',
				ready,
				testWith({ testPath: 'pkg/', runCommand: 'pnpm test pkg/' }),
			],
			['the test path is blank', ready, testWith({ testPath: '  ', runCommand: 'pnpm test  ' })],
			['the command does not name the test file', ready, testWith({ runCommand: 'pnpm test' })],
			['the command names a file with the same end', ready, commandFor('pnpm test pkg/ba.test.ts')],
			[
				'the command only mentions the file name in another word',
				ready,
				commandFor('true # xa.test.ts'),
			],
			['the file name sits in a shell comment', ready, commandFor('true # pkg/a.test.ts')],
			[
				'a command that succeeds after the test',
				ready,
				commandFor('pnpm test pkg/a.test.ts ; true'),
			],
			['a fallback after the test', ready, commandFor('pnpm test pkg/a.test.ts || true')],
			[
				'a pipe, whose exit code is the one of its last command',
				ready,
				commandFor('pnpm test pkg/a.test.ts | tee log'),
			],
			['a test that runs in the background', ready, commandFor('pnpm test pkg/a.test.ts &')],
			['a second line after the test', ready, commandFor('pnpm test pkg/a.test.ts\ntrue')],
			[
				'a negation of the test, which passes when the test fails',
				ready,
				commandFor('! pnpm test pkg/a.test.ts'),
			],
			['a negation after a chain', ready, commandFor('true && ! pnpm test pkg/a.test.ts')],
			[
				'a command that exits before the test',
				ready,
				commandFor('exit 0 && pnpm test pkg/a.test.ts'),
			],
			['the planner failed', ready, { error: 'The agent stopped.' }],
			['the planner returned no test', ready, { structuredOutput: null }],
		])('stops when %s', (_case, workspace, test) => {
			expect(prepReady(workspace, test)).toBe(false);
		});

		it.each([
			['Prepare workspace', 'Draft failing test'],
			['Draft failing test', 'Prepare workspace'],
		])('stops the run when %s fails as a whole', (failed) => {
			// n8n then sends the input item of the step to its success output.
			const approval = { data: { decision: 'Approve the plan' } };
			const workspace = failed === 'Prepare workspace' ? approval : ready;
			const test = failed === 'Draft failing test' ? approval : failingTestOutput;

			expect(prepReady(workspace, test)).toBe(false);
		});

		it.each([
			['an item without facts', {}],
			['the input of "Check prep"', failingTestOutput],
			['facts of the wrong type', { workspaceProblem: 0, testProblem: null }],
			['facts in a list', { workspaceProblem: [''], testProblem: [''] }],
			['only one empty problem', { workspaceProblem: '', testProblem: 'no test' }],
		])('stops for %s and does not throw', (_case, json) => {
			expect(() => passes(json)).not.toThrow();
			expect(passes(json)).toBe(false);
		});

		it('names a problem for prep results of the wrong type, and does not throw', () => {
			const facts = factsOf(
				{ structuredContent: { phase: ['ready'], repositoryUrl: 7 } },
				{ structuredOutput: { testPath: 7, runCommand: 7 } },
			);

			expect(facts).toEqual({ workspaceProblem: 'phase unknown', testProblem: 'no test' });
			expect(factsOf(workspaceOn(7), testWith({ testPath: TEST_PATH, runCommand: 7 }))).toEqual({
				workspaceProblem: `the repository is unknown, not ${REPOSITORY}`,
				testProblem: `the run command does not name ${TEST_PATH}`,
			});
		});

		const safeWord = fc.constantFrom('true', 'pnpm build', 'cd packages/cli', 'echo done');
		const operator = fc.constantFrom(';', '|', '||', '&', '\n', '\r\n', ' # ');

		it('accepts every chain of commands with && around the test', () => {
			fc.assert(
				fc.property(
					fc.array(safeWord, { maxLength: 3 }),
					fc.array(safeWord, { maxLength: 3 }),
					(before, after) => {
						const runCommand = [...before, `pnpm test ${TEST_PATH}`, ...after].join(' && ');

						expect(factsOf(ready, commandFor(runCommand)).testProblem).toBe('');
					},
				),
				{ numRuns: 60 },
			);
		});

		it('rejects every other operator before or after the test', () => {
			fc.assert(
				fc.property(safeWord, operator, fc.boolean(), (word, joint, first) => {
					const test = `pnpm test ${TEST_PATH}`;
					const runCommand = first ? `${test} ${joint} ${word}` : `${word} ${joint} ${test}`;

					expect(prepReady(ready, commandFor(runCommand))).toBe(false);
				}),
				{ numRuns: 60 },
			);
		});
	});

	describe('Outcome: prep failed', () => {
		it.each([
			[
				'the error of the workspace step',
				{ error: { message: 'Unknown tool: coding_prepare' } },
				failingTestOutput,
				'Workspace: Unknown tool: coding_prepare. Failing test: ready.',
			],
			[
				'an error without a message',
				{ error: { code: 500 } },
				{ error: '  ' },
				'Workspace: the step failed. Failing test: the step failed.',
			],
			[
				'the phase of the workspace and a missing test',
				{ structuredContent: { phase: 'error' } },
				{ structuredOutput: null },
				'Workspace: phase error. Failing test: no test.',
			],
			[
				'the error of the planner',
				ready,
				{ error: 'The agent stopped.' },
				'Workspace: ready. Failing test: The agent stopped.',
			],
			[
				'a workspace on another repository',
				workspaceOn('https://github.com/n8n-io/n8n'),
				failingTestOutput,
				`Workspace: the repository is https://github.com/n8n-io/n8n, not ${REPOSITORY}.`,
			],
			[
				'a run command that does not name the test',
				ready,
				testWith({ runCommand: 'pnpm test' }),
				'Failing test: the run command does not name packages/cli/test/unit/run-count.test.ts.',
			],
			[
				'a test path without a file name',
				ready,
				testWith({ testPath: 'packages/cli/test/', runCommand: 'pnpm test' }),
				'Failing test: the test path packages/cli/test/ names no file.',
			],
			[
				'a run command that names a file with the same end',
				ready,
				testWith({ runCommand: 'pnpm test packages/cli/test/unit/rerun-count.test.ts' }),
				'Failing test: the run command does not name packages/cli/test/unit/run-count.test.ts.',
			],
			[
				'a run command with a pipe after the test',
				ready,
				testWith({ runCommand: 'pnpm test packages/cli/test/unit/run-count.test.ts | tee log' }),
				'Failing test: the run command has a shell operator other than &&, which can hide a failure.',
			],
			[
				'a run command that starts with a negation',
				ready,
				testWith({ runCommand: '! pnpm test packages/cli/test/unit/run-count.test.ts' }),
				'Failing test: the run command can hide a failure: it starts with !, or it runs exit.',
			],
			[
				'a run command that exits before the test',
				ready,
				testWith({ runCommand: 'exit 0 && pnpm test packages/cli/test/unit/run-count.test.ts' }),
				'Failing test: the run command can hide a failure: it starts with !, or it runs exit.',
			],
		])('explains a failed preparation with %s', (_case, workspace, test, expected) => {
			const text = summaryOf(factsOf(workspace, test));

			expect(text).toMatch(/^The preparation did not finish\. /);
			expect(text).toContain(expected);
		});

		it('says "unknown" for facts of the wrong type', () => {
			expect(summaryOf({ workspaceProblem: 7 })).toBe(
				'The preparation did not finish. Workspace: unknown. Failing test: unknown.',
			);
		});

		it('says "ready" for both parts exactly when the gate "Prep ready?" passes', () => {
			const workspace = fc.oneof(
				fc.record({ error: fc.constantFrom('No tool', { message: 'Timeout' }, { code: 1 }, '') }),
				fc
					.tuple(
						fc.constantFrom<GenericValue>('ready', 'error', undefined, ['ready']),
						fc.constantFrom<GenericValue>(
							REPOSITORY,
							'https://github.com/ACME/factory.git/',
							`${REPOSITORY}-old`,
							undefined,
							7,
							[REPOSITORY],
						),
					)
					.map(([phase, repositoryUrl]) => workspaceOn(repositoryUrl, phase)),
			);
			const test = fc.oneof(
				fc.record({ error: fc.constantFrom('The agent stopped.', { message: 'Rate limit' }) }),
				fc.constant({ structuredOutput: null }),
				fc
					.tuple(
						fc.constantFrom<GenericValue>(
							'a/run.test.ts',
							' a/run.test.ts',
							'a/',
							'  ',
							'',
							7,
							undefined,
						),
						fc.constantFrom<GenericValue>(
							'pnpm test a/run.test.ts',
							'pnpm test a/run.test.ts && true',
							'pnpm test a/run.test.ts ; true',
							'pnpm test a/run.test.ts | tee log',
							'pnpm test a/run.test.ts &',
							'! pnpm test a/run.test.ts',
							'true && ! pnpm test a/run.test.ts',
							'exit 0 && pnpm test a/run.test.ts',
							'true # a/run.test.ts',
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
					const facts = factsOf(workspaceJson, testJson);

					expect(summaryOf(facts).endsWith('Workspace: ready. Failing test: ready.')).toBe(
						passes(facts),
					);
				}),
				{ numRuns: 150 },
			);
		});
	});
});
