import type * as tsvfs from '@typescript/vfs';
import type ts from 'typescript';
import { TS_COMPLETE_BLOCKLIST, TYPESCRIPT_AUTOCOMPLETE_THRESHOLD } from './constants';
import type { Completion } from '@codemirror/autocomplete';

function typescriptCompletionToEditor(
	completionInfo: ts.WithMetadata<ts.CompletionInfo>,
	entry: ts.CompletionEntry,
): Completion {
	const boost = -Number(entry.sortText) || 0;
	let type = entry.kind ? String(entry.kind) : undefined;

	if (type === 'member') type = 'property';

	return {
		label: entry.name,
		type,
		commitCharacters: entry.commitCharacters ?? completionInfo.defaultCommitCharacters,
		boost,
	};
}

function filterTypescriptCompletions(
	completionInfo: ts.WithMetadata<ts.CompletionInfo>,
	entry: ts.CompletionEntry,
) {
	return (
		!TS_COMPLETE_BLOCKLIST.includes(entry.kind) &&
		(entry.sortText < TYPESCRIPT_AUTOCOMPLETE_THRESHOLD ||
			completionInfo.optionalReplacementSpan?.length)
	);
}

export async function getCompletionsAtPos({
	pos,
	fileName,
	env,
}: { pos: number; fileName: string; env: tsvfs.VirtualTypeScriptEnvironment }) {
	const completionInfo = env.languageService.getCompletionsAtPosition(fileName, pos, {}, {});

	if (!completionInfo) return null;

	const options = completionInfo.entries
		.filter((entry) => filterTypescriptCompletions(completionInfo, entry))
		.map((entry) => typescriptCompletionToEditor(completionInfo, entry));

	return {
		result: { from: pos, options },
		isGlobal: completionInfo.isGlobalCompletion,
	};
}
