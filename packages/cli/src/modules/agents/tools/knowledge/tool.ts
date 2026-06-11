import { Tool } from '@n8n/agents/tool';
import { createHash } from 'node:crypto';

import type { AgentKnowledgeCommandService } from '../../agent-knowledge-command.service';
import type { AgentKnowledgeService } from '../../agent-knowledge.service';

import { aggregateCsv, distinctCsv, profileCsv, queryCsv } from './csv.operation';
import { getRequiredFileReferences, type WorkspaceFiles } from './file-references';
import { runReadOperation } from './read.operation';
import { runSearchOperation } from './search.operation';
import {
	getSearchKnowledgeOperation,
	parseSearchKnowledgeInput,
	searchKnowledgeInputSchema,
	searchKnowledgeOutputSchema,
	type ParsedSearchKnowledgeInput,
	type SearchKnowledgeOutput,
} from './schemas';

export function createSearchKnowledgeTool({
	agentId,
	projectId,
	knowledgeService,
	commandService,
}: {
	agentId: string;
	projectId: string;
	knowledgeService: AgentKnowledgeService;
	commandService: AgentKnowledgeCommandService;
}) {
	return new Tool('search_knowledge')
		.description(
			'List, read, search, and query files uploaded to this agent knowledge base. ' +
				'Use this when the user asks about uploaded documents or facts likely contained in them.',
		)
		.systemInstruction(
			'Use search_knowledge to inspect uploaded knowledge files. Do not claim a file says something ' +
				'unless you found it via list, search, read, or a CSV operation. Search defaults to output_mode=files_with_matches. ' +
				'Use output_mode=count for counts and output_mode=content only after narrowing to a file or exact phrase. ' +
				'For conceptual multi-term lookup, use queries with match_mode instead of writing regex by hand. ' +
				'Use read for grounded citations. Cite only file names and line ranges from read results. ' +
				'Never mention uploaded file ids, relative paths, binary ids, or storage ids to users. ' +
				'For unfamiliar CSVs, call csv_profile first. Use csv_query for rows, csv_distinct for possible values, and csv_aggregate for counts or numeric calculations. ' +
				'Do not answer from the first CSV row when rowCount is high or truncated; refine filters using ambiguity hints.',
		)
		.input(searchKnowledgeInputSchema)
		.output(searchKnowledgeOutputSchema)
		.handler(async (input: unknown): Promise<SearchKnowledgeOutput> => {
			let parsedInput: ParsedSearchKnowledgeInput;
			try {
				parsedInput = parseSearchKnowledgeInput(input);
			} catch (error) {
				return {
					operation: getSearchKnowledgeOperation(input),
					files: [],
					error: toToolErrorMessage(error),
				};
			}

			if (parsedInput.operation === 'list') {
				try {
					return {
						operation: 'list',
						files: await knowledgeService.listWorkspaceFiles(agentId, projectId),
					};
				} catch (error) {
					return {
						operation: 'list',
						files: [],
						error: toToolErrorMessage(error),
					};
				}
			}

			let files: WorkspaceFiles = [];
			try {
				const fileReferences = getRequiredFileReferences(parsedInput);
				files = await knowledgeService.resolveWorkspaceFiles(agentId, projectId, fileReferences);
				const cacheKey = buildWorkspaceCacheKey(projectId, agentId, files);
				return await commandService.withCachedWorkspace(
					cacheKey,
					async (workspaceRoot) => {
						await knowledgeService.materializeWorkspace(agentId, projectId, workspaceRoot, {
							fileReferences,
						});
					},
					async (workspaceRoot) =>
						await handleKnowledgeOperation(parsedInput, workspaceRoot, files, commandService),
				);
			} catch (error) {
				return {
					operation: parsedInput.operation,
					files,
					error: toToolErrorMessage(error),
				};
			}
		})
		.build();
}

/**
 * Stable cache key for a materialized workspace. Encodes the agent plus the
 * exact set of files and their sizes, so a different file selection or an
 * add/delete invalidates the cache and forces re-materialization.
 */
function buildWorkspaceCacheKey(projectId: string, agentId: string, files: WorkspaceFiles): string {
	const signature = files
		.map((file) => `${file.relativePath}:${file.fileSizeBytes}`)
		.sort()
		.join('|');
	return `${projectId}:${agentId}:${createHash('sha1').update(signature).digest('hex')}`;
}

/**
 * Build the user-facing error string returned to the model. Strips absolute
 * filesystem paths so internal temp/storage locations never leak to the model
 * (and onward to end users).
 */
function toToolErrorMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return message.replace(/(^|[\s'"(])\/(?:[^\s'"()]+\/)*[^\s'"()]+/g, '$1[path]');
}

async function handleKnowledgeOperation(
	input: ParsedSearchKnowledgeInput,
	workspaceRoot: string,
	files: WorkspaceFiles,
	commandService: AgentKnowledgeCommandService,
): Promise<SearchKnowledgeOutput> {
	switch (input.operation) {
		case 'list':
			return {
				operation: 'list',
				files,
			};
		case 'search':
			return await runSearchOperation(input, workspaceRoot, files, commandService);
		case 'read':
			return await runReadOperation(input, workspaceRoot, files, commandService);
		case 'csv_query':
			return {
				operation: 'csv_query',
				files,
				csv: await queryCsv(workspaceRoot, files, input),
			};
		case 'csv_profile':
			return {
				operation: 'csv_profile',
				files,
				csvProfile: await profileCsv(workspaceRoot, files, input),
			};
		case 'csv_distinct':
			return {
				operation: 'csv_distinct',
				files,
				csvDistinct: await distinctCsv(workspaceRoot, files, input),
			};
		case 'csv_aggregate':
			return {
				operation: 'csv_aggregate',
				files,
				csvAggregate: await aggregateCsv(workspaceRoot, files, input),
			};
	}
}
