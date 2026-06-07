import { Tool } from '@n8n/agents/tool';
import { UnexpectedError } from 'n8n-workflow';

import type { AgentKnowledgeCsvService } from '../../agent-knowledge-csv.service';
import type { AgentKnowledgeSandboxCommandService } from '../../agent-knowledge-sandbox-command.service';
import type {
	AgentKnowledgeSandboxWorkspaceService,
	KnowledgeSandboxWorkspace,
} from '../../agent-knowledge-sandbox-workspace.service';
import type { AgentKnowledgeService } from '../../agent-knowledge.service';

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
	sandboxCommandService,
	csvService,
	sandboxWorkspaceService,
}: {
	agentId: string;
	projectId: string;
	knowledgeService: AgentKnowledgeService;
	sandboxCommandService: AgentKnowledgeSandboxCommandService;
	csvService: AgentKnowledgeCsvService;
	sandboxWorkspaceService: AgentKnowledgeSandboxWorkspaceService;
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
				if (isCsvOperation(parsedInput)) {
					const resolution = await knowledgeService.resolveWorkspaceFilesForRuntime(
						agentId,
						projectId,
						fileReferences,
					);
					return await handleCsvKnowledgeOperation(
						parsedInput,
						agentId,
						projectId,
						resolution.files,
						csvService,
					);
				}
				const workspaceResolution = await knowledgeService.resolveWorkspaceForSandboxOperation(
					agentId,
					projectId,
					fileReferences,
				);
				files = workspaceResolution.files;
				const { storedFiles } = workspaceResolution;
				const cacheKey = buildWorkspaceCacheKey(projectId, agentId);
				const expectedManifest = knowledgeService.buildExpectedSandboxManifest(
					agentId,
					projectId,
					storedFiles,
				);
				const storedFilesById = new Map(storedFiles.map((file) => [file.id, file] as const));

				return await sandboxWorkspaceService.withCachedWorkspace(cacheKey, async (workspace) => {
					await sandboxWorkspaceService.ensureWorkspaceContainsFiles(
						workspace,
						expectedManifest,
						async (missingFiles) => {
							const filesToMaterialize = missingFiles
								.map((file) => storedFilesById.get(file.id))
								.filter((file): file is NonNullable<typeof file> => file !== undefined);
							if (filesToMaterialize.length !== missingFiles.length) {
								throw new UnexpectedError(
									'Failed to resolve stored knowledge files for sandbox materialization',
								);
							}
							return await knowledgeService.materializeWorkspaceFilesIntoSandbox(
								agentId,
								projectId,
								workspace,
								filesToMaterialize,
							);
						},
					);

					return await handleSandboxKnowledgeOperation(
						parsedInput,
						workspace,
						files,
						sandboxCommandService,
					);
				});
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

/** Stable cache key for a materialized workspace per agent. */
function buildWorkspaceCacheKey(projectId: string, agentId: string): string {
	return `${projectId}:${agentId}:workspace`;
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

type SandboxKnowledgeOperationInput = Exclude<ParsedSearchKnowledgeInput, { operation: 'list' }>;
type CsvKnowledgeOperationInput = Extract<
	ParsedSearchKnowledgeInput,
	{ operation: 'csv_query' | 'csv_profile' | 'csv_distinct' | 'csv_aggregate' }
>;
type CommandKnowledgeOperationInput = Extract<
	ParsedSearchKnowledgeInput,
	{ operation: 'search' | 'read' }
>;

function isCsvOperation(
	input: SandboxKnowledgeOperationInput,
): input is CsvKnowledgeOperationInput {
	return (
		input.operation === 'csv_query' ||
		input.operation === 'csv_profile' ||
		input.operation === 'csv_distinct' ||
		input.operation === 'csv_aggregate'
	);
}

async function handleCsvKnowledgeOperation(
	input: CsvKnowledgeOperationInput,
	agentId: string,
	projectId: string,
	files: WorkspaceFiles,
	csvService: AgentKnowledgeCsvService,
): Promise<SearchKnowledgeOutput> {
	switch (input.operation) {
		case 'csv_query':
			return {
				operation: 'csv_query',
				files,
				csv: await csvService.queryCsv(agentId, projectId, input),
			};
		case 'csv_profile':
			return {
				operation: 'csv_profile',
				files,
				csvProfile: await csvService.profileCsv(agentId, projectId, input),
			};
		case 'csv_distinct':
			return {
				operation: 'csv_distinct',
				files,
				csvDistinct: await csvService.distinctCsv(agentId, projectId, input),
			};
		case 'csv_aggregate':
			return {
				operation: 'csv_aggregate',
				files,
				csvAggregate: await csvService.aggregateCsv(agentId, projectId, input),
			};
	}
}

async function handleSandboxKnowledgeOperation(
	input: CommandKnowledgeOperationInput,
	workspace: KnowledgeSandboxWorkspace,
	files: WorkspaceFiles,
	commandService: AgentKnowledgeSandboxCommandService,
): Promise<SearchKnowledgeOutput> {
	switch (input.operation) {
		case 'search':
			return await runSearchOperation(input, workspace, files, commandService);
		case 'read':
			return await runReadOperation(input, workspace, files, commandService);
	}
}
