import { useI18n } from '@n8n/i18n';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { TOOL_CALL_STATE, type ToolCallState } from '@/features/ai/shared/agentsChat/constants';

import {
	CODING_TOOL_NAMES,
	MAX_STEP_COMMAND_LENGTH,
	MAX_STEP_PATH_LENGTH,
	codingCommandExitCode,
	codingEditLines,
	codingStepFailureText,
	codingStepOutcome,
	codingToolStepLabel,
	countLineStats,
	countTextLines,
	isCodingToolName,
	parseCodingEdit,
	parseCodingEditFailure,
	shortenStepCommand,
	shortenStepPath,
	type CodingEditLine,
	type CodingStepCall,
} from '../coding-tool-step';

const i18n = useI18n();
const { DONE, ERROR, CANCELLED, RUNNING, PENDING, SUSPENDED } = TOOL_CALL_STATE;
const done = (input: unknown, output?: unknown): CodingStepCall => ({ input, output, state: DONE });
const EDIT_FAILED = {
	success: false,
	error: 'String replacement failed.',
	results: [
		{ index: 0, old_str: 'a', status: 'success' },
		{ index: 1, old_str: 'x', status: 'failed', error: 'No exact match found.' },
		{ index: 2, old_str: 'y', status: 'not_attempted' },
	],
};
const VALID_INPUTS = {
	workspace_read_file: { path: 'src/a.ts' },
	workspace_write_file: { path: 'src/a.ts', content: 'a\n' },
	workspace_str_replace_file: { path: 'src/a.ts', replacements: [{ old_str: 'a', new_str: 'b' }] },
	workspace_execute_command: { command: 'pnpm test' },
} as const;
const graphemes = (text: string) => [...new Intl.Segmenter().segment(text)].length;
const segment = fc.stringMatching(/^[a-z0-9_.-]{1,24}$/);
const pathArbitrary = fc
	.array(segment, { minLength: 1, maxLength: 8 })
	.map((parts) => parts.join('/'));
const lineText = fc.stringMatching(/^[^\n]{0,12}$/);
const textArbitrary = fc.array(lineText, { maxLength: 8 }).map((lines) => lines.join('\n'));

function linesOf(lines: CodingEditLine[], kinds: Array<CodingEditLine['kind']>) {
	return lines.filter((line) => kinds.includes(line.kind)).map((line) => line.text);
}

describe('isCodingToolName', () => {
	it.each([
		'workspace_read_file',
		'workspace_write_file',
		'workspace_str_replace_file',
		'workspace_execute_command',
	])('accepts %s', (name) => {
		expect(isCodingToolName(name)).toBe(true);
	});

	it.each(['workspace_list_files', 'workspace_read_tool_result', 'read_file', ''])(
		'rejects %s',
		(name) => {
			expect(isCodingToolName(name)).toBe(false);
		},
	);
});

describe('codingToolStepLabel', () => {
	it('names the file that a step read', () => {
		expect(codingToolStepLabel(i18n, 'workspace_read_file', done({ path: 'AGENTS.md' }))).toEqual({
			label: 'Read AGENTS.md',
		});
	});

	it('names the edited file with the lines that the replacements add and remove', () => {
		const input = {
			path: 'src/lib/dates.ts',
			replacements: [
				{
					old_str: 'const a = 1;\nconst b = 2;',
					new_str: 'const a = 1;\nconst b = 3;\nconst c = 4;',
				},
				{ old_str: 'old()', new_str: 'renamed()' },
			],
		};

		expect(
			codingToolStepLabel(i18n, 'workspace_str_replace_file', done(input, { success: true })),
		).toEqual({ label: 'Edited src/lib/dates.ts +3 −2' });
	});

	it('names a written file with its line count, without a guessed removal count', () => {
		expect(
			codingToolStepLabel(
				i18n,
				'workspace_write_file',
				done({ path: 'src/lib/dates.ts', content: 'a\nb\n' }, { success: true }),
			),
		).toEqual({ label: 'Wrote src/lib/dates.ts (2 lines)' });
		expect(
			codingToolStepLabel(i18n, 'workspace_write_file', done({ path: 'one.ts', content: 'a' }))
				.label,
		).toBe('Wrote one.ts (1 line)');
	});

	it('names the command that a step ran, on one line', () => {
		expect(
			codingToolStepLabel(
				i18n,
				'workspace_execute_command',
				done({ command: 'pnpm typecheck &&\n  pnpm test' }, { success: true, exitCode: 0 }),
			),
		).toEqual({ label: 'Ran pnpm typecheck && pnpm test' });
	});

	it.each([
		['workspace_read_file', { path: 'a.ts' }, 'Reading a.ts'],
		['workspace_write_file', { path: 'a.ts', content: 'x' }, 'Writing a.ts'],
		[
			'workspace_str_replace_file',
			{ path: 'a.ts', replacements: [{ old_str: 'x', new_str: 'y' }] },
			'Editing a.ts',
		],
		['workspace_execute_command', { command: 'pnpm test' }, 'Running pnpm test'],
	] as const)('uses the present tense while %s runs', (tool, input, label) => {
		expect(codingToolStepLabel(i18n, tool, { input, state: RUNNING }).label).toBe(label);
	});

	it.each([
		[
			'an edit that did not match',
			'workspace_str_replace_file',
			done(VALID_INPUTS.workspace_str_replace_file, EDIT_FAILED),
			'Could not edit src/a.ts',
		],
		[
			'a read of a missing file',
			'workspace_read_file',
			{ input: { path: 'missing.ts' }, output: 'ENOENT', state: ERROR },
			'Could not read missing.ts',
		],
		[
			'a write that threw',
			'workspace_write_file',
			{ input: VALID_INPUTS.workspace_write_file, state: ERROR },
			'Could not write src/a.ts',
		],
		[
			'a command that could not start',
			'workspace_execute_command',
			{ input: { command: 'pnpm test' }, output: 'No sandbox', state: ERROR },
			'Could not run pnpm test',
		],
		[
			'a command that ran and failed',
			'workspace_execute_command',
			done({ command: 'pnpm test' }, { success: false, exitCode: 1, stdout: '', stderr: 'x' }),
			'Ran pnpm test',
		],
		[
			'a stopped command',
			'workspace_execute_command',
			{ input: { command: 'pnpm test' }, state: CANCELLED },
			'Stopped pnpm test',
		],
		[
			'a stopped read',
			'workspace_read_file',
			{ input: { path: 'a.ts' }, state: CANCELLED },
			'Stopped reading a.ts',
		],
		[
			'a stopped write',
			'workspace_write_file',
			{ input: { path: 'a.ts', content: 'x' }, state: CANCELLED },
			'Stopped writing a.ts',
		],
		[
			'a stopped edit',
			'workspace_str_replace_file',
			{ input: { path: 'a.ts', replacements: [{ old_str: 'a', new_str: 'b' }] }, state: CANCELLED },
			'Stopped editing a.ts',
		],
	] as const)('says what happened to %s', (_case, tool, call, label) => {
		expect(codingToolStepLabel(i18n, tool, call)).toEqual({ label });
	});

	it('never claims that a failed or stopped step did its work (property)', () => {
		const successVerbs = /^(Read|Wrote|Edited) /;
		fc.assert(
			fc.property(
				fc.constantFrom(...CODING_TOOL_NAMES),
				fc.constantFrom<ToolCallState>(ERROR, CANCELLED),
				fc.constantFrom<unknown>(undefined, 'Error text', { success: false }, EDIT_FAILED),
				(tool, state, output) => {
					const { label } = codingToolStepLabel(i18n, tool, {
						input: VALID_INPUTS[tool],
						output,
						state,
					});
					expect(label).not.toMatch(successVerbs);
					expect(label).not.toMatch(/^Ran /);
					expect(label).not.toMatch(/[+−]\d/);
				},
			),
		);
	});

	it('keeps the full label of a failed step with a long path for the tooltip', () => {
		const path = 'packages/frontend/editor-ui/src/features/agents/components/AgentCodingDiff.vue';

		const result = codingToolStepLabel(i18n, 'workspace_read_file', {
			input: { path },
			state: ERROR,
		});

		expect(result.label).toMatch(/^Could not read packages\/.*…/);
		expect(result.fullLabel).toBe(`Could not read ${path}`);
	});

	it.each([
		['workspace_read_file', {}, 'Read file'],
		['workspace_write_file', { path: 'a.ts' }, 'Write file'],
		['workspace_str_replace_file', { path: 'a.ts', replacements: 'x' }, 'Edit file'],
		['workspace_execute_command', { command: '   ' }, 'Run command'],
		['workspace_execute_command', undefined, 'Run command'],
	] as const)(
		'falls back to the tool name when the %s input is not complete',
		(tool, input, label) => {
			expect(codingToolStepLabel(i18n, tool, done(input))).toEqual({ label });
		},
	);

	it('shortens a long path in the label and keeps the full label for the tooltip', () => {
		const path = 'packages/frontend/editor-ui/src/features/agents/components/AgentCodingDiff.vue';

		const result = codingToolStepLabel(i18n, 'workspace_read_file', done({ path }));

		expect(result.label).toMatch(/^Read packages\/.*….*\/AgentCodingDiff\.vue$/);
		expect(result.fullLabel).toBe(`Read ${path}`);
	});

	it('shortens a long command at its end and keeps the full command for the tooltip', () => {
		const command = `pnpm --filter n8n-editor-ui exec vitest run ${'src/a.test.ts '.repeat(6)}`;

		const result = codingToolStepLabel(i18n, 'workspace_execute_command', done({ command }));

		expect(result.label).toMatch(/^Ran pnpm --filter n8n-editor-ui .*…$/);
		expect(result.fullLabel).toBe(`Ran ${command.trim()}`);
	});
});

describe('shortenStepPath', () => {
	it('keeps a path that fits', () => {
		const path = 'a'.repeat(MAX_STEP_PATH_LENGTH);
		expect(shortenStepPath(path)).toBe(path);
	});

	it('cuts one character over the limit', () => {
		const path = `${'a'.repeat(MAX_STEP_PATH_LENGTH - 5)}/b.ts`.padStart(
			MAX_STEP_PATH_LENGTH + 1,
			'x',
		);

		const short = shortenStepPath(path);

		expect(graphemes(short)).toBe(MAX_STEP_PATH_LENGTH);
		expect(short.endsWith('/b.ts')).toBe(true);
	});

	it('keeps the end of a file name that is longer than the limit', () => {
		const path = `dir/${'n'.repeat(MAX_STEP_PATH_LENGTH * 2)}.ts`;

		const short = shortenStepPath(path);

		expect(graphemes(short)).toBe(MAX_STEP_PATH_LENGTH);
		expect(short.startsWith('d…')).toBe(true);
		expect(short.endsWith('n.ts')).toBe(true);
	});

	it('never exceeds the limit and keeps a file name that fits (property)', () => {
		fc.assert(
			fc.property(pathArbitrary, (path) => {
				const short = shortenStepPath(path);
				const fileName = path.split('/').pop() ?? '';
				expect(graphemes(short)).toBeLessThanOrEqual(MAX_STEP_PATH_LENGTH);
				if (path.length <= MAX_STEP_PATH_LENGTH) expect(short).toBe(path);
				else expect(short.endsWith(fileName)).toBe(true);
			}),
		);
	});
});

describe('shortenStepCommand', () => {
	it('keeps the start of the command, with at most the limit plus an ellipsis (property)', () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 200 }), (command) => {
				const { short, full } = shortenStepCommand(command);
				expect(full).not.toMatch(/\s\s|\n/);
				if (short === full) {
					expect(graphemes(full)).toBeLessThanOrEqual(MAX_STEP_COMMAND_LENGTH);
				} else {
					expect(graphemes(short)).toBe(MAX_STEP_COMMAND_LENGTH + 1);
					expect(full.startsWith(short.slice(0, -1))).toBe(true);
				}
			}),
		);
	});
});

describe('countTextLines', () => {
	it.each([
		['', 0],
		['\n', 1],
		['a', 1],
		['a\n', 1],
		['a\nb', 2],
		['a\nb\n', 2],
		['a\n\n', 2],
	])('counts %j as %i lines', (text, count) => {
		expect(countTextLines(text)).toBe(count);
	});
});

describe('codingEditLines', () => {
	it('keeps shared first and last lines as context', () => {
		expect(codingEditLines('keep\nold\nend', 'keep\nnew\nmore\nend')).toEqual([
			{ kind: 'context', text: 'keep' },
			{ kind: 'removed', text: 'old' },
			{ kind: 'added', text: 'new' },
			{ kind: 'added', text: 'more' },
			{ kind: 'context', text: 'end' },
		]);
	});

	it('counts an insertion into empty text as added lines only', () => {
		expect(countLineStats(codingEditLines('', 'a\nb'))).toEqual({ additions: 2, deletions: 0 });
		expect(countLineStats(codingEditLines('a\nb', ''))).toEqual({ additions: 0, deletions: 2 });
	});

	it('does not count a repeated line twice when it is both a prefix and a suffix', () => {
		expect(countLineStats(codingEditLines('x', 'x\nx'))).toEqual({ additions: 1, deletions: 0 });
		expect(countLineStats(codingEditLines('x\nx', 'x'))).toEqual({ additions: 0, deletions: 1 });
	});

	it('rebuilds both texts from its lines and reports no change for equal texts (property)', () => {
		fc.assert(
			fc.property(textArbitrary, textArbitrary, (before, after) => {
				const lines = codingEditLines(before, after);
				const stats = countLineStats(lines);
				expect(linesOf(lines, ['context', 'removed']).join('\n')).toBe(before);
				expect(linesOf(lines, ['context', 'added']).join('\n')).toBe(after);
				expect(stats.additions).toBeGreaterThanOrEqual(0);
				expect(stats.deletions).toBeGreaterThanOrEqual(0);
				if (before === after) expect(stats).toEqual({ additions: 0, deletions: 0 });
			}),
		);
	});
});

describe('parseCodingEdit', () => {
	it('sums the stats of every replacement', () => {
		const edit = parseCodingEdit({
			path: 'a.ts',
			replacements: [
				{ old_str: 'a', new_str: 'b' },
				{ old_str: 'c\nd', new_str: 'c' },
			],
		});

		expect(edit?.path).toBe('a.ts');
		expect(edit?.replacements).toHaveLength(2);
		expect(edit?.stats).toEqual({ additions: 1, deletions: 2 });
	});

	it.each([
		['no path', { replacements: [] }],
		['an empty path', { path: '', replacements: [] }],
		['a replacement without new text', { path: 'a.ts', replacements: [{ old_str: 'a' }] }],
		['no object', 'a.ts'],
	])('rejects input with %s', (_case, input) => {
		expect(parseCodingEdit(input)).toBeUndefined();
	});
});

describe('codingStepOutcome', () => {
	it.each([
		[PENDING, undefined, 'running'],
		[RUNNING, undefined, 'running'],
		[SUSPENDED, undefined, 'running'],
		[CANCELLED, { success: true }, 'stopped'],
		[ERROR, undefined, 'failed'],
		[DONE, EDIT_FAILED, 'failed'],
		[DONE, { success: false, exitCode: 1 }, 'failed'],
		[DONE, { error: 'Not found' }, 'failed'],
		[DONE, { success: true }, 'done'],
		[DONE, { success: true, exitCode: 0 }, 'done'],
		[DONE, { content: 'text' }, 'done'],
		[DONE, undefined, 'done'],
	] as const)('gives a %s call with output %j the outcome %s', (state, output, outcome) => {
		expect(codingStepOutcome({ input: {}, output, state })).toBe(outcome);
	});

	it('lets the call state win over the output (property)', () => {
		fc.assert(
			fc.property(
				fc.constantFrom<ToolCallState>(...Object.values(TOOL_CALL_STATE)),
				fc.anything(),
				(state, output) => {
					const outcome = codingStepOutcome({ output, state });
					if (state === CANCELLED) expect(outcome).toBe('stopped');
					else if (state === ERROR) expect(outcome).toBe('failed');
					else if (state !== DONE) expect(outcome).toBe('running');
					else expect(['done', 'failed']).toContain(outcome);
				},
			),
		);
	});
});

describe('codingStepFailureText', () => {
	it('gives the error of an edit that finished without a change', () => {
		expect(codingStepFailureText(i18n, done({}, EDIT_FAILED))).toBe('String replacement failed.');
	});

	it('gives the exit code of a command that ran and failed', () => {
		expect(codingStepFailureText(i18n, done({}, { success: false, exitCode: 2 }))).toBe(
			'Exit code: 2',
		);
	});

	it('gives a generic text for a failed result without a message', () => {
		expect(codingStepFailureText(i18n, done({}, { success: false }))).toBe(
			'Something went wrong while running this tool',
		);
	});

	it.each([
		['a successful result', done({}, { success: true })],
		['a call that threw', { output: { error: 'x' }, state: ERROR }],
		['a running call', { output: { success: false }, state: RUNNING }],
		['a stopped call', { output: { success: false }, state: CANCELLED }],
	] as const)('gives nothing for %s', (_case, call) => {
		expect(codingStepFailureText(i18n, call)).toBeUndefined();
	});
});

describe('parseCodingEditFailure', () => {
	it('reads the error and the result of each replacement', () => {
		expect(parseCodingEditFailure(EDIT_FAILED)).toEqual({
			error: 'String replacement failed.',
			results: [
				{ index: 0, status: 'success' },
				{ index: 1, status: 'failed', error: 'No exact match found.' },
				{ index: 2, status: 'not_attempted' },
			],
		});
	});

	it('keeps the failure when the results have an unknown shape', () => {
		expect(
			parseCodingEditFailure({ success: false, error: 'Disk full', results: [{ index: 'a' }] }),
		).toEqual({ error: 'Disk full', results: [] });
		expect(parseCodingEditFailure({ success: false })).toEqual({
			error: undefined,
			results: [],
		});
	});

	it.each([
		['a successful edit', { success: true, result: 'All 1 replacements applied.' }],
		['no output', undefined],
		['text', 'failed'],
	])('gives nothing for %s', (_case, output) => {
		expect(parseCodingEditFailure(output)).toBeUndefined();
	});
});

describe('codingCommandExitCode', () => {
	it.each([
		[{ exitCode: 0 }, 0],
		[{ exitCode: 127, success: false }, 127],
		[{ exitCode: 1.5 }, undefined],
		[{ exitCode: '1' }, undefined],
		[{}, undefined],
		[undefined, undefined],
	])('reads %j as %s', (output, exitCode) => {
		expect(codingCommandExitCode(output)).toBe(exitCode);
	});
});
