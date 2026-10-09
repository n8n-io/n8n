import type { BaseTextKey, useI18n } from '@n8n/i18n';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { z } from 'zod';

/** The workspace tools that the coding view shows with their own labels and details. */
export const CODING_TOOL_NAMES = [
	'workspace_read_file',
	'workspace_write_file',
	'workspace_str_replace_file',
	'workspace_execute_command',
] as const;

export type CodingToolName = (typeof CODING_TOOL_NAMES)[number];

export type CodingToolStepI18n = Pick<ReturnType<typeof useI18n>, 'baseText'>;

export interface CodingEditLine {
	kind: 'added' | 'removed' | 'context';
	text: string;
}

export interface CodingLineStats {
	additions: number;
	deletions: number;
}

export interface CodingToolStepLabel {
	label: string;
	/** The label with the full path or command, set only when the label is shortened. */
	fullLabel?: string;
}

/** The longest path in a step label. The file name stays whole when it fits. */
export const MAX_STEP_PATH_LENGTH = 48;
/** The longest command in a step label, before the ellipsis. */
export const MAX_STEP_COMMAND_LENGTH = 56;

const pathInputSchema = z.object({ path: z.string().min(1) });
const writeInputSchema = pathInputSchema.extend({ content: z.string() });
const editInputSchema = pathInputSchema.extend({
	replacements: z.array(z.object({ old_str: z.string(), new_str: z.string() })),
});
const commandInputSchema = z.object({ command: z.string().trim().min(1) });

const FALLBACK_LABEL_KEYS: Record<CodingToolName, BaseTextKey> = {
	workspace_read_file: 'agents.chat.toolNames.readFile',
	workspace_write_file: 'agents.coding.tools.writeFile',
	workspace_str_replace_file: 'agents.coding.tools.editFile',
	workspace_execute_command: 'agents.coding.tools.runCommand',
};

export function isCodingToolName(name: string): name is CodingToolName {
	return CODING_TOOL_NAMES.some((tool) => tool === name);
}

function textLines(text: string): string[] {
	return text === '' ? [] : text.split('\n');
}

/** The number of lines in a file with this content. A final newline does not add a line. */
export function countTextLines(text: string): number {
	return textLines(text).length - (text.endsWith('\n') ? 1 : 0);
}

/**
 * The lines that one exact replacement changes. Lines that both texts share at
 * the start and the end stay as context, so they do not count as changes.
 */
export function codingEditLines(oldText: string, newText: string): CodingEditLine[] {
	const before = textLines(oldText);
	const after = textLines(newText);
	let start = 0;
	while (start < before.length && start < after.length && before[start] === after[start]) start++;
	let end = 0;
	const room = Math.min(before.length, after.length) - start;
	while (end < room && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
	const line = (kind: CodingEditLine['kind']) => (text: string) => ({ kind, text });
	return [
		...before.slice(0, start).map(line('context')),
		...before.slice(start, before.length - end).map(line('removed')),
		...after.slice(start, after.length - end).map(line('added')),
		...after.slice(after.length - end).map(line('context')),
	];
}

export function countLineStats(lines: CodingEditLine[]): CodingLineStats {
	return {
		additions: lines.filter((line) => line.kind === 'added').length,
		deletions: lines.filter((line) => line.kind === 'removed').length,
	};
}

/** The changed lines of each replacement in a `workspace_str_replace_file` input. */
export function parseCodingEdit(
	input: unknown,
): { path: string; replacements: CodingEditLine[][]; stats: CodingLineStats } | undefined {
	const parsed = editInputSchema.safeParse(input);
	if (!parsed.success) return undefined;
	const replacements = parsed.data.replacements.map((item) =>
		codingEditLines(item.old_str, item.new_str),
	);
	return { path: parsed.data.path, replacements, stats: countLineStats(replacements.flat()) };
}

/** Shortens a path in the middle, so the file name stays readable. */
export function shortenStepPath(path: string): string {
	const fileName = path.split('/').pop() ?? path;
	// Keep the slash before the file name, so the shortened path still reads as a path.
	const tail = fileName.length < path.length ? fileName.length + 1 : fileName.length;
	// An infinite minimum word length keeps the end of the path instead of the last word.
	return truncateBeforeLast(
		path,
		MAX_STEP_PATH_LENGTH,
		Math.min(tail, MAX_STEP_PATH_LENGTH - 2),
		Number.POSITIVE_INFINITY,
	);
}

/** Puts a command on one line and keeps its start, which names the program. */
export function shortenStepCommand(command: string): { short: string; full: string } {
	const full = command.replace(/\s+/g, ' ').trim();
	return {
		full,
		short: truncateBeforeLast(full, MAX_STEP_COMMAND_LENGTH, 0, Number.POSITIVE_INFINITY),
	};
}

interface PathLabelText {
	key: BaseTextKey;
	values?: Record<string, string | number>;
	/** Picks the singular or plural form of the text. */
	adjustToNumber?: number;
}

function pathLabel(
	i18n: CodingToolStepI18n,
	path: string,
	{ key, values = {}, adjustToNumber }: PathLabelText,
): CodingToolStepLabel {
	const short = shortenStepPath(path);
	const text = (shown: string) =>
		i18n.baseText(key, { interpolate: { ...values, path: shown }, adjustToNumber });
	return short === path ? { label: text(path) } : { label: text(short), fullLabel: text(path) };
}

function writeLabel(i18n: CodingToolStepI18n, input: unknown, running: boolean) {
	const parsed = writeInputSchema.safeParse(input);
	if (!parsed.success) return undefined;
	const { path, content } = parsed.data;
	if (running) return pathLabel(i18n, path, { key: 'agents.coding.tools.step.writing' });
	const count = countTextLines(content);
	return pathLabel(i18n, path, {
		key: 'agents.coding.tools.step.write',
		values: { count },
		adjustToNumber: count,
	});
}

function editLabel(i18n: CodingToolStepI18n, input: unknown, running: boolean) {
	const edit = parseCodingEdit(input);
	if (!edit) return undefined;
	if (running) return pathLabel(i18n, edit.path, { key: 'agents.coding.tools.step.editing' });
	return pathLabel(i18n, edit.path, {
		key: 'agents.coding.tools.step.edit',
		values: { ...edit.stats },
	});
}

function readLabel(i18n: CodingToolStepI18n, input: unknown, running: boolean) {
	const parsed = pathInputSchema.safeParse(input);
	if (!parsed.success) return undefined;
	const key = running ? 'agents.coding.tools.step.reading' : 'agents.coding.tools.step.read';
	return pathLabel(i18n, parsed.data.path, { key });
}

function commandLabel(i18n: CodingToolStepI18n, input: unknown, running: boolean) {
	const parsed = commandInputSchema.safeParse(input);
	if (!parsed.success) return undefined;
	const key = running ? 'agents.coding.tools.step.running' : 'agents.coding.tools.step.run';
	const { short, full } = shortenStepCommand(parsed.data.command);
	const text = (command: string) => i18n.baseText(key, { interpolate: { command } });
	return short === full ? { label: text(full) } : { label: text(short), fullLabel: text(full) };
}

const LABEL_BUILDERS: Record<
	CodingToolName,
	(i18n: CodingToolStepI18n, input: unknown, running: boolean) => CodingToolStepLabel | undefined
> = {
	workspace_read_file: readLabel,
	workspace_write_file: writeLabel,
	workspace_str_replace_file: editLabel,
	workspace_execute_command: commandLabel,
};

/**
 * A label that says what the step did, for example "Read AGENTS.md" or
 * "Ran pnpm test". A running step uses the present tense. Input that is not
 * complete gives the generic tool label.
 */
export function codingToolStepLabel(
	i18n: CodingToolStepI18n,
	tool: CodingToolName,
	input: unknown,
	running = false,
): CodingToolStepLabel {
	return (
		LABEL_BUILDERS[tool](i18n, input, running) ?? {
			label: i18n.baseText(FALLBACK_LABEL_KEYS[tool]),
		}
	);
}
