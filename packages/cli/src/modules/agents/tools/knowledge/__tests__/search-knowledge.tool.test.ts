import type { BuiltTool } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import type { AgentKnowledgeMirrorService } from '../../../agent-knowledge-mirror.service';
import type { KnowledgeToolCall } from '../../../agent-knowledge-usage-tracker';
import { createKnowledgeRetrievalTools } from '../search-knowledge.tool';

const projectId = 'project-1';
const agentId = 'agent-1';

function buildTool(
	knowledgeMirrorService: AgentKnowledgeMirrorService,
	toolName: 'find_file' | 'search_text' | 'read_file',
	recordToolCall: (runId: string | undefined, call: KnowledgeToolCall) => void = vi.fn(),
): BuiltTool {
	const tool = createKnowledgeRetrievalTools({
		projectId,
		agentId,
		knowledgeMirrorService,
		recordToolCall,
	})
		.map((builder) => builder.build())
		.find((candidate) => candidate.name === toolName);

	if (!tool) {
		throw new Error(`Expected ${toolName} tool to be built`);
	}
	return tool;
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
	] as const)('records one %s call for the run', async (toolName, call, input) => {
		const recordToolCall = vi.fn();
		const tool = buildTool(mock<AgentKnowledgeMirrorService>(), toolName, recordToolCall);

		await getToolHandler(tool)(input, { runId: 'run-1' });

		expect(recordToolCall).toHaveBeenCalledTimes(1);
		expect(recordToolCall).toHaveBeenCalledWith('run-1', call);
	});

	it('records a call that fails', async () => {
		const recordToolCall = vi.fn();
		const knowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		knowledgeMirrorService.searchKnowledge.mockRejectedValue(new Error('search failed'));
		const tool = buildTool(knowledgeMirrorService, 'search_text', recordToolCall);

		await getToolHandler(tool)({ pattern: 'refund' }, { runId: 'run-1' });

		expect(recordToolCall).toHaveBeenCalledWith('run-1', 'file_search');
	});
});
