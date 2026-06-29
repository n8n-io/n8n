import type { RuntimeSkillSource, Workspace } from '@n8n/agents';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { AgentRuntimeSkillWorkspaceService } from '../agent-runtime-skill-workspace.service';
import type { AgentKnowledgeSandboxService } from '../agent-knowledge-sandbox.service';

const mockMaterializeRuntimeSkillsIntoWorkspace = jest.fn();
const mockClearRuntimeSkillsFromWorkspace = jest.fn();

jest.mock('@n8n/instance-ai', () => ({
	materializeRuntimeSkillsIntoWorkspace: (...args: unknown[]) =>
		mockMaterializeRuntimeSkillsIntoWorkspace(...args),
	clearRuntimeSkillsFromWorkspace: (...args: unknown[]) =>
		mockClearRuntimeSkillsFromWorkspace(...args),
}));

const scope = {
	kind: 'draft' as const,
	projectId: 'project-1',
	agentId: 'agent-1',
	userId: 'user-1',
};

function makeSource(id = 'skill-1'): RuntimeSkillSource {
	return {
		registry: {
			schemaVersion: 1,
			skillsHash: `${id}-hash`,
			skills: [
				{
					id,
					name: id,
					description: 'Use for tests',
					hash: `${id}-hash`,
					linkedFiles: {
						references: [],
						templates: [],
						scripts: [],
						assets: [],
						examples: [],
						other: [],
					},
				},
			],
		},
		loadSkill: async () =>
			await Promise.resolve({
				id,
				name: id,
				description: 'Use for tests',
				instructions: 'Do the test work.',
			}),
	};
}

function makeService(overrides: Partial<AgentsConfig> = {}) {
	const agentsConfig = {
		sandboxEnabled: true,
		sandboxProvider: 'daytona',
		sandboxImage: 'daytonaio/sandbox:0.5.0',
		sandboxSnapshot: '',
		sandboxTimeout: 300_000,
		sandboxEphemeral: false,
		daytonaApiUrl: 'https://daytona.example',
		daytonaApiKey: 'test-key',
		...overrides,
	} as AgentsConfig;
	const agentKnowledgeSandboxService = mock<AgentKnowledgeSandboxService>();
	agentKnowledgeSandboxService.getWorkspace.mockResolvedValue({} as Workspace);

	return {
		agentKnowledgeSandboxService,
		service: new AgentRuntimeSkillWorkspaceService(agentsConfig, agentKnowledgeSandboxService, {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		}),
	};
}

describe('AgentRuntimeSkillWorkspaceService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockMaterializeRuntimeSkillsIntoWorkspace.mockImplementation(
			async ({ source }: { source: RuntimeSkillSource }) => await Promise.resolve({ source }),
		);
		mockClearRuntimeSkillsFromWorkspace.mockResolvedValue(undefined);
	});

	it('returns the original source without creating a sandbox when disabled', async () => {
		const { service, agentKnowledgeSandboxService } = makeService({ sandboxEnabled: false });
		const source = makeSource();

		const wrapped = service.wrapSkillSource(source, scope);
		await wrapped.prepare?.();

		expect(wrapped).toBe(source);
		expect(agentKnowledgeSandboxService.getWorkspace).not.toHaveBeenCalled();
	});

	it('reuses the shared agent sandbox workspace and materializes skills on prepare', async () => {
		const { service, agentKnowledgeSandboxService } = makeService();
		const source = makeSource();

		const wrapped = service.wrapSkillSource(source, scope);
		await wrapped.prepare?.();

		expect(agentKnowledgeSandboxService.getWorkspace).toHaveBeenCalledWith(
			scope.projectId,
			scope.agentId,
			scope.userId,
		);
		expect(mockMaterializeRuntimeSkillsIntoWorkspace).toHaveBeenCalledWith(
			expect.objectContaining({
				source,
				root: '/home/daytona/workspace/agent-skills',
				pruneStale: true,
			}),
		);
	});

	it('shares concurrent prepare calls', async () => {
		const { service, agentKnowledgeSandboxService } = makeService();
		const wrapped = service.wrapSkillSource(makeSource(), scope);

		await Promise.all([wrapped.prepare?.(), wrapped.prepare?.()]);

		expect(agentKnowledgeSandboxService.getWorkspace).toHaveBeenCalledTimes(1);
		expect(mockMaterializeRuntimeSkillsIntoWorkspace).toHaveBeenCalledTimes(1);
	});

	it('re-materializes the active agent skill workspace', async () => {
		const { service } = makeService();
		await service.wrapSkillSource(makeSource('draft-skill'), scope).prepare?.();
		const workspace = mockMaterializeRuntimeSkillsIntoWorkspace.mock.calls[0][0]
			.workspace as Workspace;
		await service
			.wrapSkillSource(makeSource('published-skill'), {
				...scope,
				kind: 'published',
				versionId: 'version-1',
			})
			.prepare?.();
		mockMaterializeRuntimeSkillsIntoWorkspace.mockClear();

		await service.syncActiveSkillWorkspaces({
			projectId: scope.projectId,
			agentId: scope.agentId,
			config: {
				name: 'Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help',
				skills: [{ type: 'skill', id: 'skill-1' }],
			},
			skills: {
				'skill-1': {
					name: 'Skill 1',
					description: 'Use for tests',
					instructions: 'Do the test work.',
				},
			},
		});

		expect(mockMaterializeRuntimeSkillsIntoWorkspace).toHaveBeenCalledTimes(1);
		expect(mockMaterializeRuntimeSkillsIntoWorkspace.mock.calls[0][0]).toMatchObject({
			workspace,
			root: '/home/daytona/workspace/agent-skills',
			pruneStale: true,
		});
	});

	it('clears active draft workspaces when configured skills are empty', async () => {
		const { service } = makeService();
		await service.wrapSkillSource(makeSource(), scope).prepare?.();

		await service.syncActiveSkillWorkspaces({
			projectId: scope.projectId,
			agentId: scope.agentId,
			config: {
				name: 'Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help',
				skills: [],
			},
			skills: {},
		});

		expect(mockClearRuntimeSkillsFromWorkspace).toHaveBeenCalledWith(
			expect.objectContaining({
				root: '/home/daytona/workspace/agent-skills',
			}),
		);
	});
});
