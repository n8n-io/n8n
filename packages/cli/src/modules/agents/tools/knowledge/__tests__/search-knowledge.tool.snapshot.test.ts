import type { BuiltTool } from '@n8n/agents';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { mock } from 'vitest-mock-extended';

import type { KnowledgeRetriever } from '@/modules/knowledge/knowledge-retriever';
import type {
	AgentKnowledgeFileReference,
	GlobKnowledgeFilesResult,
	ReadKnowledgeResult,
	SearchKnowledgeResult,
} from '@/modules/knowledge/retrieval/retrieval-schemas';

import { createKnowledgeRetrievalTools } from '../search-knowledge.tool';

/**
 * The contract of the knowledge tools with the model: what the model sees of
 * each tool, and what it gets back for a given result. The snapshot was taken
 * before the retrieval code moved into the knowledge module and must stay
 * byte-identical across moves. Update it only together with a deliberate
 * change to a tool, never to make a move pass.
 */

const projectId = 'project-1';
const agentId = 'agent-1';

const fileReference: AgentKnowledgeFileReference = {
	file: 'knowledge/notes.txt',
	fileId: 'file-1',
	storedAt: 'db',
	storageKey: 'agents/agent-1/knowledge/file-1',
	displayName: 'notes.txt',
	mimeType: 'text/plain',
	fileSizeBytes: 1234,
	createdAt: '2026-10-01T00:00:00.000Z',
};

const fixtures: {
	findFiles: GlobKnowledgeFilesResult;
	searchText: Record<SearchKnowledgeResult['outputMode'], SearchKnowledgeResult>;
	readFile: ReadKnowledgeResult;
} = {
	findFiles: {
		files: [fileReference],
		limit: 20,
		offset: 0,
		hasMore: true,
	},
	searchText: {
		content: {
			outputMode: 'content',
			matches: [
				{
					file: fileReference.file,
					fileId: fileReference.fileId,
					displayName: fileReference.displayName,
					lineNumber: 2,
					text: 'refund within 30 days',
					textTruncated: false,
					context: [
						{ lineNumber: 1, text: 'Returns policy', matched: false },
						{ lineNumber: 2, text: 'refund within 30 days', matched: true },
						{ lineNumber: 3, text: 'Exchanges within 60 days', matched: false },
					],
				},
			],
			limit: 10,
			hasMore: false,
			truncated: false,
		},
		files_with_matches: {
			outputMode: 'files_with_matches',
			files: [fileReference],
			limit: 10,
			hasMore: false,
			truncated: false,
		},
		count: {
			outputMode: 'count',
			counts: [
				{
					file: fileReference.file,
					fileId: fileReference.fileId,
					displayName: fileReference.displayName,
					count: 3,
				},
			],
			limit: 10,
			hasMore: false,
			truncated: false,
		},
	},
	readFile: {
		file: fileReference.file,
		fileId: fileReference.fileId,
		displayName: fileReference.displayName,
		createdAt: fileReference.createdAt,
		ranges: [
			{
				startLine: 1,
				endLine: 3,
				text: 'Returns policy\nrefund within 30 days\nExchanges within 60 days',
				citation: {
					file: fileReference.file,
					fileId: fileReference.fileId,
					displayName: fileReference.displayName,
					startLine: 1,
					endLine: 3,
				},
			},
		],
		truncated: true,
	},
};

const failure = new Error('sandbox unavailable');

function buildTools(retriever: KnowledgeRetriever): BuiltTool[] {
	return createKnowledgeRetrievalTools({
		scope: { kind: 'agent', projectId, agentId },
		retriever,
		startToolCall: () => () => {},
	}).map((builder) => builder.build());
}

function getTool(tools: BuiltTool[], name: string): BuiltTool {
	const tool = tools.find((candidate) => candidate.name === name);
	if (!tool) throw new Error(`Expected ${name} tool to be built`);
	return tool;
}

/** Everything of a tool that reaches the model or decides how the runtime treats it. */
function toModelFacingDefinition(tool: BuiltTool) {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: zodToJsonSchema(tool.inputSchema),
		systemInstruction: tool.systemInstruction,
		approval: tool.approval,
		requiresWorkspace: tool.requiresWorkspace,
		outputTrust: tool.outputTrust,
		legacyNames: tool.legacyNames,
	};
}

async function callTool(tool: BuiltTool, input: unknown) {
	if (!tool.handler) throw new Error(`Expected ${tool.name} tool to have a handler`);
	const output = await tool.handler(input, { runId: 'run-1' });
	return {
		output,
		modelOutput: tool.toModelOutput ? tool.toModelOutput(output) : output,
	};
}

describe('knowledge retrieval tools contract', () => {
	it('exposes the same tools, in the same order, with the same definitions', () => {
		const tools = buildTools(mock<KnowledgeRetriever>());

		expect(tools.map(toModelFacingDefinition)).toMatchSnapshot();
	});

	it('returns the same find_file output and model output', async () => {
		const retriever = mock<KnowledgeRetriever>();
		retriever.findFiles.mockResolvedValue(fixtures.findFiles);
		const tool = getTool(buildTools(retriever), 'find_file');

		await expect(
			callTool(tool, { pattern: '*.txt', limit: 20, offset: 0 }),
		).resolves.toMatchSnapshot();
	});

	it.each(['content', 'files_with_matches', 'count'] as const)(
		'returns the same search_text output and model output in %s mode',
		async (outputMode) => {
			const retriever = mock<KnowledgeRetriever>();
			retriever.searchText.mockResolvedValue(fixtures.searchText[outputMode]);
			const tool = getTool(buildTools(retriever), 'search_text');

			await expect(
				callTool(tool, { pattern: 'refund', path: [fileReference.file], output_mode: outputMode }),
			).resolves.toMatchSnapshot();
		},
	);

	it('returns the same read_file output and model output', async () => {
		const retriever = mock<KnowledgeRetriever>();
		retriever.readFile.mockResolvedValue(fixtures.readFile);
		const tool = getTool(buildTools(retriever), 'read_file');

		await expect(
			callTool(tool, { file: fileReference.file, ranges: [{ startLine: 1, endLine: 3 }] }),
		).resolves.toMatchSnapshot();
	});

	it.each([
		['find_file', { pattern: '*' }],
		['search_text', { pattern: 'refund' }],
		['read_file', { file: fileReference.file }],
	] as const)('returns the same %s error output when the retrieval fails', async (name, input) => {
		const retriever = mock<KnowledgeRetriever>();
		retriever.findFiles.mockRejectedValue(failure);
		retriever.searchText.mockRejectedValue(failure);
		retriever.readFile.mockRejectedValue(failure);
		const tool = getTool(buildTools(retriever), name);

		await expect(callTool(tool, input)).resolves.toMatchSnapshot();
	});
});
