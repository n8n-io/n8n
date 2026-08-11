import type { WorkspaceFilesystem, WorkspaceSandbox } from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
import { AgentWorkspaceService } from '../agent-workspace.service';

const projectId = 'project-1';
const agentId = 'agent-1';

function makeService(sandboxEnabled = true) {
	const filesystem = mock<WorkspaceFilesystem>();
	const sandbox = mock<WorkspaceSandbox>({
		id: 'sandbox-id',
		name: 'sandbox',
		provider: 'daytona',
		status: 'running',
	});
	const runtimeService = mock<AgentSandboxRuntimeService>();
	runtimeService.acquireSandbox.mockResolvedValue({
		provider: 'daytona',
		sandbox,
		filesystem,
		workspaceRoot: '/home/daytona/workspace',
		cacheKey: 'daytona:agent:sandbox-id',
	});

	return {
		service: new AgentWorkspaceService(
			{ sandboxEnabled } as AgentsConfig,
			mock<Logger>(),
			runtimeService,
		),
		filesystem,
		sandbox,
		runtimeService,
	};
}

describe('AgentWorkspaceService', () => {
	it('eagerly creates a scoped workspace with only the core workspace tools', async () => {
		const { service, filesystem } = makeService();

		const workspace = await service.getAgentWorkspace(projectId, agentId);

		expect(filesystem.mkdir).toHaveBeenCalledWith('/home/daytona/workspace', {
			recursive: true,
		});
		expect(workspace.filesystem?.basePath).toBe('/home/daytona/workspace');
		expect(workspace.getTools().map(({ name }) => name)).toEqual([
			'workspace_read_file',
			'workspace_read_tool_result',
			'workspace_str_replace_file',
			'workspace_batch_str_replace_file',
			'workspace_write_file',
			'workspace_execute_command',
		]);
	});

	it('removes only the hashed thread result directory without destroying the sandbox', async () => {
		const { service, filesystem, sandbox } = makeService();

		await service.cleanupThreadWorkspace(projectId, agentId, '../../knowledge-mirror');

		expect(filesystem.rmdir).toHaveBeenCalledWith(
			expect.stringMatching(/^\/home\/daytona\/workspace\/tool-results\/threads\/[A-Za-z0-9_-]+$/),
			{ recursive: true, force: true },
		);
		expect(sandbox.destroy).not.toHaveBeenCalled();
	});

	it('does not reject when workspace cleanup fails', async () => {
		const { service, runtimeService } = makeService();
		runtimeService.acquireSandbox.mockRejectedValue(new Error('sandbox unavailable'));

		await expect(
			service.cleanupThreadWorkspace(projectId, agentId, 'thread-1'),
		).resolves.toBeUndefined();
	});
});
