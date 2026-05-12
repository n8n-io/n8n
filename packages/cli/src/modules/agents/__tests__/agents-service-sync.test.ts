/* eslint-disable @typescript-eslint/require-await -- mock implementations kept async for future-proofing */
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import type {
	ExecutionRepository,
	ProjectRelationRepository,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { EphemeralNodeExecutor } from '@/node-execution';
import type { UrlService } from '@/services/url.service';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentSkillsService } from '../agent-skills.service';
import { AgentsService } from '../agents.service';
import type { Agent } from '../entities/agent.entity';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentJsonConfig } from '../json-config/agent-json-config';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: 'agent-1',
		name: 'Old Name',
		description: 'Old description',
		projectId: 'project-1',
		credentialId: null,
		provider: null,
		model: null,
		schema: {
			name: 'Old Name',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'cred-1',
			instructions: 'Be helpful',
		} as AgentJsonConfig,
		integrations: [],
		tools: {},
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		...overrides,
	} as Agent;
}

describe('AgentsService — updateName / updateDescription schema sync', () => {
	let service: AgentsService;
	let agentRepository: ReturnType<typeof mock<AgentRepository>>;

	beforeEach(() => {
		agentRepository = mock<AgentRepository>();
		agentRepository.save.mockImplementation(async (entity) => entity as Agent);

		service = new AgentsService(
			mock<Logger>(),
			agentRepository,
			mock<ProjectRelationRepository>(),
			mock<WorkflowRunner>(),
			mock<ActiveExecutions>(),
			mock<ExecutionRepository>(),
			mock<WorkflowRepository>(),
			mock<UserRepository>(),
			mock<WorkflowFinderService>(),
			mock<UrlService>(),
			mock<N8NCheckpointStorage>(),
			mock<AgentSecureRuntime>(),
			mock<EphemeralNodeExecutor>(),
			mock(), // AgentsToolsService
			mock<N8nMemory>(),
			mock<AgentExecutionService>(),
			mock(),
			mock<AgentSkillsService>(),
			mock(),
			{ modules: [] } as unknown as AgentsConfig,
			mock(),
		);
	});

	describe('updateName', () => {
		it('updates entity name and schema name together', async () => {
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.updateName('agent-1', 'project-1', 'New Name');

			expect(result).not.toBeNull();
			expect(result!.name).toBe('New Name');
			expect(result!.schema!.name).toBe('New Name');
		});

		it('preserves other schema fields when updating name', async () => {
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.updateName('agent-1', 'project-1', 'New Name');

			expect(result!.schema!.model).toBe('anthropic/claude-sonnet-4-5');
			expect(result!.schema!.credential).toBe('cred-1');
			expect(result!.schema!.instructions).toBe('Be helpful');
		});

		it('handles agent with null schema', async () => {
			const agent = makeAgent({ schema: null } as unknown as Partial<Agent>);
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.updateName('agent-1', 'project-1', 'New Name');

			expect(result).not.toBeNull();
			expect(result!.name).toBe('New Name');
			expect(result!.schema).toBeNull();
		});

		it('returns null for non-existent agent', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			const result = await service.updateName('missing', 'project-1', 'Name');

			expect(result).toBeNull();
		});
	});

	describe('updateDescription', () => {
		it('updates entity description and schema description together', async () => {
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.updateDescription('agent-1', 'project-1', 'New desc');

			expect(result).not.toBeNull();
			expect(result!.description).toBe('New desc');
			expect(result!.schema!.description).toBe('New desc');
		});

		it('preserves other schema fields when updating description', async () => {
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.updateDescription('agent-1', 'project-1', 'New desc');

			expect(result!.schema!.name).toBe('Old Name');
			expect(result!.schema!.model).toBe('anthropic/claude-sonnet-4-5');
		});

		it('handles agent with null schema', async () => {
			const agent = makeAgent({ schema: null } as unknown as Partial<Agent>);
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.updateDescription('agent-1', 'project-1', 'New desc');

			expect(result).not.toBeNull();
			expect(result!.description).toBe('New desc');
			expect(result!.schema).toBeNull();
		});
	});
});
