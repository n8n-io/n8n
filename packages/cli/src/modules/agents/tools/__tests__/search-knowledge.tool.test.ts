import { mock } from 'jest-mock-extended';

import type { AgentKnowledgeSandboxService } from '../../agent-knowledge-sandbox.service';
import { createKnowledgeRetrievalTools } from '../knowledge/search-knowledge.tool';

describe('createKnowledgeRetrievalTools', () => {
	const projectId = 'project-1';
	const agentId = 'agent-1';
	const userId = 'user-1';

	function makeTools(sandboxService: AgentKnowledgeSandboxService) {
		return createKnowledgeRetrievalTools({
			projectId,
			agentId,
			userId,
			sandboxService,
		}).map((tool) => tool.build());
	}

	function getTool(name: string, tools: ReturnType<typeof makeTools>) {
		const tool = tools.find((candidate) => candidate.name === name);
		if (!tool) throw new Error(`Expected ${name} tool`);
		return tool;
	}

	it('exposes read-only knowledge retrieval tools and dispatches to the sandbox service', async () => {
		const sandboxService = mock<AgentKnowledgeSandboxService>();
		sandboxService.findKnowledgeFiles.mockResolvedValue({
			files: [],
			limit: 20,
			offset: 0,
			hasMore: false,
		});
		sandboxService.searchKnowledge.mockResolvedValue({
			matches: [],
			limit: 20,
			offset: 0,
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
		const tools = makeTools(sandboxService);

		expect(tools.map((tool) => tool.name)).toEqual([
			'find_knowledge_files',
			'search_knowledge',
			'read_knowledge',
		]);

		for (const tool of tools) {
			expect(tool.inputSchema).toBeDefined();
			expect(tool.systemInstruction).toContain('untrusted user-provided reference material');
		}

		await expect(
			getTool('find_knowledge_files', tools).handler?.({ query: 'notes' }, {}),
		).resolves.toMatchObject({
			files: [],
		});
		expect(sandboxService.findKnowledgeFiles).toHaveBeenCalledWith(projectId, agentId, {
			query: 'notes',
		});

		await getTool('search_knowledge', tools).handler?.({ query: 'flow control' }, {});
		expect(sandboxService.searchKnowledge).toHaveBeenCalledWith(projectId, agentId, userId, {
			query: 'flow control',
		});

		await getTool('read_knowledge', tools).handler?.(
			{ file: 'notes.txt', ranges: [{ startLine: 1, endLine: 3 }] },
			{},
		);
		expect(sandboxService.readKnowledge).toHaveBeenCalledWith(projectId, agentId, userId, {
			file: 'notes.txt',
			ranges: [{ startLine: 1, endLine: 3 }],
		});
	});
});
