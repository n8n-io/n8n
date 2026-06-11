import type { AgentKnowledgeCommandService } from '../../agent-knowledge-command.service';

import { resolveFileReference, type WorkspaceFiles } from './file-references';
import { runInternalCommand } from './search.operation';
import type {
	InternalKnowledgeCommandRequest,
	ParsedSearchKnowledgeInput,
	SearchKnowledgeOutput,
} from './schemas';

type ReadInput = Extract<ParsedSearchKnowledgeInput, { operation: 'read' }>;

export async function runReadOperation(
	input: ReadInput,
	workspaceRoot: string,
	files: WorkspaceFiles,
	commandService: AgentKnowledgeCommandService,
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
	const result = await runInternalCommand(commandService, workspaceRoot, request);
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
