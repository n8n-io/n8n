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
				ranges: [],
				truncated: false,
			});
			const tool = buildTool(knowledgeMirrorService, toolName, startToolCall);

			const output = await getToolHandler(tool)(input, { runId: 'run-1' });

			expect(startToolCall).toHaveBeenCalledTimes(1);
			expect(startToolCall).toHaveBeenCalledWith('run-1', call);
			expect(finishToolCall).toHaveBeenCalledWith({
				failed: false,
				contentChars: modelOutputLength(tool, output),
			});
		},
	);

	it('records the size of the shortened text when the model gets only part of a file', async () => {
		const { startToolCall, finishToolCall } = mockToolCallTracking();
		const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		const file = { file: 'notes.txt', fileId: 'file-1', displayName: 'notes.txt' };
		const longText = 'a'.repeat(20_000);
		knowledgeMirrorService.readKnowledge.mockResolvedValue({
			...file,
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
		});
	});

	it('records a call that fails as failed, with no content characters', async () => {
		const { startToolCall, finishToolCall } = mockToolCallTracking();
		const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		knowledgeMirrorService.searchKnowledge.mockRejectedValue(new Error('search failed'));
		const tool = buildTool(knowledgeMirrorService, 'search_text', startToolCall);

		await getToolHandler(tool)({ pattern: 'refund' }, { runId: 'run-1' });

		expect(startToolCall).toHaveBeenCalledWith('run-1', 'file_search');
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
