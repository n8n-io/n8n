import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint';
import type { EditorState, Extension } from '@codemirror/state';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useI18n } from '@n8n/i18n';
import { toResult } from '@n8n/utils/result';

import { DEBOUNCE_TIME } from '@/app/constants/durations';

import type { TextRange, WorkflowJsonIssue } from './workflowJson.types';
import { closestRange } from './workflowJsonPaths';

type GetIssues = (parsed: unknown) => WorkflowJsonIssue[];

const i18n = useI18n();

function firstParseErrorPosition(state: EditorState): number | undefined {
	let position: number | undefined;
	(ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state)).iterate({
		enter: (node) => {
			if (node.type.isError) position ??= node.from;
			return position === undefined;
		},
	});
	return position;
}

/**
 * Reads the position the way jsonParseLinter does, which needs an EditorView.
 * Some messages have no position (V8: "Unexpected token 'x'"), so the parse tree is the fallback.
 */
function syntaxErrorPosition(error: Error, state: EditorState): number {
	const { doc } = state;
	const position = /at position (\d+)/.exec(error.message);
	if (position) return Math.min(Number(position[1]), doc.length);

	const lineAndColumn = /at line (\d+) column (\d+)/.exec(error.message);
	if (lineAndColumn) {
		const line = doc.line(Math.min(Math.max(Number(lineAndColumn[1]), 1), doc.lines));
		return Math.min(line.from + Number(lineAndColumn[2]) - 1, doc.length);
	}

	return firstParseErrorPosition(state) ?? doc.length;
}

/** A range over many lines, such as a whole node, keeps only its first line so the underline stays readable. */
function readableRange(state: EditorState, range: TextRange | null): TextRange {
	const { from, to } = range ?? { from: 0, to: state.doc.length };
	return { from, to: Math.min(to, state.doc.lineAt(from).to) };
}

/** A JSON syntax error is the only diagnostic. Otherwise each issue of `getIssues` becomes one. */
export function computeWorkflowJsonDiagnostics(
	state: EditorState,
	getIssues: GetIssues,
): Diagnostic[] {
	const parsed = toResult<unknown>(() => JSON.parse(state.doc.toString()));
	if (!parsed.ok) {
		const position = syntaxErrorPosition(parsed.error, state);
		return [
			{
				from: position,
				to: position,
				severity: 'error',
				message: i18n.baseText('workflowJsonPanel.validation.syntaxError', {
					interpolate: { message: parsed.error.message },
				}),
			},
		];
	}

	return getIssues(parsed.result).map(({ severity, path, message }) => ({
		...readableRange(state, closestRange(state, path)),
		severity,
		message,
	}));
}

export function workflowJsonLinter(getIssues: GetIssues): Extension {
	return [
		linter((view) => computeWorkflowJsonDiagnostics(view.state, getIssues), {
			delay: getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH),
		}),
		lintGutter(),
	];
}

export function summarizeIssues(issues: WorkflowJsonIssue[]): { errors: number; warnings: number } {
	return {
		errors: issues.filter((issue) => issue.severity === 'error').length,
		warnings: issues.filter((issue) => issue.severity === 'warning').length,
	};
}
