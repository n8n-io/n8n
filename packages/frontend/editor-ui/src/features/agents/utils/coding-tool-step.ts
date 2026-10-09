import type { BaseTextKey, useI18n } from '@n8n/i18n';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { z } from 'zod';

import { TOOL_CALL_STATE, type ToolCallState } from '@/features/ai/shared/agentsChat/constants';

import { isFailedToolOutput, toolOutputErrorMessage } from './tool-output-failure';

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

/** What became of a coding step: it runs, it did its work, it failed, or its run stopped it. */
export type CodingStepOutcome = 'running' | 'done' | 'failed' | 'stopped';

/** The parts of a tool call that tell what a coding step did. */
export interface CodingStepCall {
	input?: unknown;
	output?: unknown;
	state: ToolCallState;
}

export type CodingEditResultStatus = 'success' | 'failed' | 'not_attempted';

/** The result of one replacement in an edit that did not change the file. */
export interface CodingEditResult {
	index: number;
	status: CodingEditResultStatus;
	error?: string;
}

/** An edit that the tool did not apply. The file stays as it was. */
export interface CodingEditFailure {
	error?: string;
	/** The result of each replacement, when the tool gives them. */
	results: CodingEditResult[];
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
const commandOutputSchema = z.object({ exitCode: z.number().int() });
const editResultSchema = z.object({
	index: z.number().int().nonnegative(),
	status: z.enum(['success', 'failed', 'not_attempted']),
	error: z.string().optional(),
});
const editFailureSchema = z.object({
	success: z.literal(false),
	error: z.string().optional(),
	// Results in an unknown shape do not hide the failure itself.
	results: z.array(editResultSchema).optional().catch(undefined),
});

const LOADING_STATES: ReadonlySet<ToolCallState> = new Set([
	TOOL_CALL_STATE.PENDING,
	TOOL_CALL_STATE.RUNNING,
	TOOL_CALL_STATE.SUSPENDED,
]);

type StepLabelKeys = Record<CodingStepOutcome, BaseTextKey>;

const READ_LABEL_KEYS: StepLabelKeys = {
	running: 'agents.coding.tools.step.reading',
	done: 'agents.coding.tools.step.read',
	failed: 'agents.coding.tools.step.readFailed',
	stopped: 'agents.coding.tools.step.readStopped',
};
const WRITE_LABEL_KEYS: StepLabelKeys = {
	running: 'agents.coding.tools.step.writing',
	done: 'agents.coding.tools.step.write',
	failed: 'agents.coding.tools.step.writeFailed',
	stopped: 'agents.coding.tools.step.writeStopped',
};
const EDIT_LABEL_KEYS: StepLabelKeys = {
	running: 'agents.coding.tools.step.editing',
	done: 'agents.coding.tools.step.edit',
	failed: 'agents.coding.tools.step.editFailed',
	stopped: 'agents.coding.tools.step.editStopped',
};
const COMMAND_LABEL_KEYS: StepLabelKeys = {
	running: 'agents.coding.tools.step.running',
	done: 'agents.coding.tools.step.run',
	failed: 'agents.coding.tools.step.runFailed',
	stopped: 'agents.coding.tools.step.runStopped',
};

const FALLBACK_LABEL_KEYS: Record<CodingToolName, BaseTextKey> = {
	workspace_read_file: 'agents.chat.toolNames.readFile',
	workspace_write_file: 'agents.coding.tools.writeFile',
	workspace_str_replace_file: 'agents.coding.tools.editFile',
	workspace_execute_command: 'agents.coding.tools.runCommand',
};

export function isCodingToolName(name: string): name is CodingToolName {
	return CODING_TOOL_NAMES.some((tool) => tool === name);
}

/**
 * The outcome of a coding step. A finished call can still be a failed step,
 * because some tools return a failure as their result and do not throw.
 */
export function codingStepOutcome(call: CodingStepCall): CodingStepOutcome {
	if (LOADING_STATES.has(call.state)) return 'running';
	if (call.state === TOOL_CALL_STATE.CANCELLED) return 'stopped';
	if (call.state === TOOL_CALL_STATE.ERROR || isFailedToolOutput(call.output)) return 'failed';
	return 'done';
}

/** The exit code of a command that ran, also when it failed. */
export function codingCommandExitCode(output: unknown): number | undefined {
	const parsed = commandOutputSchema.safeParse(output);
	return parsed.success ? parsed.data.exitCode : undefined;
}

/** The failure of a `workspace_str_replace_file` call that finished without a change. */
export function parseCodingEditFailure(output: unknown): CodingEditFailure | undefined {
	const parsed = editFailureSchema.safeParse(output);
	if (!parsed.success) return undefined;
	return { error: parsed.data.error, results: parsed.data.results ?? [] };
}

/**
 * The text that explains a coding step that finished with a failed result.
 * A call that failed with an error has its own text, so this gives none.
 */
export function codingStepFailureText(
	i18n: CodingToolStepI18n,
	call: CodingStepCall,
): string | undefined {
	if (call.state !== TOOL_CALL_STATE.DONE || !isFailedToolOutput(call.output)) return undefined;
	const exitCode = codingCommandExitCode(call.output);
	if (exitCode !== undefined) {
		return i18n.baseText('agents.coding.tools.exitCode', {
			interpolate: { code: String(exitCode) },
		});
	}
	return toolOutputErrorMessage(call.output) ?? i18n.baseText('agents.chat.toolError.generic');
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

function writeLabel(i18n: CodingToolStepI18n, call: CodingStepCall, outcome: CodingStepOutcome) {
	const parsed = writeInputSchema.safeParse(call.input);
	if (!parsed.success) return undefined;
	const { path, content } = parsed.data;
	if (outcome !== 'done') return pathLabel(i18n, path, { key: WRITE_LABEL_KEYS[outcome] });
	const count = countTextLines(content);
	return pathLabel(i18n, path, {
		key: WRITE_LABEL_KEYS.done,
		values: { count },
		adjustToNumber: count,
	});
}

function editLabel(i18n: CodingToolStepI18n, call: CodingStepCall, outcome: CodingStepOutcome) {
	const edit = parseCodingEdit(call.input);
	if (!edit) return undefined;
	// Only an applied edit has line stats. A failed edit did not change the file.
	const values = outcome === 'done' ? { ...edit.stats } : undefined;
	return pathLabel(i18n, edit.path, { key: EDIT_LABEL_KEYS[outcome], values });
}

function readLabel(i18n: CodingToolStepI18n, call: CodingStepCall, outcome: CodingStepOutcome) {
	const parsed = pathInputSchema.safeParse(call.input);
	if (!parsed.success) return undefined;
	return pathLabel(i18n, parsed.data.path, { key: READ_LABEL_KEYS[outcome] });
}

function commandLabel(i18n: CodingToolStepI18n, call: CodingStepCall, outcome: CodingStepOutcome) {
	const parsed = commandInputSchema.safeParse(call.input);
	if (!parsed.success) return undefined;
	// A command with an exit code ran, also when it failed. Its exit code tells how it ended.
	const ran = outcome === 'failed' && codingCommandExitCode(call.output) !== undefined;
	const key = ran ? COMMAND_LABEL_KEYS.done : COMMAND_LABEL_KEYS[outcome];
	const { short, full } = shortenStepCommand(parsed.data.command);
	const text = (command: string) => i18n.baseText(key, { interpolate: { command } });
	return short === full ? { label: text(full) } : { label: text(short), fullLabel: text(full) };
}

const LABEL_BUILDERS: Record<
	CodingToolName,
	(
		i18n: CodingToolStepI18n,
		call: CodingStepCall,
		outcome: CodingStepOutcome,
	) => CodingToolStepLabel | undefined
> = {
	workspace_read_file: readLabel,
	workspace_write_file: writeLabel,
	workspace_str_replace_file: editLabel,
	workspace_execute_command: commandLabel,
};

/**
 * A label that says what the step did, for example "Read AGENTS.md" or
 * "Ran pnpm test". A running step uses the present tense, and a step that
 * failed or stopped says so. Input that is not complete gives the generic
 * tool label.
 */
export function codingToolStepLabel(
	i18n: CodingToolStepI18n,
	tool: CodingToolName,
	call: CodingStepCall,
): CodingToolStepLabel {
	return (
		LABEL_BUILDERS[tool](i18n, call, codingStepOutcome(call)) ?? {
			label: i18n.baseText(FALLBACK_LABEL_KEYS[tool]),
		}
	);
}
