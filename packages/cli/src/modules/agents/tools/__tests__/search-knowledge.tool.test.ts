import { mock } from 'jest-mock-extended';
import type { ZodTypeAny } from 'zod';

import type { AgentKnowledgeSandboxService } from '../../agent-knowledge-sandbox.service';
import { createSearchKnowledgeTool } from '../knowledge/search-knowledge.tool';

function isZodSchema(schema: unknown): schema is ZodTypeAny {
	return (
		typeof schema === 'object' &&
		schema !== null &&
		'safeParse' in schema &&
		typeof (schema as { safeParse?: unknown }).safeParse === 'function'
	);
}

describe('createSearchKnowledgeTool', () => {
	const projectId = 'project-1';
	const agentId = 'agent-1';

	function makeTool(
		overrides: {
			sandboxService?: AgentKnowledgeSandboxService;
		} = {},
	) {
		return createSearchKnowledgeTool({
			projectId,
			agentId,
			sandboxService: overrides.sandboxService ?? mock<AgentKnowledgeSandboxService>(),
		}).build();
	}

	it('exposes a command-only contract for read-only knowledge retrieval', () => {
		const tool = makeTool();
		expect(tool.name).toBe('search_knowledge');
		expect(tool.description).toContain('Destructive actions are never allowed');
		expect(tool.systemInstruction).toContain(
			'Destructive or write-oriented commands are never allowed',
		);
		expect(tool.systemInstruction).toContain('rg --files');
		expect(tool.systemInstruction).toContain('awk');
		expect(tool.systemInstruction).toContain('do not use `&&`');
		expect(tool.systemInstruction).toContain('at most three commands');

		expect(isZodSchema(tool.inputSchema)).toBe(true);
		if (!isZodSchema(tool.inputSchema)) {
			throw new Error('Expected search_knowledge input schema to be a Zod schema');
		}

		expect(
			tool.inputSchema.safeParse({ command: 'rg --files | rg -i "9000|quic" | head -20' }).success,
		).toBe(true);
		expect(tool.inputSchema.safeParse({ command: '   ' }).success).toBe(false);
		expect(tool.inputSchema.safeParse({ command: 'wc -l file', path: 'file' }).success).toBe(false);
	});

	it('dispatches trimmed commands to the sandbox service', async () => {
		const sandboxService = mock<AgentKnowledgeSandboxService>();
		sandboxService.runKnowledgeCommand.mockResolvedValue({
			exitCode: 0,
			stdout: '3\n',
			stderr: '',
			stdoutTruncated: false,
			stderrTruncated: false,
		});
		const tool = makeTool({ sandboxService });

		await expect(
			tool.handler?.({ command: '  wc -l *.csv  ' }, { parentTelemetry: undefined }),
		).resolves.toMatchObject({
			cwd: 'files',
			command: 'wc -l *.csv',
			result: { stdout: '3\n' },
		});
		expect(sandboxService.runKnowledgeCommand).toHaveBeenCalledWith(projectId, agentId, {
			command: 'wc -l *.csv',
			timeoutMs: undefined,
		});
	});
});
