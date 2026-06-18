import { mock, type MockProxy } from 'jest-mock-extended';

import type { AgentKnowledgeSandboxService } from '../agent-knowledge-sandbox.service';
import { createKnowledgeRetrievalTools } from '../tools/knowledge/search-knowledge.tool';

const projectId = 'project-1';
const agentId = 'agent-1';
const ownerUserId = 'publisher-user';

describe('createKnowledgeRetrievalTools sandbox scope', () => {
	let sandboxService: MockProxy<AgentKnowledgeSandboxService>;

	beforeEach(() => {
		sandboxService = mock<AgentKnowledgeSandboxService>();
		sandboxService.searchKnowledge.mockResolvedValue({
			matches: [],
			limit: 20,
			hasMore: false,
			truncated: false,
		});
		sandboxService.readKnowledge.mockResolvedValue({
			file: 'notes.txt',
			fileId: 'file-1',
			displayName: 'notes.txt',
			ranges: [],
			truncated: false,
		});
	});

	function getTool(name: string) {
		const tools = createKnowledgeRetrievalTools({
			projectId,
			agentId,
			userId: ownerUserId,
			sandboxService,
		}).map((tool) => tool.build());
		const tool = tools.find((candidate) => candidate.name === name);
		if (!tool) throw new Error(`Expected tool ${name}`);
		return tool;
	}

	it('passes integration persistence resourceId as sandbox scope to search_text', async () => {
		const searchTool = getTool('search_text');
		if (!searchTool.handler) throw new Error('Expected search_text handler');

		await searchTool.handler(
			{ query: 'hello' },
			{
				persistence: {
					threadId: 'thread-1',
					resourceId: 'integration:telegram:12345',
				},
			},
		);

		expect(sandboxService.searchKnowledge).toHaveBeenCalledWith(
			projectId,
			agentId,
			ownerUserId,
			{ query: 'hello' },
			{ sandboxScopeId: 'integration:telegram:12345' },
		);
	});

	it('passes integration persistence resourceId as sandbox scope to read_file', async () => {
		const readTool = getTool('read_file');
		if (!readTool.handler) throw new Error('Expected read_file handler');

		await readTool.handler(
			{ file: 'notes.txt' },
			{
				persistence: {
					threadId: 'thread-1',
					resourceId: 'integration:telegram:12345',
				},
			},
		);

		expect(sandboxService.readKnowledge).toHaveBeenCalledWith(
			projectId,
			agentId,
			ownerUserId,
			{ file: 'notes.txt' },
			{ sandboxScopeId: 'integration:telegram:12345' },
		);
	});

	it('falls back to owner user id when persistence is not an integration resource', async () => {
		const searchTool = getTool('search_text');
		if (!searchTool.handler) throw new Error('Expected search_text handler');

		await searchTool.handler(
			{ query: 'hello' },
			{
				persistence: {
					threadId: 'thread-1',
					resourceId: 'draft-chat:user-1',
				},
			},
		);

		expect(sandboxService.searchKnowledge).toHaveBeenCalledWith(
			projectId,
			agentId,
			ownerUserId,
			{ query: 'hello' },
			{ sandboxScopeId: ownerUserId },
		);
	});

	it('falls back to owner user id when persistence is absent', async () => {
		const searchTool = getTool('search_text');
		if (!searchTool.handler) throw new Error('Expected search_text handler');

		await searchTool.handler({ query: 'hello' }, {});

		expect(sandboxService.searchKnowledge).toHaveBeenCalledWith(
			projectId,
			agentId,
			ownerUserId,
			{ query: 'hello' },
			{ sandboxScopeId: ownerUserId },
		);
	});
});
