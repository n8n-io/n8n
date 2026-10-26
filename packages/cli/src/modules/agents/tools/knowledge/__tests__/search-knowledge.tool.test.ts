import type { BuiltTool } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import type { AgentKnowledgeMirrorService } from '../../../agent-knowledge-mirror.service';
import type {
	FinishKnowledgeToolCall,
	KnowledgeToolCall,
} from '../../../agent-knowledge-usage-tracker';
import { createKnowledgeRetrievalTools } from '../search-knowledge.tool';

const projectId = 'project-1';
const agentId = 'agent-1';

function buildTool(
	knowledgeMirrorService: AgentKnowledgeMirrorService,
	toolName: 'find_file' | 'search_text' | 'read_file',
	startToolCall: (
		runId: string | undefined,
		call: KnowledgeToolCall,
	) => FinishKnowledgeToolCall = () => () => {},
): BuiltTool {
	const tool = createKnowledgeRetrievalTools({
		projectId,
		agentId,
		knowledgeMirrorService,
		startToolCall,
	})
		.map((builder) => builder.build())
		.find((candidate) => candidate.name === toolName);

	if (!tool) {
		throw new Error(`Expected ${toolName} tool to be built`);
	}
	return tool;
}

function mockToolCallTracking() {
	const finishToolCall = vi.fn<FinishKnowledgeToolCall>();
	const startToolCall = vi.fn().mockReturnValue(finishToolCall);
	return { startToolCall, finishToolCall };
}

/** Length of the JSON that the model gets for this tool output. */
function modelOutputLength(tool: BuiltTool, output: unknown): number {
	const modelOutput = tool.toModelOutput ? tool.toModelOutput(output) : output;
	return JSON.stringify(modelOutput).length;
}

function getToolHandler(tool: BuiltTool): NonNullable<BuiltTool['handler']> {
	if (!tool.handler) {
		throw new Error(`Expected ${tool.name} tool to have a handler`);
	}
	return tool.handler;
}

describe('createKnowledgeRetrievalTools', () => {
	it('finds files through the Agent-scoped knowledge mirror', async () => {
		const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		knowledgeMirrorService.globKnowledgeFiles.mockResolvedValue({
			files: [],
			limit: 20,
			offset: 0,
			hasMore: false,
		});
		const tool = buildTool(knowledgeMirrorService, 'find_file');
		const input = { pattern: '*' };

		await getToolHandler(tool)(input, {
			persistence: { threadId: 'thread-1', resourceId: 'integration:slack:U123' },
		});

		expect(knowledgeMirrorService.globKnowledgeFiles).toHaveBeenCalledWith(
			projectId,
			agentId,
			input,
		);
	});

	it('searches the Agent-scoped knowledge mirror regardless of the memory resource', async () => {
		const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		knowledgeMirrorService.searchKnowledge.mockResolvedValue({
			outputMode: 'content',
			matches: [],
			limit: 10,
			hasMore: false,
			truncated: false,
		});
		const tool = buildTool(knowledgeMirrorService, 'search_text');
		const input = { pattern: 'needle', path: ['notes.txt'] };

		await getToolHandler(tool)(input, {
			persistence: { threadId: 'thread-1', resourceId: 'integration:slack:U123' },
		});

		expect(knowledgeMirrorService.searchKnowledge).toHaveBeenCalledWith(projectId, agentId, input);
	});

	it('reads the Agent-scoped knowledge mirror regardless of the memory resource', async () => {
		const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		knowledgeMirrorService.readKnowledge.mockResolvedValue({
			file: 'notes.txt',
			fileId: 'file-1',
			displayName: 'notes.txt',
			createdAt: '2026-10-01T00:00:00.000Z',
			ranges: [],
			truncated: false,
		});
		const tool = buildTool(knowledgeMirrorService, 'read_file');
		const input = { file: 'notes.txt', ranges: [{ startLine: 1, endLine: 3 }] };

		await getToolHandler(tool)(input, {
			persistence: { threadId: 'thread-1', resourceId: 'integration:slack:U123' },
		});

		expect(knowledgeMirrorService.readKnowledge).toHaveBeenCalledWith(projectId, agentId, input);
	});

	it.each([
		['find_file', 'file_find', { pattern: '*' }],
		['search_text', 'file_search', { pattern: 'refund' }],
		['read_file', 'file_read', { file: 'notes.txt' }],
	] as const)(
		'records one %s call with the size of the output that the model gets',
		async (toolName, call, input) => {
			const { startToolCall, finishToolCall } = mockToolCallTracking();
			const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
			knowledgeMirrorService.globKnowledgeFiles.mockResolvedValue({
				files: [],
				limit: 20,
				offset: 0,
				hasMore: false,
			});
			knowledgeMirrorService.searchKnowledge.mockResolvedValue({
				outputMode: 'content',
				matches: [],
				limit: 10,
				hasMore: false,
				truncated: false,
			});
			knowledgeMirrorService.readKnowledge.mockResolvedValue({
				file: 'notes.txt',
				fileId: 'file-1',
				displayName: 'notes.txt',
				createdAt: '2026-10-01T00:00:00.000Z',
				ranges: [],
				truncated: false,
			});
			const tool = buildTool(knowledgeMirrorService, toolName, startToolCall);

			const output = await getToolHandler(tool)(input, { runId: 'run-1' });

			expect(startToolCall).toHaveBeenCalledTimes(1);
			expect(startToolCall).toHaveBeenCalledWith('run-1', call);
			expect(finishToolCall).toHaveBeenCalledWith(
				expect.objectContaining({
					failed: false,
					contentChars: modelOutputLength(tool, output),
				}),
			);
		},
	);

	it('records the size of the shortened text when the model gets only part of a file', async () => {
		const { startToolCall, finishToolCall } = mockToolCallTracking();
		const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		const file = { file: 'notes.txt', fileId: 'file-1', displayName: 'notes.txt' };
		const longText = 'a'.repeat(20_000);
		knowledgeMirrorService.readKnowledge.mockResolvedValue({
			...file,
			createdAt: '2026-10-01T00:00:00.000Z',
			ranges: [
				{
					startLine: 1,
					endLine: 500,
					text: longText,
					citation: { ...file, startLine: 1, endLine: 500 },
				},
			],
			truncated: false,
		});
		const tool = buildTool(knowledgeMirrorService, 'read_file', startToolCall);

		const output = await getToolHandler(tool)({ file: 'notes.txt' }, { runId: 'run-1' });

		const contentChars = modelOutputLength(tool, output);
		expect(contentChars).toBeLessThan(longText.length);
		expect(finishToolCall).toHaveBeenCalledWith({
			failed: false,
			contentChars,
			readFile: { fileId: 'file-1', uploadedAt: '2026-10-01T00:00:00.000Z' },
		});
	});

	it('records a call that fails as failed, with no content characters', async () => {
		const { startToolCall, finishToolCall } = mockToolCallTracking();
		const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		knowledgeMirrorService.searchKnowledge.mockRejectedValue(new Error('search failed'));
		const tool = buildTool(knowledgeMirrorService, 'search_text', startToolCall);

		await getToolHandler(tool)({ pattern: 'refund' }, { runId: 'run-1' });

		expect(startToolCall).toHaveBeenCalledWith('run-1', 'file_search');
		expect(finishToolCall).toHaveBeenCalledWith({
			failed: true,
			searchDurationMs: expect.any(Number),
			errorType: 'Error',
		});
	});

	it.each([
		['content', { outputMode: 'content', matches: [] }, true],
		[
			'content',
			{
				outputMode: 'content',
				matches: [
					{
						file: 'notes.txt',
						fileId: 'file-1',
						displayName: 'notes.txt',
						lineNumber: 1,
						text: 'refund',
						textTruncated: false,
					},
				],
			},
			false,
		],
		['files_with_matches', { outputMode: 'files_with_matches', files: [] }, true],
		[
			'count',
			{
				outputMode: 'count',
				counts: [{ file: 'notes.txt', fileId: 'file-1', displayName: 'notes.txt', count: 0 }],
			},
			true,
		],
	] as const)(
		'passes the duration of a search_text call in %s mode, and whether it found nothing',
		async (_mode, searchResult, emptySearch) => {
			const { startToolCall, finishToolCall } = mockToolCallTracking();
			const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
			knowledgeMirrorService.searchKnowledge.mockResolvedValue({
				...searchResult,
				limit: 10,
				hasMore: false,
				truncated: false,
			} as never);
			const tool = buildTool(knowledgeMirrorService, 'search_text', startToolCall);

			await getToolHandler(tool)({ pattern: 'refund' }, { runId: 'run-1' });

			expect(finishToolCall).toHaveBeenCalledWith(
				expect.objectContaining({
					failed: false,
					searchDurationMs: expect.any(Number),
					emptySearch,
				}),
			);
		},
	);

	it('passes the upload time of the file that read_file read, but not to the model', async () => {
		const { startToolCall, finishToolCall } = mockToolCallTracking();
		const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		knowledgeMirrorService.readKnowledge.mockResolvedValue({
			file: 'notes.txt',
			fileId: 'file-1',
			displayName: 'notes.txt',
			createdAt: '2026-10-01T00:00:00.000Z',
			ranges: [],
			truncated: false,
		});
		const tool = buildTool(knowledgeMirrorService, 'read_file', startToolCall);

		const output = await getToolHandler(tool)({ file: 'notes.txt' }, { runId: 'run-1' });

		expect(finishToolCall).toHaveBeenCalledWith(
			expect.objectContaining({
				failed: false,
				readFile: { fileId: 'file-1', uploadedAt: '2026-10-01T00:00:00.000Z' },
			}),
		);
		expect(tool.toModelOutput?.(output)).not.toHaveProperty('createdAt');
	});

	it('passes no upload time for a read that fails', async () => {
		const { startToolCall, finishToolCall } = mockToolCallTracking();
		const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		knowledgeMirrorService.readKnowledge.mockRejectedValue(new Error('read failed'));
		const tool = buildTool(knowledgeMirrorService, 'read_file', startToolCall);

		await getToolHandler(tool)({ file: 'notes.txt' }, { runId: 'run-1' });

		expect(finishToolCall).toHaveBeenCalledWith({ failed: true });
	});

	it('counts a call before the knowledge mirror answers', async () => {
		const { startToolCall, finishToolCall } = mockToolCallTracking();
		const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		knowledgeMirrorService.readKnowledge.mockReturnValue(new Promise(() => {}));
		const tool = buildTool(knowledgeMirrorService, 'read_file', startToolCall);

		void getToolHandler(tool)({ file: 'notes.txt' }, { runId: 'run-1' });

		expect(startToolCall).toHaveBeenCalledWith('run-1', 'file_read');
		expect(finishToolCall).not.toHaveBeenCalled();
	});
});
