import { mock } from 'jest-mock-extended';
import type { ZodTypeAny } from 'zod';

import type { AgentKnowledgeSandboxService } from '../../agent-knowledge-sandbox.service';
import { createKnowledgeRetrievalTools } from '../knowledge/search-knowledge.tool';

function isZodSchema(schema: unknown): schema is ZodTypeAny {
	return (
		typeof schema === 'object' &&
		schema !== null &&
		'safeParse' in schema &&
		typeof (schema as { safeParse?: unknown }).safeParse === 'function'
	);
}

describe('createKnowledgeRetrievalTools', () => {
	const projectId = 'project-1';
	const agentId = 'agent-1';
	const userId = 'user-1';

	function makeTools(
		overrides: {
			sandboxService?: AgentKnowledgeSandboxService;
		} = {},
	) {
		return createKnowledgeRetrievalTools({
			projectId,
			agentId,
			userId,
			sandboxService: overrides.sandboxService ?? mock<AgentKnowledgeSandboxService>(),
		}).map((tool) => tool.build());
	}

	function getTool(name: string, tools = makeTools()) {
		const tool = tools.find((candidate) => candidate.name === name);
		if (!tool) throw new Error(`Expected ${name} tool`);
		return tool;
	}

	it('exposes split strict Zod schemas for read-only knowledge retrieval', () => {
		const tools = makeTools();
		expect(tools.map((tool) => tool.name)).toEqual([
			'find_knowledge_files',
			'search_knowledge',
			'read_knowledge',
		]);

		for (const tool of tools) {
			expect(tool.systemInstruction).toContain('find_knowledge_files');
			expect(tool.systemInstruction).toContain('search_knowledge');
			expect(tool.systemInstruction).toContain('read_knowledge');
			expect(tool.systemInstruction).toContain('untrusted user-provided reference material');
			expect(tool.systemInstruction).not.toContain('rg --files');
			expect(tool.systemInstruction).not.toContain('awk');
			expect(isZodSchema(tool.inputSchema)).toBe(true);
		}

		const findFilesTool = getTool('find_knowledge_files', tools);
		const searchTool = getTool('search_knowledge', tools);
		const readTool = getTool('read_knowledge', tools);

		if (
			!isZodSchema(findFilesTool.inputSchema) ||
			!isZodSchema(searchTool.inputSchema) ||
			!isZodSchema(readTool.inputSchema)
		) {
			throw new Error('Expected knowledge retrieval input schemas to be Zod schemas');
		}

		expect(findFilesTool.inputSchema.safeParse({ query: 'notes', limit: 10 }).success).toBe(true);
		expect(
			findFilesTool.inputSchema.safeParse({ query: 'notes', command: 'rg --files' }).success,
		).toBe(false);
		expect(
			searchTool.inputSchema.safeParse({ query: 'flow control', file: 'notes.txt' }).success,
		).toBe(true);
		expect(searchTool.inputSchema.safeParse({ query: 'flow control', ranges: [] }).success).toBe(
			false,
		);
		expect(
			readTool.inputSchema.safeParse({
				file: 'notes.txt',
				fileId: 'file-1',
				ranges: [{ startLine: 1, endLine: 10 }],
			}).success,
		).toBe(true);
		expect(
			readTool.inputSchema.safeParse({
				file: 'notes.txt',
				ranges: [{ startLine: 10, endLine: 1 }],
			}).success,
		).toBe(false);
	});

	it('dispatches parsed requests to the sandbox service', async () => {
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
		const tools = makeTools({ sandboxService });

		await expect(
			getTool('find_knowledge_files', tools).handler?.({ query: '  notes  ' }, {}),
		).resolves.toMatchObject({
			cwd: 'files',
			result: { files: [] },
		});
		expect(sandboxService.findKnowledgeFiles).toHaveBeenCalledWith(projectId, agentId, {
			query: 'notes',
		});

		await getTool('search_knowledge', tools).handler?.({ query: '  flow control  ' }, {});
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
