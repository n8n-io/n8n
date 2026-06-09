import { mock } from 'jest-mock-extended';

import type { AgentKnowledgeSandboxService } from '../../agent-knowledge-sandbox.service';
import {
	SEARCH_KNOWLEDGE_SANDBOX_CREATED,
	SEARCH_KNOWLEDGE_SANDBOX_REUSED,
} from '../../agent-knowledge-sandbox.service';
import { createSearchKnowledgeTool } from '../knowledge/search-knowledge.tool';

describe('createSearchKnowledgeTool', () => {
	const projectId = 'project-1';
	const agentId = 'agent-1';

	function makeCtx() {
		return {
			parentTelemetry: undefined,
		};
	}

	it('builds a tool with the correct name', () => {
		const sandboxService = mock<AgentKnowledgeSandboxService>();
		const tool = createSearchKnowledgeTool({ projectId, agentId, sandboxService }).build();
		expect(tool.name).toBe('search_knowledge');
	});

	it('returns sandbox created from the service', async () => {
		const sandboxService = mock<AgentKnowledgeSandboxService>();
		sandboxService.ensureSandbox.mockResolvedValue(SEARCH_KNOWLEDGE_SANDBOX_CREATED);
		const tool = createSearchKnowledgeTool({ projectId, agentId, sandboxService }).build();

		await expect(tool.handler!({}, makeCtx())).resolves.toBe(SEARCH_KNOWLEDGE_SANDBOX_CREATED);
		expect(sandboxService.ensureSandbox).toHaveBeenCalledWith(projectId, agentId);
	});

	it('returns sandbox reused from the service', async () => {
		const sandboxService = mock<AgentKnowledgeSandboxService>();
		sandboxService.ensureSandbox.mockResolvedValue(SEARCH_KNOWLEDGE_SANDBOX_REUSED);
		const tool = createSearchKnowledgeTool({ projectId, agentId, sandboxService }).build();

		await expect(tool.handler!({}, makeCtx())).resolves.toBe(SEARCH_KNOWLEDGE_SANDBOX_REUSED);
		expect(sandboxService.ensureSandbox).toHaveBeenCalledWith(projectId, agentId);
	});
});
