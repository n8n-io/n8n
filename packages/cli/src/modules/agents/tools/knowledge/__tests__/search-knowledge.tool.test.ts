import type { BuiltTool } from '@n8n/agents';
import { mock } from 'jest-mock-extended';

import type { AgentKnowledgeSandboxService } from '../../../agent-knowledge-sandbox.service';
import { createKnowledgeRetrievalTools } from '../search-knowledge.tool';

const projectId = 'project-1';
const agentId = 'agent-1';
const userId = 'user-1';

function buildTool(
	sandboxService: AgentKnowledgeSandboxService,
	toolName: 'search_text' | 'read_file',
): BuiltTool {
	const tool = createKnowledgeRetrievalTools({
		projectId,
		agentId,
		userId,
		sandboxService,
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
	it('searches knowledge with the user-scoped sandbox even when memory uses an integration resource', async () => {
		const sandboxService = mock<AgentKnowledgeSandboxService>();
		sandboxService.searchKnowledge.mockResolvedValue({
			outputMode: 'content',
			matches: [],
			limit: 10,
			hasMore: false,
			truncated: false,
		});
		const tool = buildTool(sandboxService, 'search_text');
		const input = { pattern: 'needle', path: ['notes.txt'] };

		await getToolHandler(tool)(input, {
			persistence: { threadId: 'thread-1', resourceId: 'integration:slack:U123' },
		});

		expect(sandboxService.searchKnowledge).toHaveBeenCalledWith(projectId, agentId, userId, input);
	});

	it('reads knowledge with the user-scoped sandbox even when memory uses an integration resource', async () => {
		const sandboxService = mock<AgentKnowledgeSandboxService>();
		sandboxService.readKnowledge.mockResolvedValue({
			file: 'notes.txt',
			fileId: 'file-1',
			displayName: 'notes.txt',
			ranges: [],
			truncated: false,
		});
		const tool = buildTool(sandboxService, 'read_file');
		const input = { file: 'notes.txt', ranges: [{ startLine: 1, endLine: 3 }] };

		await getToolHandler(tool)(input, {
			persistence: { threadId: 'thread-1', resourceId: 'integration:slack:U123' },
		});

		expect(sandboxService.readKnowledge).toHaveBeenCalledWith(projectId, agentId, userId, input);
	});
});
