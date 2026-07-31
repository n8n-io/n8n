import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { AgentSetupCompletionService } from '../agent-setup-completion.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { Agent } from '../entities/agent.entity';

const agentId = 'agent-1';
const projectId = 'project-1';
const user = { id: 'user-1' } as User;
const credentialProvider = mock<CredentialProvider>();

const baseConfig: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
	credential: 'cred-1',
};

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		projectId,
		versionId: 'draft-version',
		activeVersionId: null,
		schema: baseConfig,
		integrations: [],
		setupCompletedAt: null,
		...overrides,
	} as unknown as Agent;
}

function makeService() {
	const agentValidationService = mock<AgentValidationService>();
	const telemetry = mock<Telemetry>();

	agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
		status: 'valid',
		issues: [],
	});

	return {
		service: new AgentSetupCompletionService(agentValidationService, telemetry),
		agentValidationService,
		telemetry,
	};
}

describe('AgentSetupCompletionService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('recordIfSetupComplete', () => {
		it('stamps and reports the configured capabilities once the agent is publishable', async () => {
			const { service, telemetry } = makeService();
			const agent = makeAgent({
				schema: {
					...baseConfig,
					tools: [{ type: 'custom', id: 'tool-1' }],
					skills: [{ type: 'skill', id: 'skill-1' }],
				} as unknown as AgentJsonConfig,
				integrations: [{ type: 'slack', credentialId: 'slack-cred' }],
			});

			const emit = await service.recordIfSetupComplete(agent, projectId, credentialProvider, user);
			expect(agent.setupCompletedAt).toBeInstanceOf(Date);
			expect(telemetry.track).not.toHaveBeenCalled();

			emit?.();

			expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.AGENT_SETUP_COMPLETED, {
				agent_id: agentId,
				project_id: projectId,
				user_id: user.id,
				capability_kinds: ['channel', 'skill', 'tool'],
				capability_count: 3,
				tool_count: 1,
				skill_count: 1,
				sub_agent_count: 0,
				mcp_server_count: 0,
				vector_store_count: 0,
				task_count: 0,
				trigger_count: 1,
				status: 'draft',
			});
		});

		it('stays silent for an agent that is publishable but does nothing yet', async () => {
			const { service, agentValidationService } = makeService();
			const agent = makeAgent();

			expect(
				await service.recordIfSetupComplete(agent, projectId, credentialProvider, user),
			).toBeNull();
			expect(agent.setupCompletedAt).toBeNull();
			// Validation is the expensive half, so an empty agent must not pay for it.
			expect(agentValidationService.validateLoadedAgentConfiguration).not.toHaveBeenCalled();
		});

		it('stays silent while a configured capability is still broken', async () => {
			const { service, agentValidationService } = makeService();
			agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
				status: 'invalid',
				issues: [
					{
						code: 'missing_credential',
						path: 'tools.0',
						capability: { kind: 'tool', index: 0 },
					},
				],
			});
			const agent = makeAgent({
				schema: {
					...baseConfig,
					tools: [{ type: 'custom', id: 'tool-1' }],
				} as unknown as AgentJsonConfig,
			});

			expect(
				await service.recordIfSetupComplete(agent, projectId, credentialProvider, user),
			).toBeNull();
			expect(agent.setupCompletedAt).toBeNull();
		});

		it('reports only the first completion for an agent', async () => {
			const { service, agentValidationService } = makeService();
			const completedAt = new Date('2026-01-01T00:00:00.000Z');
			const agent = makeAgent({
				schema: {
					...baseConfig,
					tools: [{ type: 'custom', id: 'tool-1' }],
				} as unknown as AgentJsonConfig,
				setupCompletedAt: completedAt,
			});

			expect(
				await service.recordIfSetupComplete(agent, projectId, credentialProvider, user),
			).toBeNull();
			expect(agent.setupCompletedAt).toBe(completedAt);
			expect(agentValidationService.validateLoadedAgentConfiguration).not.toHaveBeenCalled();
		});

		it('ignores capabilities that are still placeholders', async () => {
			const { service } = makeService();
			const agent = makeAgent({
				schema: {
					...baseConfig,
					mcpServers: [{ name: 'linear', url: '', transport: 'streamableHttp' }],
				} as unknown as AgentJsonConfig,
				integrations: [{ type: 'slack', credentialId: '' }],
			});

			expect(
				await service.recordIfSetupComplete(agent, projectId, credentialProvider, user),
			).toBeNull();
			expect(agent.setupCompletedAt).toBeNull();
		});
	});

	describe('recordPublishedSetupComplete', () => {
		it('counts the snapshot being published and reports it as production', () => {
			const { service, telemetry } = makeService();
			const agent = makeAgent({
				schema: { ...baseConfig, tools: [] } as unknown as AgentJsonConfig,
				integrations: [{ type: 'slack', credentialId: 'slack-cred' }],
			});
			const publishedSnapshot = {
				...baseConfig,
				tools: [{ type: 'custom', id: 'tool-1' }],
			} as unknown as AgentJsonConfig;

			const emit = service.recordPublishedSetupComplete(agent, projectId, user, publishedSnapshot);
			// The publish transaction sets these before the caller emits.
			agent.activeVersionId = 'version-1';
			agent.versionId = 'version-1';
			emit?.();

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_SETUP_COMPLETED,
				expect.objectContaining({ tool_count: 1, trigger_count: 1, status: 'production' }),
			);
		});
	});
});
