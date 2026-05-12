/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method, id-denylist -- async mock stubs, unbound-method references and short `cb` names are acceptable test idioms */
import type { AgentsConfig, GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT, type AgentIntegration } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentSkillsService } from '../agent-skills.service';
import { AgentsService, chatThreadId } from '../agents.service';
import type { AgentPublishedVersion } from '../entities/agent-published-version.entity';
import type { Agent } from '../entities/agent.entity';
import { AgentScheduleService } from '../integrations/agent-schedule.service';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
import {
	AgentChatIntegration,
	ChatIntegrationRegistry,
	type AgentChatIntegrationContext,
} from '../integrations/agent-chat-integration';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentJsonConfig } from '../json-config/agent-json-config';
import type { AgentPublishedVersionRepository } from '../repositories/agent-published-version.repository';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';
const versionId = 'v1';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		versionId,
		schema: null,
		model: 'claude-3',
		provider: 'anthropic',
		credentialId: 'cred-1',
		publishedVersion: null,
		integrations: [],
		tools: {},
		skills: {},
		updatedAt: new Date(),
		...overrides,
	} as unknown as Agent;
}

function makePublishedVersion(
	overrides: Partial<AgentPublishedVersion> = {},
): AgentPublishedVersion {
	return {
		agentId,
		publishedFromVersionId: versionId,
		schema: null,
		model: null,
		provider: null,
		credentialId: null,
		tools: null,
		skills: null,
		publishedById: null,
		...overrides,
	} as unknown as AgentPublishedVersion;
}

describe('AgentsService', () => {
	let service: AgentsService;
	let agentRepository: jest.Mocked<AgentRepository>;
	let agentPublishedVersionRepository: jest.Mocked<AgentPublishedVersionRepository>;
	let n8nMemory: jest.Mocked<N8nMemory>;
	let n8nCheckpointStorage: jest.Mocked<N8NCheckpointStorage>;
	let agentExecutionService: jest.Mocked<AgentExecutionService>;
	let scheduleService: jest.Mocked<AgentScheduleService>;
	let publisher: jest.Mocked<Publisher>;
	let agentsConfig: AgentsConfig;
	let globalConfig: jest.Mocked<GlobalConfig>;

	beforeEach(() => {
		jest.clearAllMocks();

		agentRepository = mock<AgentRepository>();
		agentPublishedVersionRepository = mock<AgentPublishedVersionRepository>();
		n8nMemory = mock<N8nMemory>();
		n8nCheckpointStorage = mock<N8NCheckpointStorage>();
		agentExecutionService = mock<AgentExecutionService>();
		agentExecutionService.recordMessage.mockResolvedValue('exec-id');
		scheduleService = mock<AgentScheduleService>();
		publisher = mock<Publisher>();
		publisher.publishCommand.mockResolvedValue();
		agentsConfig = { modules: [] } as unknown as AgentsConfig;
		globalConfig = mock<GlobalConfig>({
			multiMainSetup: { enabled: false },
		} as Partial<GlobalConfig>);
		const logger = mockLogger();

		service = new AgentsService(
			logger,
			agentRepository,
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			n8nCheckpointStorage,
			mock(),
			mock(),
			mock(),
			n8nMemory,
			agentExecutionService,
			agentPublishedVersionRepository,
			new AgentSkillsService(logger, agentRepository),
			publisher,
			agentsConfig,
			globalConfig,
		);
	});

	afterEach(() => {
		Container.reset();
	});

	describe('validateConfig', () => {
		it('rejects inputSchema on node tool configs', async () => {
			const result = await service.validateConfig({
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				tools: [
					{
						type: 'node',
						name: 'http_request',
						description: 'Make an HTTP request to any URL',
						inputSchema: {
							type: 'object',
							properties: { url: { type: 'string' } },
							required: ['url'],
						},
						node: {
							nodeType: 'n8n-nodes-base.httpRequestTool',
							nodeTypeVersion: 4,
							nodeParameters: {
								method: 'GET',
								url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('url', 'The URL to request', 'string') }}",
								toolDescription: 'Make an HTTP request to any URL',
							},
						},
					},
				],
			});

			expect(result.valid).toBe(false);
			if (result.valid) return;

			expect(result.error).toContain('inputSchema');
		});

		it('rejects config.nodeTools.enabled when the node tools module is disabled', async () => {
			const result = await service.validateConfig({
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				config: { nodeTools: { enabled: true } },
			});

			expect(result.valid).toBe(false);
			if (result.valid) return;

			expect(result.error).toContain('node-tools-searcher');
		});

		it('allows config.nodeTools.enabled when the node tools module is enabled', async () => {
			agentsConfig.modules = ['node-tools-searcher'] as unknown as AgentsConfig['modules'];

			const result = await service.validateConfig({
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				config: { nodeTools: { enabled: true } },
			});

			expect(result.valid).toBe(true);
		});
	});

	describe('updateConfig', () => {
		const config = {
			name: 'Test Agent',
		} as unknown as AgentJsonConfig;

		beforeEach(() => {
			jest.spyOn(service, 'validateConfig').mockResolvedValue({ valid: true, config });
			agentRepository.save.mockImplementation(async (a) => a as Agent);
		});

		it('does not bump versionId when agent has never been published', async () => {
			const agent = makeAgent({ versionId: 'v1', publishedVersion: null });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(agentId, projectId, {});

			expect(agentRepository.save.mock.calls[0][0].versionId).toBe('v1');
		});

		it('does not bump versionId when already in a draft (versionId differs from publishedFromVersionId)', async () => {
			const agent = makeAgent({
				versionId: 'v2',
				publishedVersion: makePublishedVersion({ publishedFromVersionId: 'v1' }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(agentId, projectId, {});

			expect(agentRepository.save.mock.calls[0][0].versionId).toBe('v2');
		});

		it('bumps versionId on the first save after publish (versionId equals publishedFromVersionId)', async () => {
			const agent = makeAgent({
				versionId: 'v1',
				publishedVersion: makePublishedVersion({ publishedFromVersionId: 'v1' }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(agentId, projectId, {});

			const savedVersionId = agentRepository.save.mock.calls[0][0].versionId as string;
			expect(savedVersionId).not.toBe('v1');
			expect(savedVersionId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});

		it('rejects config saves that reference a missing skill body', async () => {
			const configWithMissingSkill = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				skills: [{ type: 'skill', id: 'missing_skill' }],
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithMissingSkill,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ skills: {} }));

			await expect(
				service.updateConfig(agentId, projectId, configWithMissingSkill),
			).rejects.toThrow('Invalid agent config: Missing skill bodies: missing_skill');
			expect(agentRepository.save).not.toHaveBeenCalled();
		});

		it('preserves existing integrations when the inbound config omits the integrations field', async () => {
			// Reproduces a multi-main bug where saving an unrelated config field
			// (e.g. instructions) without re-sending the persisted integrations
			// would silently clear them and tear down live chat connections.
			const slackIntegration = {
				type: 'slack',
				credentialId: 'cred-slack',
				credentialName: 'Slack workspace',
			} as const;
			const agent = makeAgent({
				integrations: [slackIntegration],
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configWithoutIntegrations = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Updated instructions',
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithoutIntegrations,
			});

			await service.updateConfig(agentId, projectId, configWithoutIntegrations);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.integrations).toEqual([slackIntegration]);
		});

		it('clears integrations when the inbound config explicitly sends an empty array', async () => {
			const slackIntegration = {
				type: 'slack',
				credentialId: 'cred-slack',
				credentialName: 'Slack workspace',
			} as const;
			const agent = makeAgent({
				integrations: [slackIntegration],
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configWithEmptyIntegrations = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				integrations: [],
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithEmptyIntegrations,
			});

			await service.updateConfig(agentId, projectId, configWithEmptyIntegrations);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.integrations).toEqual([]);
		});

		it('preserves stored tool bodies when the inbound config omits the tools field', async () => {
			const existingTools = {
				'tool-1': {
					code: 'function handler() {}',
					descriptor: { name: 'tool-1', description: 'first', inputSchema: {} },
				},
				'tool-2': {
					code: 'function handler2() {}',
					descriptor: { name: 'tool-2', description: 'second', inputSchema: {} },
				},
			} as unknown as Agent['tools'];
			const agent = makeAgent({ tools: existingTools });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configWithoutTools = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithoutTools,
			});

			await service.updateConfig(agentId, projectId, configWithoutTools);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.tools).toEqual(existingTools);
		});

		it('prunes orphaned tool bodies when the inbound config provides a tools array', async () => {
			const existingTools = {
				'tool-1': {
					code: 'a',
					descriptor: { name: 'tool-1', description: 'a', inputSchema: {} },
				},
				'tool-2': {
					code: 'b',
					descriptor: { name: 'tool-2', description: 'b', inputSchema: {} },
				},
			} as unknown as Agent['tools'];
			const agent = makeAgent({ tools: existingTools });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configKeepingOnlyToolOne = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				tools: [{ type: 'custom', id: 'tool-1' }],
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configKeepingOnlyToolOne,
			});

			await service.updateConfig(agentId, projectId, configKeepingOnlyToolOne);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(Object.keys(savedEntity.tools)).toEqual(['tool-1']);
		});

		it('preserves stored skill bodies when the inbound config omits the skills field', async () => {
			const existingSkills = {
				'skill-1': { name: 'A', description: 'a', instructions: 'do a' },
				'skill-2': { name: 'B', description: 'b', instructions: 'do b' },
			} as unknown as Agent['skills'];
			const agent = makeAgent({ skills: existingSkills });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configWithoutSkills = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithoutSkills,
			});

			await service.updateConfig(agentId, projectId, configWithoutSkills);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.skills).toEqual(existingSkills);
		});

		it('preserves stored schema fields the client did not send (memory, description, credential)', async () => {
			const previousSchema = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Old instructions',
				description: 'previously stored description',
				credential: 'cred-anthropic',
				memory: { enabled: true, lastMessages: 20 },
				tools: [{ type: 'custom', id: 'tool-keep' } as const],
			} as unknown as AgentJsonConfig;
			const agent = makeAgent({ schema: previousSchema });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			// Client sends only the required fields plus a new instruction.
			const minimalUpdate = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Updated instructions',
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: minimalUpdate,
			});

			await service.updateConfig(agentId, projectId, minimalUpdate);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			const savedSchema = savedEntity.schema as Record<string, unknown>;
			expect(savedSchema.instructions).toBe('Updated instructions');
			expect(savedSchema.description).toBe('previously stored description');
			expect(savedSchema.credential).toBe('cred-anthropic');
			expect(savedSchema.memory).toEqual({ enabled: true, lastMessages: 20 });
			expect(savedSchema.tools).toEqual([{ type: 'custom', id: 'tool-keep' }]);
			// description column on the entity also stays untouched.
			expect(savedEntity.description).toBe(agent.description);
		});

		it('rejects an active schedule integration when the agent is unpublished', async () => {
			const configWithActiveSchedule = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				integrations: [
					{
						type: 'schedule',
						active: true,
						cronExpression: '0 9 * * *',
						wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
					},
				],
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithActiveSchedule,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ publishedVersion: null }));

			await expect(
				service.updateConfig(agentId, projectId, configWithActiveSchedule),
			).rejects.toThrow(
				'Invalid agent config: schedule integration cannot be active until the agent is published',
			);
			expect(agentRepository.save).not.toHaveBeenCalled();
		});

		it('allows an inactive schedule integration on an unpublished agent', async () => {
			const configWithInactiveSchedule = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				integrations: [
					{
						type: 'schedule',
						active: false,
						cronExpression: '0 9 * * *',
						wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
					},
				],
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithInactiveSchedule,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ publishedVersion: null }));

			await expect(
				service.updateConfig(agentId, projectId, configWithInactiveSchedule),
			).resolves.toBeDefined();
		});
	});

	describe('publishAgent', () => {
		let mockTrx: { save: jest.Mock };
		let mockTransaction: jest.Mock;

		beforeEach(() => {
			mockTrx = { save: jest.fn() };
			mockTransaction = jest.fn(
				async (cb: (trx: typeof mockTrx) => Promise<void>) => await cb(mockTrx),
			);
			Object.defineProperty(agentRepository, 'manager', {
				value: { transaction: mockTransaction },
				configurable: true,
			});
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.publishAgent(agentId, projectId, userId)).rejects.toThrow(NotFoundError);
		});

		it('calls savePublishedVersion with the correct payload including publishedFromVersionId', async () => {
			const agent = makeAgent({ versionId });
			const publishedVersion = makePublishedVersion();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(publishedVersion);

			await service.publishAgent(agentId, projectId, userId);

			expect(agentPublishedVersionRepository.savePublishedVersion).toHaveBeenCalledWith(
				{
					agentId: agent.id,
					schema: agent.schema,
					tools: null,
					skills: null,
					publishedFromVersionId: versionId,
					model: agent.model,
					provider: agent.provider,
					credentialId: agent.credentialId,
					publishedById: userId,
				},
				mockTrx,
			);
		});

		it('snapshots attached skill bodies when publishing', async () => {
			const skill = {
				name: 'Summarize Notes',
				description: 'Use when summarizing notes',
				instructions: 'Extract decisions and action items.',
			};
			const agent = makeAgent({
				schema: {
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Be helpful',
					skills: [{ type: 'skill', id: 'summarize_notes' }],
				},
				skills: {
					summarize_notes: skill,
					unattached: {
						name: 'Unattached',
						description: 'Use when unattached',
						instructions: 'Do not snapshot.',
					},
				},
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(
				makePublishedVersion(),
			);

			await service.publishAgent(agentId, projectId, userId);

			expect(agentPublishedVersionRepository.savePublishedVersion).toHaveBeenCalledWith(
				expect.objectContaining({
					skills: {
						summarize_notes: skill,
					},
				}),
				mockTrx,
			);
		});

		it('rejects publishing when a configured skill body is missing', async () => {
			const agent = makeAgent({
				schema: {
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Be helpful',
					skills: [{ type: 'skill', id: 'missing_skill' }],
				},
				skills: {},
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await expect(service.publishAgent(agentId, projectId, userId)).rejects.toThrow(
				'Cannot publish agent with missing skill bodies: missing_skill',
			);
		});

		it('assigns a new versionId and persists it when the agent has none', async () => {
			const agent = makeAgent({ versionId: null });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(
				makePublishedVersion(),
			);

			await service.publishAgent(agentId, projectId, userId);

			expect(agent.versionId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
			expect(mockTrx.save).toHaveBeenCalledWith(agent);
		});

		it('returns the agent with publishedVersion set to the saved snapshot', async () => {
			const agent = makeAgent();
			const publishedVersion = makePublishedVersion();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(publishedVersion);

			const result = await service.publishAgent(agentId, projectId, userId);

			expect(result.publishedVersion).toBe(publishedVersion);
			expect(result).toBe(agent);
		});

		it('connects persisted credential integrations after publishing', async () => {
			const integrations: AgentIntegration[] = [
				{ type: 'slack', credentialId: 'cred-1', credentialName: 'Acme Slack' },
				{
					type: 'schedule',
					active: false,
					cronExpression: '0 9 * * *',
					wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
				},
			];
			const agent = makeAgent({ integrations });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(
				makePublishedVersion(),
			);

			const chatIntegrationService = mock<ChatIntegrationService>();
			chatIntegrationService.syncToConfig.mockResolvedValue(undefined);
			Container.set(ChatIntegrationService, chatIntegrationService);

			await service.publishAgent(agentId, projectId, userId);

			expect(chatIntegrationService.syncToConfig).toHaveBeenCalledWith(
				agent,
				[],
				[{ type: 'slack', credentialId: 'cred-1', credentialName: 'Acme Slack' }],
			);
		});

		it('does not call syncToConfig when no credential integrations are persisted', async () => {
			const agent = makeAgent({
				integrations: [
					{
						type: 'schedule',
						active: false,
						cronExpression: '0 9 * * *',
						wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
					},
				],
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPublishedVersionRepository.savePublishedVersion.mockResolvedValue(
				makePublishedVersion(),
			);

			const chatIntegrationService = mock<ChatIntegrationService>();
			chatIntegrationService.syncToConfig.mockResolvedValue(undefined);
			Container.set(ChatIntegrationService, chatIntegrationService);

			await service.publishAgent(agentId, projectId, userId);

			expect(chatIntegrationService.syncToConfig).not.toHaveBeenCalled();
		});
	});

	describe('executeForChatPublished', () => {
		it('reconstructs from the published skill snapshot instead of the draft skill body', async () => {
			const publishedSkill = {
				name: 'Summarize Notes',
				description: 'Use when summarizing notes',
				instructions: 'Published instructions.',
			};
			const draftSkill = {
				...publishedSkill,
				instructions: 'Draft instructions.',
			};
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				skills: [{ type: 'skill', id: 'summarize_notes' }],
			};
			const agent = makeAgent({
				schema,
				skills: { summarize_notes: draftSkill },
				publishedVersion: makePublishedVersion({
					schema,
					skills: { summarize_notes: publishedSkill },
					publishedById: userId,
				}),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			jest.spyOn(service as never, 'createCredentialProvider').mockReturnValue(mock());
			const reconstructSpy = jest
				.spyOn(service as never, 'reconstructFromConfig')
				.mockResolvedValue({ agent: {}, toolRegistry: {} } as never);
			jest
				.spyOn(service as never, 'streamChatResponse')
				.mockImplementation(async function* () {} as never);

			await service
				.executeForChatPublished({
					agentId,
					projectId,
					message: 'hello',
					memory: { threadId: 'thread-1', resourceId: 'platform-user-1' },
				})
				.next();

			expect(reconstructSpy.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					skills: { summarize_notes: publishedSkill },
				}),
			);
		});

		it('passes resourceId (not n8n userId) to streamChatResponse', async () => {
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			};
			const n8nPublisherId = 'n8n-user-publisher';
			const chatUserId = 'slack-user-abc';
			const agent = makeAgent({
				schema,
				publishedVersion: makePublishedVersion({ schema, publishedById: n8nPublisherId }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			jest.spyOn(service as never, 'createCredentialProvider').mockReturnValue(mock());
			jest
				.spyOn(service as never, 'reconstructFromConfig')
				.mockResolvedValue({ agent: {}, toolRegistry: {} } as never);
			const streamSpy = jest
				.spyOn(service as never, 'streamChatResponse')
				.mockImplementation(async function* () {} as never);

			await service
				.executeForChatPublished({
					agentId,
					projectId,
					message: 'hello',
					memory: { threadId: 'thread-1', resourceId: chatUserId },
				})
				.next();

			const streamConfig = (streamSpy.mock.calls[0] as [{ memory: { resourceId: string } }])[0];
			expect(streamConfig.memory.resourceId).toBe(chatUserId);
			expect(streamConfig.memory.resourceId).not.toBe(n8nPublisherId);
		});
	});

	describe('unpublishAgent', () => {
		let mockTrx: { save: jest.Mock };
		let mockTransaction: jest.Mock;

		beforeEach(() => {
			mockTrx = { save: jest.fn() };
			mockTransaction = jest.fn(
				async (cb: (trx: typeof mockTrx) => Promise<void>) => await cb(mockTrx),
			);
			Object.defineProperty(agentRepository, 'manager', {
				value: { transaction: mockTransaction },
				configurable: true,
			});
			// unpublishAgent lazy-imports ChatIntegrationService and calls disconnect via the
			// DI container — register a mock so Container.get doesn't try to construct the real
			// service (which would fail resolving DataSource in unit tests).
			Container.set(ChatIntegrationService, mock<ChatIntegrationService>());
			Container.set(AgentScheduleService, scheduleService);
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.unpublishAgent(agentId, projectId)).rejects.toThrow(NotFoundError);
		});

		it('deletes the published version row and clears publishedVersion on the entity', async () => {
			const agent = makeAgent({ publishedVersion: makePublishedVersion() });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.unpublishAgent(agentId, projectId);

			expect(agentPublishedVersionRepository.deleteByAgentId).toHaveBeenCalledWith(
				agentId,
				mockTrx,
			);
			expect(agent.publishedVersion).toBeNull();
		});

		it('deactivates the persisted schedule and stops the local cron job when unpublishing', async () => {
			const integrations: AgentIntegration[] = [
				{
					type: 'schedule',
					active: true,
					cronExpression: '* * * * *',
					wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
				},
			];
			const agent = makeAgent({
				publishedVersion: makePublishedVersion(),
				integrations,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.unpublishAgent(agentId, projectId);

			expect(mockTrx.save).toHaveBeenCalledWith(
				expect.objectContaining({
					integrations: [
						expect.objectContaining({
							type: 'schedule',
							active: false,
						}),
					],
				}),
			);
			expect(scheduleService.deregister).toHaveBeenCalledWith(agentId);
		});

		it('returns the agent with publishedVersion cleared', async () => {
			const agent = makeAgent({ publishedVersion: makePublishedVersion() });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.unpublishAgent(agentId, projectId);

			expect(result.publishedVersion).toBeNull();
			expect(result).toBe(agent);
		});
	});

	describe('revertToPublishedAgent', () => {
		let mockTrx: { save: jest.Mock };
		let mockTransaction: jest.Mock;

		beforeEach(() => {
			mockTrx = { save: jest.fn() };
			mockTransaction = jest.fn(
				async (cb: (trx: typeof mockTrx) => Promise<void>) => await cb(mockTrx),
			);
			Object.defineProperty(agentRepository, 'manager', {
				value: { transaction: mockTransaction },
				configurable: true,
			});
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.revertToPublishedAgent(agentId, projectId)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('throws ConflictError when the agent is not published', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ publishedVersion: null }));

			await expect(service.revertToPublishedAgent(agentId, projectId)).rejects.toThrow(
				ConflictError,
			);
		});

		it('restores the draft fields from the published snapshot', async () => {
			const publishedSchema: AgentJsonConfig = {
				name: 'Published Agent',
				description: 'Published description',
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'cred-published',
				instructions: 'Published instructions',
				tools: [{ type: 'custom', id: 'published_tool' }],
				skills: [{ type: 'skill', id: 'published_skill' }],
			};
			const publishedTools = {
				published_tool: {
					code: 'return "published";',
					descriptor: { name: 'published_tool' },
				},
			} as unknown as Agent['tools'];
			const publishedSkills = {
				published_skill: {
					name: 'Published skill',
					description: 'Published skill description',
					instructions: 'Published skill instructions',
				},
			};
			const publishedVersion = makePublishedVersion({
				schema: publishedSchema,
				tools: publishedTools,
				skills: publishedSkills,
				model: 'anthropic/claude-sonnet-4-5',
				provider: 'anthropic',
				credentialId: 'cred-published',
				publishedFromVersionId: 'published-version-id',
			});
			const agent = makeAgent({
				name: 'Draft Agent',
				description: 'Draft description',
				versionId: 'draft-version-id',
				schema: {
					name: 'Draft Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Draft instructions',
				},
				tools: {},
				skills: {},
				publishedVersion,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.revertToPublishedAgent(agentId, projectId);

			expect(agent.schema).toEqual(publishedSchema);
			expect(agent.schema).not.toBe(publishedSchema);
			expect(agent.tools).toEqual(publishedTools);
			expect(agent.skills).toEqual(publishedSkills);
			expect(agent.model).toBe('anthropic/claude-sonnet-4-5');
			expect(agent.provider).toBe('anthropic');
			expect(agent.credentialId).toBe('cred-published');
			expect(agent.versionId).toBe('published-version-id');
			expect(agent.name).toBe('Published Agent');
			expect(agent.description).toBe('Published description');
			expect(mockTrx.save).toHaveBeenCalledWith(agent);
			expect(result).toBe(agent);
			expect(result.publishedVersion).toBe(publishedVersion);
		});
	});

	describe('getTestChatMessages', () => {
		it('derives user-scoped fallback test-chat thread ids', () => {
			expect(chatThreadId(agentId, 'user-1')).toBe('test-agent-1:user-1');
			expect(chatThreadId(agentId, 'user-2')).toBe('test-agent-1:user-2');
			expect(chatThreadId(agentId, 'user-1')).not.toBe(chatThreadId(agentId, 'user-2'));
		});

		it('scopes the memory lookup to the caller via resourceId', async () => {
			n8nMemory.getMessages.mockResolvedValue([]);

			await service.getTestChatMessages(agentId, userId);

			expect(n8nMemory.getMessages).toHaveBeenCalledWith(chatThreadId(agentId, userId), {
				resourceId: userId,
			});
		});

		it('returns whatever memory returns for this user', async () => {
			const persisted = [{ id: 'm1' }, { id: 'm2' }];
			n8nMemory.getMessages.mockResolvedValue(persisted as never);

			const result = await service.getTestChatMessages(agentId, userId);

			expect(result).toBe(persisted);
		});
	});

	describe('clearTestChatMessages', () => {
		it('deletes only the caller’s messages on their test-chat thread', async () => {
			await service.clearTestChatMessages(agentId, userId);

			expect(n8nMemory.deleteMessagesByThread).toHaveBeenCalledWith(
				chatThreadId(agentId, userId),
				userId,
			);
			expect(n8nMemory.deleteThread).not.toHaveBeenCalled();
		});
	});

	describe('clearAllTestChatMessages', () => {
		it('deletes every message and the thread row itself', async () => {
			await service.clearAllTestChatMessages(agentId);

			expect(n8nMemory.deleteThreadsByPrefix).toHaveBeenCalledWith(chatThreadId(agentId));
			expect(n8nMemory.deleteMessagesByThread).toHaveBeenCalledWith(chatThreadId(agentId));
			// Second arg must be absent — undefined means "all users".
			expect(n8nMemory.deleteMessagesByThread.mock.calls[0]).toHaveLength(1);
			expect(n8nMemory.deleteThread).toHaveBeenCalledWith(chatThreadId(agentId));
		});
	});

	describe('listChatIntegrations', () => {
		class TestIntegration extends AgentChatIntegration {
			readonly type = 'test-platform';
			readonly credentialTypes = ['testApi'];
			readonly displayLabel = 'Test Platform';
			readonly displayIcon = 'circle';
			async createAdapter(_ctx: AgentChatIntegrationContext): Promise<unknown> {
				return {};
			}
		}

		it('returns one descriptor per registered integration', () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new TestIntegration());
			Container.set(ChatIntegrationRegistry, registry);

			const result = service.listChatIntegrations();

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				type: 'test-platform',
				label: 'Test Platform',
				icon: 'circle',
				credentialTypes: ['testApi'],
			});
		});

		it('returns an empty array when no integrations are registered', () => {
			const registry = new ChatIntegrationRegistry();
			Container.set(ChatIntegrationRegistry, registry);

			expect(service.listChatIntegrations()).toEqual([]);
		});

		afterEach(() => {
			Container.reset();
		});
	});

	describe('validateAgentIsRunnable', () => {
		const credentialProvider = mock<{ list: jest.Mock }>({
			list: jest.fn().mockResolvedValue([]),
		});

		beforeEach(() => {
			credentialProvider.list.mockResolvedValue([]);
		});

		it('flags config skill refs that have no stored body', async () => {
			const agent = makeAgent({
				schema: {
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Do stuff',
					skills: [
						{ type: 'skill', id: 'present_skill' },
						{ type: 'skill', id: 'missing_skill' },
					],
				} as unknown as AgentJsonConfig,
				skills: {
					present_skill: {
						name: 'Present',
						description: 'Use when present',
						instructions: 'do',
					},
				},
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.validateAgentIsRunnable(
				agentId,
				projectId,
				credentialProvider as unknown as Parameters<typeof service.validateAgentIsRunnable>[2],
			);

			expect(result.missing).toContain('skill:missing_skill');
			expect(result.missing).not.toContain('skill:present_skill');
		});

		it('does not flag skill refs when every id has a stored body', async () => {
			const agent = makeAgent({
				schema: {
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Do stuff',
					skills: [{ type: 'skill', id: 'present_skill' }],
				} as unknown as AgentJsonConfig,
				skills: {
					present_skill: {
						name: 'Present',
						description: 'Use when present',
						instructions: 'do',
					},
				},
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.validateAgentIsRunnable(
				agentId,
				projectId,
				credentialProvider as unknown as Parameters<typeof service.validateAgentIsRunnable>[2],
			);

			expect(result.missing.filter((m) => m.startsWith('skill:'))).toEqual([]);
		});
	});

	describe('resumeForChat', () => {
		it('does not use n8n userId as resourceId — resume passes no resourceId to agentInstance.resume', async () => {
			const n8nPublisherId = 'n8n-user-publisher';
			const runId = 'run-abc';
			const toolCallId = 'tool-xyz';
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			};
			const agent = makeAgent({
				schema,
				publishedVersion: makePublishedVersion({ schema, publishedById: n8nPublisherId }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			// Configure the named checkpoint storage mock injected in beforeEach
			n8nCheckpointStorage.getStatus.mockResolvedValue({
				status: 'ok',
				checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
			} as never);

			const mockAgentInstance = {
				name: 'Test Agent',
				resume: jest.fn().mockResolvedValue({
					stream: {
						getReader: () => ({
							read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
							releaseLock: jest.fn(),
						}),
					},
				}),
			};

			jest.spyOn(service as never, 'createCredentialProvider').mockReturnValue(mock());
			jest
				.spyOn(service as never, 'reconstructFromConfig')
				.mockResolvedValue({ agent: mockAgentInstance, toolRegistry: {} } as never);

			await service
				.resumeForChat({ agentId, projectId, runId, toolCallId, resumeData: { value: 'yes' } })
				.next();

			// resume() takes runId and toolCallId — no resourceId or userId is passed
			expect(mockAgentInstance.resume).toHaveBeenCalledWith(
				'stream',
				{ value: 'yes' },
				{ runId, toolCallId },
			);
			// The n8n publisher ID must not appear in the resume args
			const resumeArgs = mockAgentInstance.resume.mock.calls[0];
			expect(JSON.stringify(resumeArgs)).not.toContain(n8nPublisherId);
		});
	});

	describe('delete — chat cleanup', () => {
		beforeEach(() => {
			Container.set(AgentScheduleService, scheduleService);
		});

		it('removes the test-chat thread + messages after removing the agent', async () => {
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.delete(agentId, projectId);

			expect(agentRepository.remove).toHaveBeenCalledWith(agent);
			expect(n8nMemory.deleteThreadsByPrefix).toHaveBeenCalledWith(chatThreadId(agentId));
			expect(n8nMemory.deleteMessagesByThread).toHaveBeenCalledWith(chatThreadId(agentId));
			expect(n8nMemory.deleteThread).toHaveBeenCalledWith(chatThreadId(agentId));
		});

		it('stops the local schedule when deleting the agent', async () => {
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.delete(agentId, projectId);

			expect(scheduleService.deregister).toHaveBeenCalledWith(agentId);
		});

		it('still returns true when chat cleanup fails — agent removal is the primary intent', async () => {
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			n8nMemory.deleteThreadsByPrefix.mockRejectedValueOnce(new Error('db down'));

			await expect(service.delete(agentId, projectId)).resolves.toBe(true);
		});
	});

	describe('runtime cache invalidation across mains', () => {
		beforeEach(() => {
			const mockTrx = { save: jest.fn() };
			Object.defineProperty(agentRepository, 'manager', {
				value: {
					transaction: jest.fn(
						async (cb: (trx: typeof mockTrx) => Promise<void>) => await cb(mockTrx),
					),
				},
				configurable: true,
			});
			Container.set(ChatIntegrationService, mock<ChatIntegrationService>());
			Container.set(AgentScheduleService, scheduleService);
		});

		const enableMultiMain = () => {
			Object.defineProperty(globalConfig, 'multiMainSetup', {
				value: { enabled: true },
				configurable: true,
			});
		};

		it('publishes agent-config-changed when a mutation clears the runtime cache in multi-main mode', async () => {
			enableMultiMain();

			const agent = makeAgent({ publishedVersion: makePublishedVersion() });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.unpublishAgent(agentId, projectId);

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'agent-config-changed',
				payload: { agentId },
			});
		});

		it('does not broadcast when multi-main is disabled', async () => {
			const agent = makeAgent({ publishedVersion: makePublishedVersion() });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.unpublishAgent(agentId, projectId);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('handleAgentConfigChanged clears the local cache without re-publishing — no broadcast loop', () => {
			enableMultiMain();

			service.handleAgentConfigChanged({ agentId });

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('swallows publisher failures so the user-facing mutation keeps succeeding', async () => {
			enableMultiMain();
			publisher.publishCommand.mockRejectedValueOnce(new Error('redis is down'));

			const agent = makeAgent({ publishedVersion: makePublishedVersion() });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await expect(service.unpublishAgent(agentId, projectId)).resolves.toBeDefined();
		});
	});
});
