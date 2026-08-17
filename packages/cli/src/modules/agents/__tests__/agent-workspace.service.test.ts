import type { WorkspaceFilesystem, WorkspaceSandbox } from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { hashAgentSandboxPrincipal } from '../agent-sandbox-principal';
import type { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
import { AgentWorkspaceService } from '../agent-workspace.service';
import {
	CHECKPOINT_RECONCILIATION_OVERFLOW,
	type N8NCheckpointStorage,
} from '../integrations/n8n-checkpoint-storage';

const projectId = 'project-1';
const agentId = 'agent-1';
const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-1' });

function makeService() {
	const filesystem = mock<WorkspaceFilesystem>();
	const sandbox = mock<WorkspaceSandbox>({
		id: 'sandbox-id',
		name: 'sandbox',
		provider: 'daytona',
		status: 'running',
	});
	const runtimeService = mock<AgentSandboxRuntimeService>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const agentsConfig = mock<AgentsConfig>({ checkpointTtlSeconds: 60 });
	filesystem.readdir.mockResolvedValue([]);
	checkpointStorage.getActiveRunIdsForSandbox.mockResolvedValue(new Set());
	runtimeService.acquireWorkspaceSandbox.mockResolvedValue({
		provider: 'daytona',
		sandbox,
		filesystem,
		workspaceRoot: '/home/daytona/workspace',
		cacheKey: 'daytona:agent:sandbox-id',
	});

	return {
		service: new AgentWorkspaceService(
			mock<Logger>(),
			runtimeService,
			checkpointStorage,
			agentsConfig,
		),
		filesystem,
		sandbox,
		runtimeService,
		checkpointStorage,
	};
}

describe('AgentWorkspaceService', () => {
	it('eagerly creates a scoped workspace with only the core workspace tools', async () => {
		const { service, filesystem, runtimeService } = makeService();

		const workspace = await service.getAgentWorkspace(projectId, agentId, principalHash);

		expect(runtimeService.acquireWorkspaceSandbox).toHaveBeenCalledWith(
			projectId,
			agentId,
			principalHash,
		);
		expect(runtimeService.acquireKnowledgeSandbox).not.toHaveBeenCalled();
		expect(filesystem.mkdir).toHaveBeenCalledWith('/home/daytona/workspace', {
			recursive: true,
		});
		expect(workspace.filesystem?.basePath).toBe('/home/daytona/workspace');
		expect(workspace.getTools().map(({ name }) => name)).toEqual([
			'workspace_read_file',
			'workspace_read_tool_result',
			'workspace_str_replace_file',
			'workspace_write_file',
			'workspace_execute_command',
		]);
	});

	it('returns the workspace without waiting for reconciliation and deduplicates concurrent sweeps', async () => {
		const { service, checkpointStorage } = makeService();
		let resolveReconciliation!: (activeRunIds: Set<string>) => void;
		checkpointStorage.getActiveRunIdsForSandbox.mockReturnValue(
			new Promise((resolve) => {
				resolveReconciliation = resolve;
			}),
		);

		const firstWorkspace = await service.getAgentWorkspace(projectId, agentId, principalHash);
		const secondWorkspace = await service.getAgentWorkspace(projectId, agentId, principalHash);

		expect(firstWorkspace.filesystem?.basePath).toBe('/home/daytona/workspace');
		expect(secondWorkspace.filesystem?.basePath).toBe('/home/daytona/workspace');
		expect(checkpointStorage.getActiveRunIdsForSandbox).toHaveBeenCalledOnce();

		resolveReconciliation(new Set());
		await Promise.resolve();
	});

	it('skips orphan reconciliation when checkpoint protection overflows', async () => {
		const { service, filesystem, checkpointStorage } = makeService();
		checkpointStorage.getActiveRunIdsForSandbox.mockResolvedValue(
			CHECKPOINT_RECONCILIATION_OVERFLOW,
		);

		await service.getAgentWorkspace(projectId, agentId, principalHash);

		expect(filesystem.readdir).not.toHaveBeenCalled();
	});
});
