import { useI18n } from '@n8n/i18n';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
	MAX_STEP_COMMAND_LENGTH,
	MAX_STEP_PATH_LENGTH,
	codingEditLines,
	codingToolStepLabel,
	countLineStats,
	countTextLines,
	isCodingToolName,
	parseCodingEdit,
	shortenStepCommand,
	shortenStepPath,
	type CodingEditLine,
} from '../coding-tool-step';

const i18n = useI18n();
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
		expect(codingToolStepLabel(i18n, 'workspace_read_file', { path: 'AGENTS.md' })).toEqual({
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

		expect(codingToolStepLabel(i18n, 'workspace_str_replace_file', input)).toEqual({
			label: 'Edited src/lib/dates.ts +3 −2',
		});
	});

	it('names a written file with its line count, without a guessed removal count', () => {
		expect(
			codingToolStepLabel(i18n, 'workspace_write_file', {
				path: 'src/lib/dates.ts',
				content: 'a\nb\n',
			}),
		).toEqual({ label: 'Wrote src/lib/dates.ts (2 lines)' });
		expect(
			codingToolStepLabel(i18n, 'workspace_write_file', { path: 'one.ts', content: 'a' }).label,
		).toBe('Wrote one.ts (1 line)');
	});

	it('names the command that a step ran, on one line', () => {
		expect(
			codingToolStepLabel(i18n, 'workspace_execute_command', {
				command: 'pnpm typecheck &&\n  pnpm test',
			}),
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
		expect(codingToolStepLabel(i18n, tool, input, true).label).toBe(label);
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
			expect(codingToolStepLabel(i18n, tool, input)).toEqual({ label });
		},
	);

	it('shortens a long path in the label and keeps the full label for the tooltip', () => {
		const path = 'packages/frontend/editor-ui/src/features/agents/components/AgentCodingDiff.vue';

		const result = codingToolStepLabel(i18n, 'workspace_read_file', { path });

		expect(result.label).toMatch(/^Read packages\/.*….*\/AgentCodingDiff\.vue$/);
		expect(result.fullLabel).toBe(`Read ${path}`);
	});

	it('shortens a long command at its end and keeps the full command for the tooltip', () => {
		const command = `pnpm --filter n8n-editor-ui exec vitest run ${'src/a.test.ts '.repeat(6)}`;

		const result = codingToolStepLabel(i18n, 'workspace_execute_command', { command });

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
