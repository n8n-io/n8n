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
	const runtime = {
		provider: 'daytona' as const,
		sandbox,
		filesystem,
		workspaceRoot: '/home/daytona/workspace',
		cacheKey: 'daytona:agent:sandbox-id',
	};
	runtimeService.acquireWorkspaceSandbox.mockResolvedValue(runtime);

	return {
		service: new AgentWorkspaceService(
			mock<Logger>(),
			runtimeService,
			checkpointStorage,
			agentsConfig,
		),
		filesystem,
		sandbox,
		runtime,
		runtimeService,
		checkpointStorage,
	};
}

function getFilesystemInitHook(
	runtimeService: ReturnType<typeof makeService>['runtimeService'],
	callIndex = 0,
) {
	const options = runtimeService.acquireWorkspaceSandbox.mock.calls[callIndex][3];
	const hook = options?.onFilesystemInit;
	if (!hook) throw new Error('Expected an onFilesystemInit hook to be passed');
	return hook;
}

describe('AgentWorkspaceService', () => {
	it('creates a scoped workspace with only the core workspace tools without touching the filesystem', async () => {
		const { service, filesystem, runtime, runtimeService, checkpointStorage } = makeService();

		const { workspace, handle } = await service.getAgentWorkspace(
			projectId,
			agentId,
			principalHash,
		);

		expect(runtimeService.acquireWorkspaceSandbox).toHaveBeenCalledWith(
			projectId,
			agentId,
			principalHash,
			{ onFilesystemInit: expect.any(Function) },
		);
		expect(runtimeService.acquireKnowledgeSandbox).not.toHaveBeenCalled();
		expect(filesystem.mkdir).not.toHaveBeenCalled();
		expect(checkpointStorage.getActiveRunIdsForSandbox).not.toHaveBeenCalled();
		expect(handle).toBe(runtime);
		expect(workspace.filesystem?.basePath).toBe('/home/daytona/workspace');
		expect(workspace.getTools().map(({ name }) => name)).toEqual([
			'workspace_read_file',
			'workspace_read_tool_result',
			'workspace_str_replace_file',
			'workspace_write_file',
			'workspace_execute_command',
		]);
	});

	it('scopes a delegated workspace to a per-delegation subdirectory without acquiring a sandbox', async () => {
		const { service, filesystem, runtime, runtimeService } = makeService();

		const workspace = service.getDelegatedAgentWorkspace(runtime, 'thread-9');

		expect(runtimeService.acquireWorkspaceSandbox).not.toHaveBeenCalled();
		expect(workspace.filesystem?.basePath).toBe('/home/daytona/workspace/subagents/thread-9');
		expect(workspace.getTools().map(({ name }) => name)).toEqual([
			'workspace_read_file',
			'workspace_read_tool_result',
			'workspace_str_replace_file',
			'workspace_write_file',
			'workspace_execute_command',
		]);

		await workspace.filesystem?.writeFile('notes.md', 'hello');

		expect(filesystem.mkdir).toHaveBeenCalledWith('/home/daytona/workspace/subagents/thread-9', {
			recursive: true,
		});
		expect(filesystem.writeFile).toHaveBeenCalledWith(
			'/home/daytona/workspace/subagents/thread-9/notes.md',
			'hello',
			undefined,
		);
	});

	it('kicks reconciliation on filesystem init and creates the root on first workspace I/O', async () => {
		const { service, filesystem, runtimeService, checkpointStorage } = makeService();

		const { workspace } = await service.getAgentWorkspace(projectId, agentId, principalHash);
		await getFilesystemInitHook(runtimeService)({ filesystem });

		expect(filesystem.mkdir).not.toHaveBeenCalled();
		expect(checkpointStorage.getActiveRunIdsForSandbox).toHaveBeenCalledWith(
			agentId,
			principalHash,
		);

		await workspace.filesystem?.writeFile('notes.md', 'hi');

		expect(filesystem.mkdir).toHaveBeenCalledWith('/home/daytona/workspace', {
			recursive: true,
		});
		expect(filesystem.writeFile).toHaveBeenCalledWith(
			'/home/daytona/workspace/notes.md',
			'hi',
			undefined,
		);
	});

	it('does not block filesystem init on reconciliation and deduplicates concurrent sweeps', async () => {
		const { service, filesystem, runtimeService, checkpointStorage } = makeService();
		let resolveReconciliation!: (activeRunIds: Set<string>) => void;
		checkpointStorage.getActiveRunIdsForSandbox.mockReturnValue(
			new Promise((resolve) => {
				resolveReconciliation = resolve;
			}),
		);

		const first = await service.getAgentWorkspace(projectId, agentId, principalHash);
		const second = await service.getAgentWorkspace(projectId, agentId, principalHash);
		await getFilesystemInitHook(runtimeService, 0)({ filesystem });
		await getFilesystemInitHook(runtimeService, 1)({ filesystem });

		expect(first.workspace.filesystem?.basePath).toBe('/home/daytona/workspace');
		expect(second.workspace.filesystem?.basePath).toBe('/home/daytona/workspace');
		expect(checkpointStorage.getActiveRunIdsForSandbox).toHaveBeenCalledOnce();

		resolveReconciliation(new Set());
		await Promise.resolve();
	});

	it('skips orphan reconciliation when checkpoint protection overflows', async () => {
		const { service, filesystem, runtimeService, checkpointStorage } = makeService();
		checkpointStorage.getActiveRunIdsForSandbox.mockResolvedValue(
			CHECKPOINT_RECONCILIATION_OVERFLOW,
		);

		await service.getAgentWorkspace(projectId, agentId, principalHash);
		await getFilesystemInitHook(runtimeService)({ filesystem });
		await new Promise(setImmediate);

		expect(filesystem.readdir).not.toHaveBeenCalled();
	});
});
