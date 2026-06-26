import type { Sandbox } from '@daytona/sdk';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import type { AgentKnowledgeSandboxService } from '../agent-knowledge-sandbox.service';
import { AgentSandboxWorkspaceService } from '../agent-sandbox-workspace.service';

function makeSandbox() {
	return {
		id: 'sandbox-1',
		name: 'agent-sandbox',
		process: {
			executeCommand: jest.fn<
				Promise<{
					exitCode: number;
					result?: string;
					artifacts?: { stdout?: string; stderr?: string };
				}>,
				[string, string | undefined, NodeJS.ProcessEnv | undefined, number]
			>(async (command) => {
				if (command === 'node --version') {
					return { exitCode: 0, artifacts: { stdout: 'v22.0.0\n' } };
				}
				if (command === 'npx tsx --version') {
					return { exitCode: 0, artifacts: { stdout: 'tsx 4.0.0\n' } };
				}
				if (command === 'python3 --version') {
					return { exitCode: 127, artifacts: { stderr: 'python3: not found\n' } };
				}
				return { exitCode: 0, artifacts: { stdout: 'ok\n' } };
			}),
		},
	} as unknown as Sandbox;
}

function makeService(sandbox = makeSandbox()) {
	const knowledgeSandboxService = mock<AgentKnowledgeSandboxService>();
	knowledgeSandboxService.acquireSandboxForAgent.mockResolvedValue(sandbox);
	const logger = mock<Logger>();
	const service = new AgentSandboxWorkspaceService(
		knowledgeSandboxService,
		{ sandboxTimeout: 300_000 } as AgentsConfig,
		logger,
	);

	return { service, knowledgeSandboxService, sandbox, logger };
}

describe('AgentSandboxWorkspaceService', () => {
	it('wraps a regular agent Daytona sandbox as an SDK workspace command interface', async () => {
		const { service, knowledgeSandboxService, sandbox } = makeService();

		const { workspace } = await service.createWorkspace('project-1', 'agent-1', 'user-1');
		const result = await workspace.sandbox?.executeCommand?.('python3', [
			'/home/daytona/workspace/skills/aiq/scripts/aiq.py',
			'health',
		]);

		expect(knowledgeSandboxService.acquireSandboxForAgent).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			'user-1',
			'user-1',
		);
		expect(sandbox.process.executeCommand).toHaveBeenLastCalledWith(
			'python3 /home/daytona/workspace/skills/aiq/scripts/aiq.py health',
			undefined,
			undefined,
			300,
		);
		expect(result).toMatchObject({
			success: true,
			exitCode: 0,
			stdout: 'ok\n',
			stderr: '',
		});
	});

	it('probes node, tsx, and python without throwing when python is missing', async () => {
		const { service, logger } = makeService();

		const { capabilities } = await service.createWorkspace('project-1', 'agent-1', 'user-1');

		expect(capabilities).toEqual({
			node: { available: true, version: 'v22.0.0' },
			tsx: { available: true, version: 'tsx 4.0.0' },
			python3: { available: false, error: 'python3: not found' },
		});
		expect(logger.debug).toHaveBeenCalledWith('Agent sandbox runtime capabilities', {
			projectId: 'project-1',
			agentId: 'agent-1',
			capabilities,
		});
	});
});
