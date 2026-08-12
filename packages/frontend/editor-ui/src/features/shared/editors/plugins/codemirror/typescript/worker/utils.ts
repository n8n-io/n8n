import { ChangeSet } from '@codemirror/state';
import { type CodeExecutionMode } from 'n8n-workflow';

export const fnPrefix = (mode: CodeExecutionMode) => `(
/**
 * @returns {${returnTypeForMode(mode)}}
*/
() => {\n`;

/** What the edited file contains: a Code node script or a snippet expression */
export type EditorContext = 'codeNode' | 'snippet';

// Snippets are a single expression, so wrap as a returned expression
// (no @returns contract — the snippet's type is whatever it infers to)
export const snippetFnPrefix = `(
() => {
return (\n`;

export const prefixForContext = (mode: CodeExecutionMode, context: EditorContext) =>
	context === 'snippet' ? snippetFnPrefix : fnPrefix(mode);

export function wrapInFunction(
	script: string,
	mode: CodeExecutionMode,
	context: EditorContext = 'codeNode',
): string {
	if (context === 'snippet') {
		return `${snippetFnPrefix}${script}\n)})()`;
	}
	return `${fnPrefix(mode)}${script}\n})()`;
}

export function globalTypeDefinition(types: string) {
	return `export {};
declare global {
	${types}
}`;
}

export function returnTypeForMode(mode: CodeExecutionMode): string {
	return mode === 'runOnceForAllItems' ? 'N8nOutputItems' : 'N8nOutputItem';
}

const MAX_CHANGE_BUFFER_CHAR_SIZE = 10_000_000;
const MIN_CHANGE_BUFFER_WINDOW_MS = 50;
const MAX_CHANGE_BUFFER_WINDOW_MS = 500;

// Longer buffer window for large code
function calculateBufferWindowMs(docSize: number, minDelay: number, maxDelay: number): number {
	const clampedSize = Math.min(docSize, MAX_CHANGE_BUFFER_CHAR_SIZE);
	const normalizedSize = clampedSize / MAX_CHANGE_BUFFER_CHAR_SIZE;

	return Math.ceil(minDelay + (maxDelay - minDelay) * normalizedSize);
}

// Create a buffer function to accumulate and compose changesets
export function bufferChangeSets(fn: (changeset: ChangeSet) => void) {
	let changeSet = ChangeSet.empty(0);
	let timeoutId: NodeJS.Timeout | null = null;

	return async (changes: ChangeSet) => {
		changeSet = changeSet.compose(changes);

		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		return await new Promise<void>((resolve) => {
			timeoutId = setTimeout(
				() => {
					fn(changeSet);
					resolve();
					changeSet = ChangeSet.empty(0);
				},
				calculateBufferWindowMs(
					changeSet.length,
					MIN_CHANGE_BUFFER_WINDOW_MS,
					MAX_CHANGE_BUFFER_WINDOW_MS,
				),
			);
		});
	};
}
