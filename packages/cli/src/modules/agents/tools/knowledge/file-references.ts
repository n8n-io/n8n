import type { KnowledgeWorkspaceFile } from '../../agent-knowledge.service';

import type { ParsedSearchKnowledgeInput } from './schemas';

export type WorkspaceFiles = KnowledgeWorkspaceFile[];

export type FileReferenceResolution =
	| { status: 'found'; file: WorkspaceFiles[number] }
	| { status: 'missing'; error: string }
	| { status: 'ambiguous'; error: string };

export function resolveFileReference(
	files: WorkspaceFiles,
	reference: string,
): FileReferenceResolution {
	const matches = files.filter(
		(file) =>
			file.id === reference || file.relativePath === reference || file.fileName === reference,
	);
	if (matches.length === 1) return { status: 'found', file: matches[0] };
	if (matches.length === 0) return { status: 'missing', error: `File "${reference}" not found` };

	return {
		status: 'ambiguous',
		error: `File "${reference}" matches multiple uploaded files. Use the file id or relative path instead.`,
	};
}

export function getRequiredFileReferences(input: ParsedSearchKnowledgeInput) {
	if (input.operation === 'search') return input.files;
	if (
		input.operation === 'read' ||
		input.operation === 'csv_query' ||
		input.operation === 'csv_profile' ||
		input.operation === 'csv_distinct' ||
		input.operation === 'csv_aggregate'
	) {
		return [input.file];
	}
	return undefined;
}

export type FileReferenceMapResult =
	| { status: 'ok'; files: string[] | undefined }
	| { status: 'error'; error: string };

export function mapFileReferences(
	files: WorkspaceFiles,
	requestedFiles?: string[],
): FileReferenceMapResult {
	if (!requestedFiles) return { status: 'ok', files: undefined };

	const mapped: string[] = [];
	for (const requestedFile of requestedFiles) {
		const resolvedFile = resolveFileReference(files, requestedFile);
		if (resolvedFile.status !== 'found') {
			return { status: 'error', error: resolvedFile.error };
		}
		mapped.push(resolvedFile.file.relativePath);
	}
	return { status: 'ok', files: mapped };
}
