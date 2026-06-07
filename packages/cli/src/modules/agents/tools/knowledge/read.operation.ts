import { resolveFileReference, type WorkspaceFiles } from './file-references';
import { runInternalCommand, type KnowledgeCommandRunner } from './search.operation';
import type {
	InternalKnowledgeCommandRequest,
	ParsedSearchKnowledgeInput,
	SearchKnowledgeOutput,
} from './schemas';

type ReadInput = Extract<ParsedSearchKnowledgeInput, { operation: 'read' }>;
const DEFAULT_READ_LINE_RANGE = { start: 1, end: 500 };

export async function runReadOperation<TWorkspace>(
	input: ReadInput,
	workspace: TWorkspace,
	files: WorkspaceFiles,
	commandService: KnowledgeCommandRunner<TWorkspace>,
): Promise<SearchKnowledgeOutput> {
	const resolvedFile = resolveFileReference(files, input.file);
	if (resolvedFile.status !== 'found') {
		return {
			operation: 'read',
			files,
			error: resolvedFile.error,
		};
	}
	const file = resolvedFile.file;
	const lineRange = input.lineRange ?? DEFAULT_READ_LINE_RANGE;
	const request: InternalKnowledgeCommandRequest = {
		command: 'read',
		file: file.relativePath,
		startLine: lineRange.start,
		endLine: lineRange.end,
	};
	const result = await runInternalCommand(commandService, workspace, request);
	return {
		operation: 'read',
		files,
		result: {
			...result,
			truncated: result.truncated || input.lineRange === undefined,
			citation: {
				fileName: file.fileName,
				lineRange,
				instruction:
					'Cite this source using only fileName and lineRange. Do not cite file ids, relative paths, binary ids, or storage ids.',
			},
		},
	};
}
