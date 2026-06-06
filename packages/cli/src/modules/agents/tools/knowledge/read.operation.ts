import { resolveFileReference, type WorkspaceFiles } from './file-references';
import { runInternalCommand, type KnowledgeCommandRunner } from './search.operation';
import type {
	InternalKnowledgeCommandRequest,
	ParsedSearchKnowledgeInput,
	SearchKnowledgeOutput,
} from './schemas';

type ReadInput = Extract<ParsedSearchKnowledgeInput, { operation: 'read' }>;

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
	const request: InternalKnowledgeCommandRequest = input.lineRange
		? {
				command: 'sed',
				file: file.relativePath,
				startLine: input.lineRange.start,
				endLine: input.lineRange.end,
			}
		: { command: 'cat', file: file.relativePath };
	const result = await runInternalCommand(commandService, workspace, request);
	return {
		operation: 'read',
		files,
		result: {
			...result,
			citation: {
				fileName: file.fileName,
				lineRange: input.lineRange,
				instruction:
					'Cite this source using only fileName and lineRange. Do not cite file ids, relative paths, binary ids, or storage ids.',
			},
		},
	};
}
