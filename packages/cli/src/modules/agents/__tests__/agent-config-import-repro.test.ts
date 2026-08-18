import { mockLogger } from '@n8n/backend-test-utils';
import type { TransactionRunner, User, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { EventService } from '@/events/event.service';

import type { Telemetry } from '@/telemetry';

import { AgentConfigService } from '../agent-config.service';
import { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentSetupCompletionService } from '../agent-setup-completion.service';
import { AgentSkillsService } from '../agent-skills.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { Agent } from '../entities/agent.entity';
import type { NodeToolAiGatewayService } from '../json-config/node-tool-ai-gateway.service';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

// Reproduction: real exported agent JSON ("English Chatbot") whose skill
// vanished after import.
const exportedJson = {
	name: 'English Chatbot',
	model: 'anthropic/claude-sonnet-5',
	instructions: 'You are the Posh English Chatbot.',
	tools: [],
	skills: [
		{
			type: 'skill',
			id: 'skill_sAPb9pNjfMq1Xt6p',
			name: 'Test',
			description: 'Simple skill for testing purposes',
			instructions: 'Mock content',
		},
	],
	personalisation: {
		icon: 'bot',
		gradient: { from: '#F22B51', to: '#376BD2', angle: 146, fromStop: 0, toStop: 77 },
	},
	memory: { enabled: true, storage: 'n8n', observationalMemory: { enabled: true } },
	credential: 'PGUeriI2DQSuSuOo',
	providerTools: { 'anthropic.web_search': { maxUses: 5 } },
	config: { promptCaching: { enabled: true }, webSearch: { enabled: true } },
	mcpServers: [
		{
			name: 'notion-mcp',
			url: 'https://mcp.notion.com/mcp',
			transport: 'streamableHttp',
			authentication: 'notionMcpOAuth2Api',
			credential: 'WSJGoGnip2TCFpAL',
			metadata: { nodeTypeName: '@n8n/mcp-registry.notion' },
			connectionTimeoutMs: 60000,
		},
	],
	tasks: [
		{
			type: 'task',
			id: 'task_zK4w9IbQSclYjQVm',
			enabled: true,
			name: 'daily',
			objective: 'test task content',
			cronExpression: '0 9 * * *',
		},
	],
	integrations: [],
};

const user = { id: 'user-1' } as User;

function makeHarness() {
	const agentRepository = mock<AgentRepository>();
	const agentTaskRepository = mock<AgentTaskRepository>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const credentialsService = mock<CredentialsService>();
	const workflowRepository = mock<WorkflowRepository>();
	const nodeToolAiGatewayService = mock<NodeToolAiGatewayService>();
	const eventService = mock<EventService>();
	const agentValidationService = mock<AgentValidationService>();
	const telemetry = mock<Telemetry>();
	const secureRuntime = mock<AgentSecureRuntime>();
	// Real skills service so name normalization and orphan removal behave as
	// in production.
	const agentSkillsService = new AgentSkillsService(
		mockLogger(),
		agentRepository,
		new AgentModificationTelemetryService(telemetry),
	);

	agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
		status: 'valid',
		issues: [],
	});
	agentRepository.saveDraftFenced.mockResolvedValue(true);
	agentRepository.claimSetupCompleted.mockResolvedValue(true);
	const txRunner = mock<TransactionRunner>();
	txRunner.run.mockImplementation(async (_ctx, fn) => await fn({}));
	// Same-instance import: both credentials from the export exist and are
	// accessible.
	const credentials = ['PGUeriI2DQSuSuOo', 'WSJGoGnip2TCFpAL'].map(
		(id) => ({ id, type: 'anthropicApi', name: id }) as never,
	);
	credentialsService.findAllCredentialIdsForProject.mockResolvedValue(credentials);
	credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
	credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(credentials);
	// Stateful task table stand-in: claimed rows are visible to subsequent
	// findByAgentId calls, as with a real DB.
	const taskRows: Array<{ id: string; agentId: string }> = [];
	agentTaskRepository.findByAgentId.mockImplementation(
		async (id) => taskRows.filter((row) => row.agentId === id) as never,
	);
	agentTaskRepository.claimTaskDefinition.mockImplementation(async (task) => {
		taskRows.push({ id: task.id, agentId: task.agentId });
		return true;
	});
	agentTaskRepository.create.mockImplementation((data) => data as never);
	workflowRepository.findManyByAgentToolReferences.mockResolvedValue([]);

	const service = new AgentConfigService(
		mockLogger(),
		agentRepository,
		agentTaskRepository,
		agentSkillsService,
		runtimeCacheService,
		credentialsService,
		workflowRepository,
		nodeToolAiGatewayService,
		eventService,
		new AgentSetupCompletionService(agentValidationService, telemetry, agentRepository),
		new AgentModificationTelemetryService(telemetry),
		secureRuntime,
		txRunner,
	);

	return { service, agentRepository, agentTaskRepository, txRunner };
}

function makeFreshAgent(): Agent {
	return {
		id: 'agent-imported',
		name: 'My agent',
		projectId: 'project-1',
		versionId: 'draft-version',
		activeVersionId: null,
		schema: { name: 'My agent', model: '', instructions: '' },
		tools: {},
		skills: {},
		integrations: [],
		setupCompletedAt: null,
		updatedAt: new Date('2025-01-01T00:00:00Z'),
	} as unknown as Agent;
}

describe('agent JSON import reproduction (English Chatbot)', () => {
	it('keeps the skill and task when the exported JSON is imported into a fresh agent', async () => {
		const { service, agentRepository } = makeHarness();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeFreshAgent());

		const result = await service.updateConfig('agent-imported', 'project-1', exportedJson, user, {
			modifiedBy: 'user',
		});

		const saved = agentRepository.saveDraftFenced.mock.calls.at(-1)?.[0] as Agent;
		expect(saved.schema?.skills).toEqual([{ type: 'skill', id: 'skill_sAPb9pNjfMq1Xt6p' }]);
		expect(saved.skills).toEqual({
			skill_sAPb9pNjfMq1Xt6p: {
				name: 'Test',
				description: 'Simple skill for testing purposes',
				instructions: 'Mock content',
			},
		});
		expect(saved.schema?.tasks).toEqual([
			{ type: 'task', id: 'task_zK4w9IbQSclYjQVm', enabled: true },
		]);
		// The response carries the persisted (bare-ref) config; the frontend
		// re-inlines bodies at export time.
		expect(result.config.skills).toEqual([{ type: 'skill', id: 'skill_sAPb9pNjfMq1Xt6p' }]);
	});

	it('persists everything from the imported JSON, with refs bared in the schema', async () => {
		const { service, agentRepository } = makeHarness();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeFreshAgent());

		const result = await service.updateConfig('agent-imported', 'project-1', exportedJson, user, {
			modifiedBy: 'user',
		});

		// Round-trip fidelity: the persisted config equals the imported document
		// with definition bodies moved to their own stores (the export flow
		// re-inlines them from there).
		expect(result.config).toEqual({
			...exportedJson,
			skills: [{ type: 'skill', id: 'skill_sAPb9pNjfMq1Xt6p' }],
			tasks: [{ type: 'task', id: 'task_zK4w9IbQSclYjQVm', enabled: true }],
		});
	});

	it('imports the task under a fresh id when the source agent on the same instance still owns it', async () => {
		const { service, agentRepository, agentTaskRepository } = makeHarness();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeFreshAgent());
		// The source agent on the same instance still owns the exported task
		// id, so the first claim fails and the import mints a fresh id.
		agentTaskRepository.claimTaskDefinition.mockResolvedValueOnce(false).mockResolvedValue(true);

		const result = await service.updateConfig('agent-imported', 'project-1', exportedJson, user, {
			modifiedBy: 'user',
		});

		const task = result.config.tasks?.[0] as Record<string, unknown>;
		expect(task.id).toMatch(/^task_/);
		expect(task.id).not.toBe('task_zK4w9IbQSclYjQVm');
		expect(task.enabled).toBe(true);

		// The row was claimed under the fresh id with the imported body.
		const claimedRow = agentTaskRepository.claimTaskDefinition.mock.calls.at(-1)?.[0];
		expect(claimedRow).toMatchObject({
			id: task.id,
			agentId: 'agent-imported',
			name: 'daily',
			objective: 'test task content',
			cronExpression: '0 9 * * *',
		});
	});
});
