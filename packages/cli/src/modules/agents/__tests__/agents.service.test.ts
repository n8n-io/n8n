/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- async mock stubs, unbound-method references and short `cb` names are acceptable test idioms */

import { DEFAULT_AGENT_PERSONALISATION, N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { Telemetry } from '@/telemetry';
import { AgentConfigPreparationService } from '../agent-config-preparation.service';
import { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import { AgentSaveCompletionService } from '../agent-save-completion.service';
import type { AgentSetupCompletionService } from '../agent-setup-completion.service';
import type { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { NodeToolAiGatewayService } from '../json-config/node-tool-ai-gateway.service';
import type { EventService, ProjectScopeService } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import type {
	ProjectRelationRepository,
	TransactionRunner,
	User,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { QueryFailedError } from '@n8n/typeorm';
import { mock, type MockProxy } from 'vitest-mock-extended';
import type { AgentsSettingsService } from '../agents-settings.service';

import { ConflictError, NotFoundError } from '@n8n/errors';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentTaskService } from '../agent-task.service';
import type { AgentTestChatService } from '../agent-test-chat.service';
import { AgentsService } from '../agents.service';
import type { AgentTask } from '../entities/agent-task.entity';
import type { Agent, ProjectAgent } from '../entities/agent.entity';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { SubAgentCleanupService } from '../sub-agents/sub-agent-cleanup.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { AgentPolicyService } from '../agent-policy.service';
import { createAgentSkillRefsService } from './test-utils/stored-agent-config';

const agentId = vi.hoisted(() => 'agent-1');

vi.mock('@n8n/utils/generate-nano-id', () => ({
	generateNanoId: () => agentId,
}));
const user = mock<User>({ id: 'user-1' });
const actor = { kind: 'user', user } as const;
const projectId = 'project-1';

/** Mirror `Repository.create`: the returned entity holds the fields that `create` got. */
function mockCreateReturning(agentRepository: MockProxy<AgentRepository>, entity: Agent) {
	agentRepository.create.mockImplementation(((fields: Partial<Agent>) =>
		Object.assign(entity, fields)) as never);
}

function makeAgent(overrides: Partial<ProjectAgent> = {}): ProjectAgent {
	return {
		id: agentId,
		name: 'Agent',
		projectId,
		versionId: 'version-1',
		schema: null,
		activeVersionId: null,
		activeVersion: null,
		integrations: [],
		tools: {},
		skills: {},
		updatedAt: new Date('2025-01-01T00:00:00Z'),
		...overrides,
	} as unknown as ProjectAgent;
}

function makeService() {
	const skillRefs = createAgentSkillRefsService();
	const agentRepository = mock<AgentRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const agentKnowledgeService = mock<AgentKnowledgeService>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const testChatService = mock<AgentTestChatService>();
	const agentTaskService = mock<AgentTaskService>();
	const agentTaskRepository = mock<AgentTaskRepository>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const subAgentCleanupService = mock<SubAgentCleanupService>();
	const eventService = mock<EventService>();
	const agentExecutionService = mock<AgentExecutionService>();
	const credentialsService = mock<CredentialsService>();
	const projectScopeService = mock<ProjectScopeService>();
	projectScopeService.getMemberProjectIds.mockResolvedValue([]);
	const agentsSettingsService = mock<AgentsSettingsService>();
	const agentPolicyService = mock<AgentPolicyService>();
	const workflowRepository = mock<WorkflowRepository>();
	workflowRepository.findManyByAgentToolReferences.mockResolvedValue([]);
	agentTaskRepository.findByAgentId.mockResolvedValue([]);
	const telemetry = mock<Telemetry>();
	const broadcaster = mock<AgentUpdateBroadcaster>();
	const saveCompletion = new AgentSaveCompletionService(
		eventService,
		broadcaster,
		new AgentModificationTelemetryService(
			telemetry,
			// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
			eventService,
			// EOF Experiment cleanup
		),
	);
	const setupCompletion = mock<AgentSetupCompletionService>();
	setupCompletion.recordIfSetupComplete.mockResolvedValue(null);
	const configPreparation = new AgentConfigPreparationService(
		credentialsService,
		workflowRepository,
		mock<NodeToolAiGatewayService>(),
		agentRepository,
		agentTaskRepository,
		skillRefs,
		agentPolicyService,
	);

	agentsSettingsService.getEnabled.mockResolvedValue(true);
	agentRepository.findByIdsAndProjectId.mockResolvedValue([]);
	agentTaskService.requestReconcile.mockResolvedValue();
	chatIntegrationService.disconnectChannel.mockResolvedValue();
	testChatService.clearAllTestChatMessages.mockResolvedValue();
	subAgentCleanupService.removeSubAgentFromParents.mockResolvedValue();
	// `createAgentCredentialProvider` builds the provider with `new`, so the
	// service awaits the real provider's `list()`, which in turn calls this.
	// Default to "no accessible credentials" so sanitization blanks everything.
	credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
	Container.set(AgentTaskService, agentTaskService);
	Container.set(ChatIntegrationService, chatIntegrationService);

	const transactionRunner = mock<TransactionRunner>();
	transactionRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));

	const service = new AgentsService(
		mockLogger(),
		agentRepository,
		projectRelationRepository,
		mock<AgentChatAttachmentService>(),
		agentKnowledgeService,
		runtimeCacheService,
		testChatService,
		agentTaskRepository,
		subAgentCleanupService,
		eventService,
		agentExecutionService,
		credentialsService,
		projectScopeService,
		agentsSettingsService,
		agentPolicyService,
		skillRefs,
		transactionRunner,
		configPreparation,
		saveCompletion,
		setupCompletion,
	);

	return {
		service,
		telemetry,
		setupCompletion,
		transactionRunner,
		skillRefs,
		agentPolicyService,
		agentRepository,
		projectRelationRepository,
		agentKnowledgeService,
		runtimeCacheService,
		testChatService,
		agentTaskService,
		agentTaskRepository,
		chatIntegrationService,
		subAgentCleanupService,
		eventService,
		agentExecutionService,
		credentialsService,
		projectScopeService,
		agentsSettingsService,
	};
}

describe('AgentsService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		Container.reset();
	});

	it.each([
		['user', undefined, TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT, '3'],
		['user', 'openai/gpt-5-mini', TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT, '3'],
		['builder', undefined, TELEMETRY_EVENT.AGENTS.BUILDER_CREATED_AGENT, '3'],
		['builder', 'openai/gpt-5-mini', TELEMETRY_EVENT.AGENTS.BUILDER_CREATED_AGENT, '3'],
		['mcp', undefined, TELEMETRY_EVENT.AGENTS.MCP_CREATED_AGENT, '2'],
		['mcp', 'openai/gpt-5-mini', TELEMETRY_EVENT.AGENTS.MCP_CREATED_AGENT, '2'],
	] as const)(
		'reports a committed %s creation with model %s',
		async (createdBy, model, entry, version) => {
			const { service, agentRepository, telemetry, transactionRunner } = makeService();
			mockCreateReturning(agentRepository, makeAgent());
			transactionRunner.run.mockImplementation(async (ctx, write) => {
				const result = await write(ctx);
				expect(telemetry.track).not.toHaveBeenCalled();
				return result;
			});

			const result = await service.createOrAdopt(projectId, 'Support Agent', {
				actor,
				user,
				createdBy,
				...(model ? { defaultModel: { model, credential: '' } } : {}),
			});

			expect(result.adopted).toBe(false);
			expect(result.config?.model).toBe(model ?? '');
			expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(
				entry,
				expect.objectContaining({
					agent_id: agentId,
					project_id: projectId,
					user_id: user.id,
					event_version: version,
				}),
			);
			expect(telemetry.track.mock.calls[0]?.[1]).not.toHaveProperty('changed_settings');
		},
	);

	it('saves the prepared initial configuration and reports the stored profile', async () => {
		const { service, agentRepository, telemetry, setupCompletion } = makeService();
		const saved = makeAgent();
		mockCreateReturning(agentRepository, saved);
		const emitSetupCompleted = vi.fn();
		setupCompletion.recordIfSetupComplete.mockResolvedValue(emitSetupCompleted);
		const result = await service.createOrAdopt(projectId, 'Support Agent', {
			actor,
			user,
			createdBy: 'user',
			defaultModel: { model: 'anthropic/default', credential: '' },
			config: {
				model: 'openai/gpt-5-mini',
				instructions: 'Help users',
				credential: 'inaccessible',
			},
		});

		expect(saved.schema).toMatchObject({
			model: 'openai/gpt-5-mini',
			instructions: 'Help users',
			credential: '',
		});
		expect(result.config).toMatchObject(saved.schema!);
		expect(result.configHash).toMatch(/^[a-f0-9]{64}$/);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT,
			expect.objectContaining({ model: 'openai/gpt-5-mini' }),
		);
		expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		expect(setupCompletion.recordIfSetupComplete).toHaveBeenCalledWith(
			saved,
			[],
			projectId,
			expect.anything(),
			user,
		);
		expect(emitSetupCompleted).toHaveBeenCalledOnce();
	});

	it('rejects invalid initial configuration before inserting an Agent', async () => {
		const { service, agentRepository, telemetry } = makeService();
		mockCreateReturning(agentRepository, makeAgent());
		await expect(
			service.create(projectId, 'Support Agent', {
				actor,
				user,
				createdBy: 'user',
				config: { model: null },
			}),
		).rejects.toThrow('Invalid agent config');
		expect(agentRepository.insertNew).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('does not report creation when the skill-reference write fails', async () => {
		const { service, agentRepository, skillRefs, telemetry } = makeService();
		mockCreateReturning(agentRepository, makeAgent());
		skillRefs.replaceDraftRefs.mockRejectedValue(new Error('Skill write failed'));
		await expect(
			service.create(projectId, 'Support Agent', {
				actor,
				user,
				createdBy: 'user',
				config: { instructions: 'Help users' },
			}),
		).rejects.toThrow('Skill write failed');
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('creates a draft agent without a default model or credential', async () => {
		const { service, agentRepository, skillRefs } = makeService();
		const saved = makeAgent();

		mockCreateReturning(agentRepository, saved);

		await expect(service.create(projectId, 'Support Agent', { actor })).resolves.toBe(saved);
		expect(agentRepository.create).toHaveBeenCalledWith({
			id: agentId,
			name: 'Support Agent',
			projectId,
			schema: {
				name: 'Support Agent',
				model: '',
				instructions: '',
				tools: [],
				// A renderable icon name, not an emoji: the builder copies the idiom
				// it reads, and the icon tile can only render registered icon names.
				personalisation: {
					icon: DEFAULT_AGENT_PERSONALISATION.icon,
					gradient: expect.objectContaining({ angle: expect.any(Number) }),
				},
			},
			versionId: expect.any(String),
			availableInMCP: false,
		});
		// The skill refs of the new draft go through the skill refs seam.
		expect(skillRefs.createDraftRefs).toHaveBeenCalledWith(saved, [], {}, null, expect.anything());
	});

	it('creates an agent with a resolved default model and credential', async () => {
		const { service, agentRepository } = makeService();
		const saved = makeAgent();
		mockCreateReturning(agentRepository, saved);

		await service.create(projectId, 'Support Agent', {
			actor,
			defaultModel: {
				model: 'openai/gpt-5-mini',
				credential: 'managed',
			},
		});

		const [entity] = agentRepository.create.mock.calls[0];
		expect(entity.schema).toMatchObject({
			name: 'Support Agent',
			model: 'openai/gpt-5-mini',
			credential: 'managed',
		});
	});

	it('splits a seeded config so integrations land on their own column', async () => {
		// `composeJsonConfig` reads integrations from the entity column, so leaving
		// them inside `schema` loses every trigger on the next read — an eval seed
		// would restore an agent whose integrations silently vanished.
		const { service, agentRepository } = makeService();
		const saved = makeAgent();
		mockCreateReturning(agentRepository, saved);
		const integrations = [{ type: 'slack' as const, credentialId: 'cred-slack-1' }];

		await service.create(projectId, 'Support Agent', {
			actor,
			schema: {
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Triage tickets.',
				integrations,
			},
		});

		const [entity] = agentRepository.create.mock.calls[0];
		expect(entity.integrations).toEqual(integrations);
		expect(entity.schema).not.toHaveProperty('integrations');
		expect(entity.schema).toMatchObject({ name: 'Support Agent', instructions: 'Triage tickets.' });
	});

	it('omits the integrations column when the seeded config declares none', async () => {
		const { service, agentRepository } = makeService();
		const saved = makeAgent();
		mockCreateReturning(agentRepository, saved);

		await service.create(projectId, 'Support Agent', {
			actor,
			schema: { name: 'Support Agent', model: '', instructions: '' },
		});

		const [entity] = agentRepository.create.mock.calls[0];
		expect(entity).not.toHaveProperty('integrations');
	});

	it('seeds custom tool bodies onto the entity when duplicating a configured agent', async () => {
		// Tool bodies live in their own JSON column keyed by id; the duplicate path
		// copies both the refs (inside `schema.tools`) and the bodies so the clone
		// is runnable without a follow-up write.
		const { service, agentRepository } = makeService();
		const saved = makeAgent();
		mockCreateReturning(agentRepository, saved);
		const tools = {
			refund_tool: { code: 'return 1', descriptor: { name: 'refund_tool' } },
		};

		await service.create(projectId, 'Support Agent', {
			actor,
			schema: {
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Triage refunds.',
				tools: [{ type: 'custom', id: 'refund_tool' }],
			},
			tools,
		});

		const [entity] = agentRepository.create.mock.calls[0];
		expect(entity.tools).toEqual(tools);
		expect(entity.schema).toMatchObject({
			tools: [{ type: 'custom', id: 'refund_tool' }],
		});
	});

	it('passes seeded skill bodies to the skill refs seam, not to the entity', async () => {
		const { service, agentRepository, skillRefs } = makeService();
		const saved = makeAgent();
		mockCreateReturning(agentRepository, saved);
		const skills = {
			skill_abc: { name: 'Triage', description: '', instructions: 'Sort tickets.' },
		};

		const skillCreator = mock<User>({ id: 'user-1' });

		await service.create(projectId, 'Support Agent', {
			actor,
			skillCreator,
			schema: {
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Triage tickets.',
				skills: [{ type: 'skill', id: 'skill_abc' }],
			},
			skills,
		});

		const [entity] = agentRepository.create.mock.calls[0];
		expect(entity).not.toHaveProperty('skills');
		expect(skillRefs.createDraftRefs).toHaveBeenCalledWith(
			saved,
			[{ type: 'skill', id: 'skill_abc' }],
			skills,
			skillCreator,
			expect.anything(),
		);
	});

	it('stores the skill refs of a seeded config in order', async () => {
		const { service, agentRepository, skillRefs: refsService } = makeService();
		const saved = makeAgent();
		mockCreateReturning(agentRepository, saved);
		const skillRefs = [
			{ type: 'skill' as const, id: 'zeta' },
			{ type: 'skill' as const, id: 'alpha' },
			{ type: 'skill' as const, id: 'mid' },
		];
		// Refs to skills that are in the hub stay, also without a user.
		const skill = { name: 'Skill', description: 'A skill', instructions: 'Do it.' };
		refsService.bodies = { zeta: skill, alpha: skill, mid: skill };

		await service.create(projectId, 'Support Agent', {
			actor,
			schema: {
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Triage tickets.',
				skills: skillRefs,
			},
		});

		const [entity] = agentRepository.create.mock.calls[0];
		expect(entity.schema).not.toHaveProperty('skills');
		await expect(refsService.refsForDraft(saved, {})).resolves.toEqual(skillRefs);
		// The insert and the skill refs write share one transaction.
		const [[, insertCtx]] = agentRepository.insertNew.mock.calls;
		const [[, , , , refsCtx]] = refsService.createDraftRefs.mock.calls;
		expect(refsCtx).toBe(insertCtx);
	});

	describe('duplicate path (user-driven create-with-schema)', () => {
		const user = { id: 'user-1' } as unknown as User;

		it('copies chat channels as drafts so the clone does not claim the source credential', async () => {
			// The credential-claim check ignores publish state, so a copy holding the
			// source's channel credentialId would block the original from republishing.
			// Drafts (credentialId '') are skipped by that check and show needs-setup.
			const { service, agentRepository } = makeService();
			const saved = makeAgent();
			mockCreateReturning(agentRepository, saved);

			await service.create(projectId, 'Support Agent', {
				actor,
				schema: {
					name: 'Support Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Triage tickets.',
					integrations: [
						{ type: 'telegram', credentialId: 'cred-telegram-1' },
						{ type: 'slack', credentialId: 'cred-slack-1' },
					],
				},
				user,
			});

			const [entity] = agentRepository.create.mock.calls[0];
			expect(entity.integrations).toEqual([
				{ type: 'telegram', credentialId: '' },
				{ type: 'slack', credentialId: '' },
			]);
		});

		it('blanks inaccessible non-channel credentials and keeps accessible ones', async () => {
			const { service, agentRepository, credentialsService } = makeService();
			const saved = makeAgent();
			mockCreateReturning(agentRepository, saved);
			// The duplicating user can use cred-model-1 but not cred-model-2.
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
				{ id: 'cred-model-1', name: 'OpenAI', type: 'openaiApi' } as never,
			]);

			await service.create(projectId, 'Support Agent', {
				actor,
				schema: {
					name: 'Support Agent',
					model: 'openai/gpt-5-mini',
					instructions: 'Triage tickets.',
					credential: 'cred-model-1',
					integrations: [{ type: 'telegram', credentialId: 'cred-telegram-1' }],
					memory: {
						enabled: true,
						storage: 'n8n',
						episodicMemory: {
							enabled: true,
							credential: 'cred-model-2',
						},
					},
				},
				user,
			});

			const [entity] = agentRepository.create.mock.calls[0];
			// `entity.schema` is typed nullable + a discriminated union on memory, so
			// read it back through a permissive shape for the assertions.
			const schema = entity.schema as unknown as {
				credential?: string;
				memory?: { episodicMemory?: { credential?: string } };
			};
			// Accessible model credential kept.
			expect(schema.credential).toBe('cred-model-1');
			// Inaccessible episodic-memory credential blanked.
			expect(schema.memory?.episodicMemory?.credential).toBe('');
			// Channels always drafted regardless of access.
			expect(entity.integrations).toEqual([{ type: 'telegram', credentialId: '' }]);
		});

		it('reports creation and indexes a duplicate', async () => {
			const { service, agentRepository, eventService, telemetry } = makeService();
			const saved = makeAgent();
			mockCreateReturning(agentRepository, saved);

			await service.create(projectId, 'Support Agent', {
				actor,
				schema: {
					name: 'Support Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Triage tickets.',
				},
				user,
				createdBy: 'user',
			});

			expect(eventService.emit).toHaveBeenCalledWith('agent-saved', { agentId: saved.id });
			expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT,
				expect.objectContaining({ event_version: '3', model: 'anthropic/claude-sonnet-4-5' }),
			);
		});

		it('stays silent on an empty-draft create (no user) — no event', async () => {
			const { service, agentRepository, eventService } = makeService();
			const saved = makeAgent();
			mockCreateReturning(agentRepository, saved);

			await service.create(projectId, 'Support Agent', { actor });

			expect(eventService.emit).not.toHaveBeenCalledWith('agent-saved', expect.anything());
		});

		it('stays silent on eval seeding (schema but no user)', async () => {
			const { service, agentRepository, eventService, telemetry } = makeService();
			const saved = makeAgent();
			mockCreateReturning(agentRepository, saved);

			await service.create(projectId, 'Support Agent', {
				actor,
				schema: {
					name: 'Support Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Triage tickets.',
					integrations: [{ type: 'slack', credentialId: 'cred-slack-1' }],
				},
			});

			// Eval seeding copies integrations verbatim and emits nothing.
			const [entity] = agentRepository.create.mock.calls[0];
			expect(entity.integrations).toEqual([{ type: 'slack', credentialId: 'cred-slack-1' }]);
			expect(eventService.emit).not.toHaveBeenCalledWith('agent-saved', expect.anything());
			expect(telemetry.track).not.toHaveBeenCalled();
		});
	});

	describe('policy', () => {
		const user = { id: 'user-1' } as unknown as User;

		const dateTimeTool = {
			type: 'node' as const,
			name: 'Current date',
			node: { nodeType: 'n8n-nodes-base.dateTime', nodeTypeVersion: 2, nodeParameters: {} },
		};

		it('polices the seeded node tools as a create, with no stored draft to grandfather', async () => {
			const { service, agentRepository, agentPolicyService } = makeService();
			const saved = makeAgent();
			mockCreateReturning(agentRepository, saved);

			await service.create(projectId, 'Support Agent', {
				actor,
				schema: { name: 'Support Agent', model: '', instructions: '', tools: [dateTimeTool] },
				user,
			});

			expect(agentPolicyService.enforceSave).toHaveBeenCalledWith(
				projectId,
				null,
				expect.objectContaining({ tools: [expect.objectContaining(dateTimeTool)] }),
				null,
				actor,
			);
		});

		it('saves nothing when a policy refuses the seeded config', async () => {
			const { service, agentRepository, agentPolicyService } = makeService();
			mockCreateReturning(agentRepository, makeAgent());
			agentPolicyService.enforceSave.mockRejectedValue(new Error('Blocked by policy'));

			await expect(
				service.create(projectId, 'Support Agent', {
					actor,
					schema: { name: 'Support Agent', model: '', instructions: '', tools: [dateTimeTool] },
				}),
			).rejects.toThrow('Blocked by policy');

			expect(agentRepository.insertNew).not.toHaveBeenCalled();
		});
	});

	describe('create with a client-minted id', () => {
		const mintedId = 'aBcDeFgHiJkLmNoP';
		const uniqueViolation = () =>
			new QueryFailedError(
				'insert',
				undefined,
				Object.assign(new Error('duplicate key'), { code: '23505' }),
			);

		it('persists the agent under the supplied id', async () => {
			const { service, agentRepository } = makeService();
			const saved = makeAgent({ id: mintedId });
			mockCreateReturning(agentRepository, saved);

			await service.create(projectId, 'Support Agent', { actor, id: mintedId });

			expect(agentRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({ id: mintedId }),
			);
		});

		it('adopts a same-project agent when the adoption flag is set', async () => {
			const { service, agentRepository } = makeService();
			const raced = makeAgent({
				id: mintedId,
				schema: { name: 'Support Agent', model: '', instructions: '' },
				integrations: [],
			});
			mockCreateReturning(agentRepository, raced);
			agentRepository.insertNew.mockRejectedValue(uniqueViolation());
			agentRepository.findByIdAndProjectId.mockResolvedValue(raced);

			await expect(
				service.create(projectId, 'Support Agent', {
					actor,
					id: mintedId,
					adoptOnCollision: true,
				}),
			).resolves.toBe(raced);
		});

		it('rejects a collision without the adoption flag, even for a same-project blank row', async () => {
			const { service, agentRepository } = makeService();
			const raced = makeAgent({
				id: mintedId,
				schema: { name: 'Support Agent', model: '', instructions: '' },
				integrations: [],
			});
			mockCreateReturning(agentRepository, raced);
			agentRepository.insertNew.mockRejectedValue(uniqueViolation());

			await expect(
				service.create(projectId, 'Support Agent', { actor, id: mintedId }),
			).rejects.toThrow(ConflictError);
			expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		// The whole point of the adoption path: the winner of the insert usually
		// gets to configure the row before the loser collides on it.
		it('adopts an already configured same-project row, unchanged', async () => {
			const { service, agentRepository, telemetry, skillRefs } = makeService();
			const configured = makeAgent({
				id: mintedId,
				name: 'Support Triage',
				schema: {
					name: 'Support Triage',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Hi',
				},
				integrations: [],
			});
			mockCreateReturning(agentRepository, makeAgent({ id: mintedId }));
			agentRepository.insertNew.mockRejectedValue(uniqueViolation());
			agentRepository.findByIdAndProjectId.mockResolvedValue(configured);

			const result = await service.createOrAdopt(projectId, 'New Agent', {
				actor,
				user,
				createdBy: 'user',
				id: mintedId,
				adoptOnCollision: true,
				config: { instructions: 'Losing editor snapshot' },
			});
			expect(result).toMatchObject({ agent: configured, adopted: true, config: configured.schema });
			expect(result.configHash).toMatch(/^[a-f0-9]{64}$/);
			// The draft name/config this call carried must not overwrite the winner's.
			expect(agentRepository.insertNew).toHaveBeenCalledTimes(1);
			expect(skillRefs.replaceDraftRefs).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
		});

		it('rejects without disclosing when the id collides outside this project', async () => {
			const { service, agentRepository } = makeService();
			agentRepository.create.mockReturnValue(makeAgent({ id: mintedId }));
			agentRepository.insertNew.mockRejectedValue(uniqueViolation());
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(
				service.create(projectId, 'Support Agent', {
					actor,
					id: mintedId,
					adoptOnCollision: true,
				}),
			).rejects.toThrow(ConflictError);
		});

		it('rethrows a non-unique-violation failure instead of treating it as a race', async () => {
			const { service, agentRepository } = makeService();
			const error = new QueryFailedError('insert', undefined, new Error('connection lost'));
			agentRepository.create.mockReturnValue(makeAgent({ id: mintedId }));
			agentRepository.insertNew.mockRejectedValue(error);

			await expect(
				service.create(projectId, 'Support Agent', { actor, id: mintedId }),
			).rejects.toBe(error);
			expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});
	});

	it('deletes the agent and its dependent runtime state', async () => {
		const {
			service,
			agentRepository,
			agentKnowledgeService,
			runtimeCacheService,
			testChatService,
			agentTaskService,
			chatIntegrationService,
			subAgentCleanupService,
			eventService,
		} = makeService();
		const agent = makeAgent({
			integrations: [
				{ type: 'slack', credentialId: 'slack-1' },
				{ type: 'telegram', credentialId: 'telegram-1' },
			],
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await expect(service.delete(agentId, projectId)).resolves.toBe(true);

		expect(agentKnowledgeService.deleteAllFilesForAgent).toHaveBeenCalledWith(projectId, agentId);
		expect(agentKnowledgeService.deleteAllFilesForAgent.mock.invocationCallOrder[0]).toBeLessThan(
			agentRepository.remove.mock.invocationCallOrder[0],
		);
		expect(agentRepository.remove).toHaveBeenCalledWith(agent);
		expect(chatIntegrationService.disconnectChannel).toHaveBeenCalledWith(agentId, {
			type: 'slack',
			credentialId: 'slack-1',
		});
		expect(chatIntegrationService.disconnectChannel).toHaveBeenCalledWith(agentId, {
			type: 'telegram',
			credentialId: 'telegram-1',
		});
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(subAgentCleanupService.removeSubAgentFromParents).toHaveBeenCalledWith(
			agentId,
			projectId,
		);
		expect(agentTaskService.requestReconcile).toHaveBeenCalledWith(agentId);
		expect(testChatService.clearAllTestChatMessages).toHaveBeenCalledWith(agentId);
		expect(agentKnowledgeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(projectId, agentId);
		expect(eventService.emit).toHaveBeenCalledWith('agent-deleted', { agentId, projectId });
	});

	it('emits agent-deleted only after the agent row is removed', async () => {
		const { service, agentRepository, eventService } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

		await service.delete(agentId, projectId);

		expect(eventService.emit).toHaveBeenCalledWith('agent-deleted', { agentId, projectId });
		expect(eventService.emit.mock.invocationCallOrder[0]).toBeGreaterThan(
			agentRepository.remove.mock.invocationCallOrder[0],
		);
	});

	it('does not emit agent-deleted when the agent is missing', async () => {
		const { service, agentRepository, eventService } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.delete(agentId, projectId)).resolves.toBe(false);
		expect(eventService.emit).not.toHaveBeenCalled();
	});

	it('still deletes the agent when best-effort cleanup fails', async () => {
		const { service, agentRepository, agentKnowledgeService, testChatService } = makeService();
		const agent = makeAgent();

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentKnowledgeService.deleteAllFilesForAgent.mockRejectedValue(new Error('storage down'));
		testChatService.clearAllTestChatMessages.mockRejectedValue(new Error('memory down'));

		await expect(service.delete(agentId, projectId)).resolves.toBe(true);
		expect(agentRepository.remove).toHaveBeenCalledWith(agent);
		expect(agentKnowledgeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(projectId, agentId);
	});

	it('returns false when deleting a missing agent', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.delete(agentId, projectId)).resolves.toBe(false);
		expect(agentRepository.remove).not.toHaveBeenCalled();
	});

	describe('findByIdForUser', () => {
		const makeUser = (scopeSlugs: string[]): User =>
			({ id: 'user-9', role: { scopes: scopeSlugs.map((slug) => ({ slug })) } }) as unknown as User;

		it('looks the agent up directly for users with the global agent:read scope', async () => {
			const { service, agentRepository, projectRelationRepository } = makeService();
			const agent = makeAgent();
			agentRepository.findById.mockResolvedValue(agent);

			await expect(service.findByIdForUser(agentId, makeUser(['agent:read']))).resolves.toBe(agent);

			expect(agentRepository.findById).toHaveBeenCalledWith(agentId);
			expect(projectRelationRepository.findAllByUser).not.toHaveBeenCalled();
		});

		it('restricts the lookup to the projects the user belongs to', async () => {
			const { service, agentRepository, projectRelationRepository } = makeService();
			const agent = makeAgent();
			projectRelationRepository.findAllByUser.mockResolvedValue([
				{ projectId: 'project-1' },
				{ projectId: 'project-2' },
			] as never);
			agentRepository.findByIdInProjects.mockResolvedValue(agent);

			await expect(service.findByIdForUser(agentId, makeUser([]))).resolves.toBe(agent);

			expect(projectRelationRepository.findAllByUser).toHaveBeenCalledWith('user-9');
			expect(agentRepository.findByIdInProjects).toHaveBeenCalledWith(agentId, [
				'project-1',
				'project-2',
			]);
			expect(agentRepository.findById).not.toHaveBeenCalled();
		});

		it('returns null when the agent is outside the user’s projects', async () => {
			const { service, agentRepository, projectRelationRepository } = makeService();
			projectRelationRepository.findAllByUser.mockResolvedValue([]);
			agentRepository.findByIdInProjects.mockResolvedValue(null);

			await expect(service.findByIdForUser(agentId, makeUser([]))).resolves.toBeNull();
		});
	});

	describe('findChatReachableByUserPaginated', () => {
		const user = { id: 'user-1' } as unknown as User;

		function makeReachableAgent() {
			return makeAgent({
				id: 'agent-1',
				name: 'Support',
				projectId: 'project-1',
				project: { id: 'project-1', name: 'Support Team' },
				schema: { name: 'draft', model: 'm', instructions: 'draft instructions' },
				activeVersion: {
					schema: {
						name: 'Support',
						model: 'm',
						instructions: 'published instructions',
						personalisation: { icon: 'bot', gradient: { from: '#000000', to: '#FFFFFF' } },
						description: 'Answers billing questions.',
						integrations: [{ type: N8N_CHAT_INTEGRATION_TYPE }],
					},
				},
			} as never);
		}

		it('returns an empty chat list when agents are disabled', async () => {
			const { service, agentRepository, projectScopeService, agentsSettingsService } =
				makeService();
			agentsSettingsService.getEnabled.mockResolvedValue(false);
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findN8nChatListPaginated.mockResolvedValue({
				count: 1,
				data: [makeReachableAgent()],
			});

			const result = await service.findChatReachableByUserPaginated(user, {
				skip: 0,
				take: 10,
				filter: { availableInChat: true },
			} as never);

			expect(result).toEqual({ count: 0, data: [] });
			expect(agentRepository.findN8nChatListPaginated).not.toHaveBeenCalled();
		});

		it('scopes to agent:execute, the scope the production chat route requires', async () => {
			const { service, agentRepository, projectRelationRepository, projectScopeService } =
				makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			projectScopeService.getMemberProjectIds.mockResolvedValue(['project-owned']);
			agentRepository.findN8nChatListPaginated.mockResolvedValue({ count: 0, data: [] });
			const options = { skip: 0, take: 10, filter: { availableInChat: true } } as never;

			await service.findChatReachableByUserPaginated(user, options);

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:execute']);
			// Membership only: a global role must not list every project's drafts.
			expect(projectScopeService.getMemberProjectIds).toHaveBeenCalledWith(user, [
				'agent:update',
				'agent:publish',
			]);
			expect(agentRepository.findN8nChatListPaginated).toHaveBeenCalledWith(
				['project-1'],
				['project-owned'],
				options,
				undefined,
			);
			expect(projectRelationRepository.findAllByUser).not.toHaveBeenCalled();
		});

		it('fetches usage counts only when sorted by usage', async () => {
			const { service, agentRepository, agentExecutionService, projectScopeService } =
				makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findN8nChatListPaginated.mockResolvedValue({ count: 0, data: [] });
			const counts = new Map([['agent-1', 3]]);
			agentExecutionService.countN8nChatThreadsByAgent.mockResolvedValue(counts);
			const options = {
				skip: 0,
				take: 10,
				filter: { availableInChat: true },
				sortBy: 'usage:desc',
			} as never;

			await service.findChatReachableByUserPaginated(user, options);

			expect(agentExecutionService.countN8nChatThreadsByAgent).toHaveBeenCalledWith('user-1', [
				'project-1',
			]);
			expect(agentRepository.findN8nChatListPaginated).toHaveBeenCalledWith(
				['project-1'],
				[],
				options,
				counts,
			);
		});

		it('answers with the narrow chat item, never the agent config', async () => {
			const { service, agentRepository, projectScopeService } = makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findN8nChatListPaginated.mockResolvedValue({
				count: 1,
				data: [makeReachableAgent()],
			});

			const result = await service.findChatReachableByUserPaginated(user, {
				skip: 0,
				take: 10,
				filter: { availableInChat: true },
			} as never);

			expect(result).toEqual({
				count: 1,
				data: [
					{
						id: 'agent-1',
						name: 'Support',
						personalisation: {
							icon: 'bot',
							gradient: { from: '#000000', to: '#FFFFFF' },
						},
						description: 'Answers billing questions.',
						project: { id: 'project-1', name: 'Support Team' },
						attachments: { image: false, pdf: false, audio: false },
						availableInChat: true,
					},
				],
			});
			// The audience holds `agent:execute` alone, so none of this may leave.
			const [item] = result.data;
			expect(item).not.toHaveProperty('schema');
			expect(item).not.toHaveProperty('tools');
			expect(item).not.toHaveProperty('skills');
			expect(item).not.toHaveProperty('activeVersion');
			expect(JSON.stringify(result)).not.toContain('published instructions');
		});

		it('omits personalisation when the published config has none', async () => {
			const { service, agentRepository, projectScopeService } = makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findN8nChatListPaginated.mockResolvedValue({
				count: 1,
				data: [
					makeAgent({
						id: 'agent-2',
						name: 'Plain',
						projectId: 'project-1',
						project: { id: 'project-1', name: 'Support Team' },
						activeVersion: { schema: { name: 'Plain', model: 'm', instructions: 'i' } },
					} as never),
				],
			});

			const result = await service.findChatReachableByUserPaginated(user, {
				skip: 0,
				take: 10,
				filter: { availableInChat: true },
			} as never);

			expect(result.data[0]).not.toHaveProperty('personalisation');
			expect(result.data[0]).not.toHaveProperty('description');
		});

		it('passes a null project scope through, so a global role sees every project', async () => {
			const { service, agentRepository, projectScopeService } = makeService();
			projectScopeService.getProjectIds.mockResolvedValue(null);
			agentRepository.findN8nChatListPaginated.mockResolvedValue({ count: 0, data: [] });
			const options = { skip: 0, take: 10, filter: { availableInChat: true } } as never;

			await service.findChatReachableByUserPaginated(user, options);

			expect(agentRepository.findN8nChatListPaginated).toHaveBeenCalledWith(
				null,
				[],
				options,
				undefined,
			);
		});

		it('lists an owned agent not in n8n Chat from its draft config', async () => {
			const { service, agentRepository, projectScopeService } = makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			projectScopeService.getMemberProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findN8nChatListPaginated.mockResolvedValue({
				count: 1,
				data: [
					makeAgent({
						id: 'agent-3',
						name: 'Draft',
						projectId: 'project-1',
						project: { id: 'project-1', name: 'Support Team' },
						schema: {
							name: 'Draft',
							model: 'm',
							instructions: 'i',
							description: 'Draft blurb.',
						},
						activeVersion: { schema: { name: 'Draft', model: 'm', instructions: 'i' } },
					} as never),
				],
			});

			const result = await service.findChatReachableByUserPaginated(user, {
				skip: 0,
				take: 10,
				filter: { availableInChat: true },
			} as never);

			expect(result.data[0]).toMatchObject({
				id: 'agent-3',
				description: 'Draft blurb.',
				availableInChat: false,
			});
		});
	});

	describe('findChatReachableAgentForUser', () => {
		const user = { id: 'user-1' } as unknown as User;

		function makeReachableAgent(schemaOverrides: Record<string, unknown> = {}) {
			return makeAgent({
				id: 'agent-1',
				name: 'Support',
				projectId: 'project-1',
				project: { id: 'project-1', name: 'Support Team' },
				activeVersion: {
					schema: {
						name: 'Support',
						model: 'anthropic/claude-sonnet-4-5',
						instructions: 'published instructions',
						personalisation: { icon: 'bot', gradient: { from: '#000000', to: '#FFFFFF' } },
						description: 'Answers billing questions.',
						integrations: [{ type: N8N_CHAT_INTEGRATION_TYPE }],
						...schemaOverrides,
					},
				},
			} as never);
		}

		it('scopes to agent:execute, the scope the production chat route requires', async () => {
			const { service, agentRepository, projectScopeService } = makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findChatReachableById.mockResolvedValue(makeReachableAgent());

			await service.findChatReachableAgentForUser('agent-1', user);

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:execute']);
			expect(agentRepository.findChatReachableById).toHaveBeenCalledWith('agent-1', ['project-1']);
		});

		it('passes a null project scope through, so a global role reaches every project', async () => {
			const { service, agentRepository, projectScopeService } = makeService();
			projectScopeService.getProjectIds.mockResolvedValue(null);
			agentRepository.findChatReachableById.mockResolvedValue(makeReachableAgent());

			await service.findChatReachableAgentForUser('agent-1', user);

			expect(agentRepository.findChatReachableById).toHaveBeenCalledWith('agent-1', null);
		});

		it('answers with the narrow chat item plus attachments and sub-agents, never the agent config', async () => {
			const { service, agentRepository, projectScopeService } = makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findChatReachableById.mockResolvedValue(makeReachableAgent());

			const result = await service.findChatReachableAgentForUser('agent-1', user);

			expect(result).toEqual({
				id: 'agent-1',
				name: 'Support',
				personalisation: { icon: 'bot', gradient: { from: '#000000', to: '#FFFFFF' } },
				description: 'Answers billing questions.',
				project: { id: 'project-1', name: 'Support Team' },
				attachments: { image: true, pdf: true, audio: false },
				availableInChat: true,
				subAgents: [],
			});
			expect(result).not.toHaveProperty('schema');
			expect(JSON.stringify(result)).not.toContain('published instructions');
		});

		it.each(['', 'unknown-provider/some-model'])(
			'reports no attachment support for model "%s"',
			async (model) => {
				const { service, agentRepository, projectScopeService } = makeService();
				projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
				agentRepository.findChatReachableById.mockResolvedValue(makeReachableAgent({ model }));

				const result = await service.findChatReachableAgentForUser('agent-1', user);

				expect(result?.attachments).toEqual({ image: false, pdf: false, audio: false });
			},
		);

		it('resolves sub-agent names from the same project, including disabled ones, skipping repeated and unresolved entries', async () => {
			const { service, agentRepository, projectScopeService } = makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findChatReachableById.mockResolvedValue(
				makeReachableAgent({
					subAgents: {
						agents: [
							{ agentId: 'sub-1' },
							{ agentId: 'sub-1' },
							{ agentId: 'sub-2', enabled: false },
							{ agentId: 'sub-3' },
						],
					},
				}),
			);
			agentRepository.findByIdsAndProjectId.mockResolvedValue([
				{ id: 'sub-1', name: 'Researcher' } as never,
				{ id: 'sub-2', name: 'Retired' } as never,
			]);

			const result = await service.findChatReachableAgentForUser('agent-1', user);

			expect(agentRepository.findByIdsAndProjectId).toHaveBeenCalledWith(
				['sub-1', 'sub-2', 'sub-3'],
				'project-1',
			);
			expect(result?.subAgents).toEqual([
				{ id: 'sub-1', name: 'Researcher' },
				{ id: 'sub-2', name: 'Retired' },
			]);
		});

		it('returns null when the repository finds no reachable agent', async () => {
			const { service, agentRepository, projectScopeService } = makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findChatReachableById.mockResolvedValue(null);

			await expect(service.findChatReachableAgentForUser('agent-1', user)).resolves.toBeNull();
		});
	});

	describe('findN8nChatThreadsForUser', () => {
		const user = { id: 'user-1' } as unknown as User;

		it('scopes agent reachability to agent:execute, then narrows to chat-reachable agents', async () => {
			const { service, agentRepository, agentExecutionService, projectScopeService } =
				makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findChatReachableIds.mockResolvedValue(['agent-1']);
			const response = { data: [], nextCursor: null };
			agentExecutionService.findN8nChatThreadsForAgents.mockResolvedValue(response);

			const result = await service.findN8nChatThreadsForUser(user, {
				limit: 20,
				cursor: 'cursor-1',
				search: 'refund',
			});

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:execute']);
			expect(agentRepository.findChatReachableIds).toHaveBeenCalledWith(['project-1']);
			expect(agentExecutionService.findN8nChatThreadsForAgents).toHaveBeenCalledWith(
				'user-1',
				['agent-1'],
				{ limit: 20, cursor: 'cursor-1', search: 'refund' },
			);
			expect(result).toBe(response);
		});

		it('never asks for threads under an agent the user can no longer reach over n8n Chat', async () => {
			// A thread's agent dropping out of `findChatReachableIds` (project
			// removed, channel unpublished, agent deleted) must drop its threads
			// from the list too, even though nothing here filters per-thread.
			const { service, agentRepository, agentExecutionService, projectScopeService } =
				makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findChatReachableIds.mockResolvedValue([]);
			agentExecutionService.findN8nChatThreadsForAgents.mockResolvedValue({
				data: [],
				nextCursor: null,
			});

			await service.findN8nChatThreadsForUser(user, { limit: 20 });

			expect(agentExecutionService.findN8nChatThreadsForAgents).toHaveBeenCalledWith('user-1', [], {
				limit: 20,
			});
		});

		it('narrows to one agent when agentId is reachable', async () => {
			const { service, agentRepository, agentExecutionService, projectScopeService } =
				makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findChatReachableById.mockResolvedValue(makeAgent({ id: 'agent-2' }));
			agentExecutionService.findN8nChatThreadsForAgents.mockResolvedValue({
				data: [],
				nextCursor: null,
			});

			await service.findN8nChatThreadsForUser(user, { limit: 20, agentId: 'agent-2' });

			expect(agentRepository.findChatReachableById).toHaveBeenCalledWith('agent-2', ['project-1']);
			expect(agentRepository.findChatReachableIds).not.toHaveBeenCalled();
			expect(agentExecutionService.findN8nChatThreadsForAgents).toHaveBeenCalledWith(
				'user-1',
				['agent-2'],
				{ limit: 20, agentId: 'agent-2' },
			);
		});

		it('returns an empty page, not an error, when agentId is unreachable', async () => {
			const { service, agentRepository, agentExecutionService, projectScopeService } =
				makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findChatReachableById.mockResolvedValue(null);
			agentExecutionService.findN8nChatThreadsForAgents.mockResolvedValue({
				data: [],
				nextCursor: null,
			});

			await service.findN8nChatThreadsForUser(user, { limit: 20, agentId: 'agent-unreachable' });

			expect(agentExecutionService.findN8nChatThreadsForAgents).toHaveBeenCalledWith('user-1', [], {
				limit: 20,
				agentId: 'agent-unreachable',
			});
		});
	});

	describe('findN8nChatThreadForUser', () => {
		const user = { id: 'user-1' } as unknown as User;

		it('scopes agent reachability to agent:execute, then narrows to chat-reachable agents', async () => {
			const { service, agentRepository, agentExecutionService, projectScopeService } =
				makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findChatReachableIds.mockResolvedValue(['agent-1']);
			const summary = { id: 'thread-1', title: 'Refund status' };
			agentExecutionService.findN8nChatThreadForAgents.mockResolvedValue(summary as never);

			const result = await service.findN8nChatThreadForUser(user, 'thread-1');

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:execute']);
			expect(agentRepository.findChatReachableIds).toHaveBeenCalledWith(['project-1']);
			expect(agentExecutionService.findN8nChatThreadForAgents).toHaveBeenCalledWith(
				'user-1',
				['agent-1'],
				'thread-1',
			);
			expect(result).toBe(summary);
		});

		it('returns null when the thread falls outside the reachable agents', async () => {
			const { service, agentRepository, agentExecutionService, projectScopeService } =
				makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findChatReachableIds.mockResolvedValue([]);
			agentExecutionService.findN8nChatThreadForAgents.mockResolvedValue(null);

			await expect(service.findN8nChatThreadForUser(user, 'thread-1')).resolves.toBeNull();

			expect(agentExecutionService.findN8nChatThreadForAgents).toHaveBeenCalledWith(
				'user-1',
				[],
				'thread-1',
			);
		});
	});

	describe('findListableByUserPaginated', () => {
		const user = { id: 'user-1' } as unknown as User;

		it('scopes to agent:list, the scope the project list route requires', async () => {
			const { service, agentRepository, projectRelationRepository, projectScopeService } =
				makeService();
			projectScopeService.getProjectIds.mockResolvedValue(['project-1', 'project-2']);
			agentRepository.findByProjectIdsPaginated.mockResolvedValue({ count: 0, data: [] });
			const options = { skip: 0, take: 10 } as never;

			await service.findListableByUserPaginated(user, options);

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:list']);
			expect(projectRelationRepository.findAllByUser).not.toHaveBeenCalled();
			expect(agentRepository.findByProjectIdsPaginated).toHaveBeenCalledWith(
				['project-1', 'project-2'],
				options,
			);
		});

		it('passes a null project scope through, so a global role sees every project', async () => {
			const { service, agentRepository, projectScopeService } = makeService();
			projectScopeService.getProjectIds.mockResolvedValue(null);
			agentRepository.findByProjectIdsPaginated.mockResolvedValue({ count: 0, data: [] });
			const options = { skip: 0, take: 10 } as never;

			await service.findListableByUserPaginated(user, options);

			expect(agentRepository.findByProjectIdsPaginated).toHaveBeenCalledWith(null, options);
		});
	});

	describe('getCapabilitySummary', () => {
		it('projects model, channels, tools, skills and tasks into per-item labels', async () => {
			const { service, agentRepository, agentTaskRepository, skillRefs } = makeService();
			skillRefs.bodies.s1 = { name: 'Triage', description: '', instructions: '' };
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({
					name: 'Support Agent',
					schema: {
						name: 'Support Agent',
						model: 'anthropic/claude-sonnet-4-5',
						instructions: 'Help the user.',
						tools: [
							{ type: 'custom', id: 'c1' },
							{ type: 'workflow', workflow: 'wf-1', name: 'Lookup order' },
							{
								type: 'node',
								name: 'HTTP Request',
								node: { nodeType: 'n8n-nodes-base.httpRequestTool', nodeTypeVersion: 1 },
							},
						],
						skills: [{ type: 'skill', id: 's1' }],
						tasks: [{ type: 'task', id: 't1', enabled: true }],
						mcpServers: [
							{
								name: 'notion-mcp',
								url: 'https://mcp.example.com',
								transport: 'streamableHttp',
								authentication: 'none',
							},
						],
					},
					integrations: [
						{ type: 'slack', credentialId: 'cred-1' },
						{ type: 'telegram', credentialId: 'cred-2' },
					],
					tools: { c1: { code: '', descriptor: { name: 'Refund tool' } } },
				} as unknown as Partial<ProjectAgent>),
			);
			agentTaskRepository.findByAgentId.mockResolvedValue([
				{ id: 't1', name: 'Daily digest' } as AgentTask,
			]);

			const summary = await service.getCapabilitySummary(agentId, projectId);

			expect(summary).toEqual({
				id: agentId,
				name: 'Support Agent',
				model: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
				channels: [{ type: 'slack' }, { type: 'telegram' }],
				tools: [
					{ type: 'custom', name: 'Refund tool' },
					{ type: 'workflow', name: 'Lookup order' },
					{
						type: 'node',
						name: 'HTTP Request',
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 1,
					},
				],
				mcpServers: [{ name: 'notion-mcp' }],
				skills: [{ id: 's1', name: 'Triage' }],
				tasks: [{ id: 't1', name: 'Daily digest', enabled: true }],
			});
		});

		it('returns a null model and empty arrays for an unconfigured agent', async () => {
			const { service, agentRepository, agentTaskRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ name: 'Empty Agent', schema: null }),
			);

			const summary = await service.getCapabilitySummary(agentId, projectId);

			expect(summary).toEqual({
				id: agentId,
				name: 'Empty Agent',
				model: null,
				channels: [],
				tools: [],
				mcpServers: [],
				skills: [],
				tasks: [],
			});
			// No task refs → no body lookup.
			expect(agentTaskRepository.findByAgentId).not.toHaveBeenCalled();
		});

		it('falls back to ref ids when bodies are missing', async () => {
			const { service, agentRepository, agentTaskRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({
					name: 'Partial Agent',
					schema: {
						name: 'Partial Agent',
						model: 'claude-sonnet-4-5',
						instructions: 'Help the user.',
						tools: [
							{ type: 'custom', id: 'c-missing' },
							{ type: 'workflow', workflow: 'wf-2' },
						],
						skills: [{ type: 'skill', id: 's-missing' }],
						tasks: [{ type: 'task', id: 't-missing', enabled: false }],
					},
				} as unknown as Partial<ProjectAgent>),
			);
			agentTaskRepository.findByAgentId.mockResolvedValue([]);

			const summary = await service.getCapabilitySummary(agentId, projectId);

			expect(summary.model).toEqual({ provider: '', model: 'claude-sonnet-4-5' });
			expect(summary.tools).toEqual([
				{ type: 'custom', name: 'c-missing' },
				{ type: 'workflow', name: 'wf-2' },
			]);
			expect(summary.skills).toEqual([{ id: 's-missing', name: 's-missing' }]);
			expect(summary.tasks).toEqual([{ id: 't-missing', name: 't-missing', enabled: false }]);
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			const { service, agentRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.getCapabilitySummary(agentId, projectId)).rejects.toThrow(NotFoundError);
		});
	});
});
