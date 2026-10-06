import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import type { AgentIntegrationConfig, AgentJsonConfig } from '@n8n/api-types';
import { createTeamProject, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, type User, type WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { AgentConfigService } from '@/modules/agents/agent-config.service';
import type { AgentSaveCompletionService } from '@/modules/agents/agent-save-completion.service';
import type { AgentSetupCompletionService } from '@/modules/agents/agent-setup-completion.service';
import type { AgentSkillsService } from '@/modules/agents/agent-skills.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { composeJsonConfig } from '@/modules/agents/json-config/agent-config-composition';
import type { NodeToolAiGatewayService } from '@/modules/agents/json-config/node-tool-ai-gateway.service';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { getAgentConfigHash } from '@/modules/agents/utils/agent-config-hash';
import { saveAgentDraftFenced } from '@/modules/agents/utils/agent-draft.utils';

describe('AgentRepository', () => {
	let agentRepo: AgentRepository;
	let agentHistoryRepo: AgentHistoryRepository;
	let taskRepo: AgentTaskRepository;
	let transactionRunner: TransactionRunner;
	let projectId: string;

	async function createAgent(overrides: Partial<Agent> = {}): Promise<Agent> {
		const agent = agentRepo.create({
			id: uuid(),
			name: 'Test Agent',
			projectId,
			schema: { name: 'Test Agent', model: 'm', instructions: 'i' },
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'version-1',
			activeVersionId: null,
			...overrides,
		} as Partial<Agent>);
		return await agentRepo.save(agent);
	}

	async function createHistory(agentId: string, versionId: string) {
		await agentHistoryRepo.insert({
			versionId,
			agentId,
			author: 'test',
			schema: null,
			tools: null,
			skills: null,
		});
	}

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		agentRepo = Container.get(AgentRepository);
		agentHistoryRepo = Container.get(AgentHistoryRepository);
		taskRepo = Container.get(AgentTaskRepository);
		transactionRunner = Container.get(TransactionRunner);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		projectId = project.id;
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await agentHistoryRepo.delete({});
		await agentRepo.delete({});
	});

	describe('draft definition writes', () => {
		const taskBody = {
			name: 'Daily task',
			objective: 'Summarize notes',
			cronExpression: '0 9 * * *',
			timezone: null,
		};

		it('rolls back a config save when task cleanup fails and can retry the complete write', async () => {
			const schema: AgentJsonConfig = {
				name: 'Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help users',
				tasks: [{ type: 'task', id: 'task-remove', enabled: false }],
			};
			const agent = await createAgent({ schema });
			await taskRepo.insert({ id: 'task-remove', agentId: agent.id, ...taskBody });
			const credentials = mock<CredentialsService>();
			credentials.findAllCredentialIdsForProject.mockResolvedValue([]);
			credentials.findAllGlobalCredentialIds.mockResolvedValue([]);
			credentials.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
			const setup = mock<AgentSetupCompletionService>();
			setup.recordIfSetupComplete.mockResolvedValue(null);
			const completion = mock<AgentSaveCompletionService>();
			const service = new AgentConfigService(
				mockLogger(),
				agentRepo,
				taskRepo,
				mock<AgentSkillsService>(),
				credentials,
				mock<WorkflowRepository>(),
				mock<NodeToolAiGatewayService>(),
				setup,
				transactionRunner,
				completion,
			);
			const deleteTasks = taskRepo.deleteForAgent.bind(taskRepo);
			vi.spyOn(taskRepo, 'deleteForAgent').mockImplementationOnce(async (id, ids, ctx) => {
				await deleteTasks(id, ids, ctx);
				throw new Error('Task cleanup failed');
			});
			const config = { ...schema, name: 'Updated agent', tasks: [] };
			const options = {
				baseConfigHash: getAgentConfigHash(composeJsonConfig(agent)),
				modifiedBy: 'user',
			} as const;
			await expect(
				service.updateConfig(agent.id, projectId, config, mock<User>(), options),
			).rejects.toThrow('Task cleanup failed');
			expect(await agentRepo.findById(agent.id)).toMatchObject({
				schema,
				revision: agent.revision,
			});
			expect(await taskRepo.findByAgentId(agent.id)).toMatchObject([{ id: 'task-remove' }]);
			expect(completion.configurationSaved).not.toHaveBeenCalled();

			const saved = await service.updateConfig(agent.id, projectId, config, mock<User>(), options);
			expect(saved.config).toMatchObject({ name: 'Updated agent', tasks: [] });
			expect(await agentRepo.findById(agent.id)).toMatchObject({
				schema: { name: 'Updated agent', tasks: [] },
			});
			expect(await taskRepo.findByAgentId(agent.id)).toEqual([]);
			expect(completion.configurationSaved).toHaveBeenCalled();
		});

		it('restores task bodies without resetting creation time and detects unchanged content', async () => {
			const agent = await createAgent();
			const createdAt = new Date('2025-01-01T00:00:00.000Z');
			await taskRepo.insert([
				{ id: 'task-keep', agentId: agent.id, ...taskBody, createdAt },
				{ id: 'task-remove', agentId: agent.id, ...taskBody },
			]);
			const definitions = new Map([
				['task-keep', { ...taskBody, objective: 'Restored objective' }],
				['task-new', taskBody],
			]);
			const restore = async () =>
				await transactionRunner.run({}, async (ctx) => {
					await saveAgentDraftFenced(agentRepo, agent, ctx);
					return await taskRepo.replaceForAgent(agent.id, definitions, ctx);
				});
			expect(await restore()).toBe(true);
			const tasks = await taskRepo.findByAgentId(agent.id);
			expect(tasks).toHaveLength(2);
			expect(tasks).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: 'task-keep', objective: 'Restored objective', createdAt }),
					expect.objectContaining({ id: 'task-new', objective: taskBody.objective }),
				]),
			);
			expect(await restore()).toBe(false);
		});

		it('rolls back draft and task changes when a restored task ID belongs to another agent', async () => {
			const agent = await createAgent();
			const other = await createAgent();
			await taskRepo.insert([
				{ id: 'own-task', agentId: agent.id, ...taskBody },
				{ id: 'other-task', agentId: other.id, ...taskBody },
			]);
			const originalName = agent.name;
			const originalRevision = agent.revision;
			agent.name = 'Restored agent';
			await expect(
				transactionRunner.run({}, async (ctx) => {
					await saveAgentDraftFenced(agentRepo, agent, ctx);
					await taskRepo.replaceForAgent(agent.id, new Map([['other-task', taskBody]]), ctx);
				}),
			).rejects.toThrow();
			expect(await agentRepo.findById(agent.id)).toMatchObject({
				name: originalName,
				revision: originalRevision,
			});
			expect(await taskRepo.findByAgentId(agent.id)).toMatchObject([{ id: 'own-task' }]);
			expect(await taskRepo.findByAgentId(other.id)).toMatchObject([
				{ id: 'other-task', ...taskBody },
			]);
		});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('published n8n Chat availability', () => {
		it('uses the active version instead of the mutable draft switch', async () => {
			const agent = await createAgent();
			expect(agent.integrations).toEqual([]);
			expect(await agentRepo.isN8nChatPublished(agent.id, projectId)).toBe(false);
			const firstVersion = uuid();
			await agentHistoryRepo.saveVersion({
				versionId: firstVersion,
				agentId: agent.id,
				schema: agent.schema
					? { ...agent.schema, integrations: [{ type: 'n8n_chat', credentialId: '' }] }
					: null,
				tools: {},
				skills: {},
				publishedBy: 'test',
			});
			await agentRepo.update({ id: agent.id }, { activeVersionId: firstVersion });
			expect(await agentRepo.isN8nChatPublished(agent.id, projectId)).toBe(true);
			await agentRepo.update({ id: agent.id }, { integrations: [] });
			expect(await agentRepo.isN8nChatPublished(agent.id, projectId)).toBe(true);

			const secondVersion = uuid();
			await agentHistoryRepo.saveVersion({
				versionId: secondVersion,
				agentId: agent.id,
				schema: agent.schema,
				tools: {},
				skills: {},
				publishedBy: 'test',
			});
			await agentRepo.update({ id: agent.id }, { activeVersionId: secondVersion });
			expect(await agentRepo.isN8nChatPublished(agent.id, projectId)).toBe(false);
			await agentRepo.update({ id: agent.id }, { activeVersionId: firstVersion });
			expect(await agentRepo.isN8nChatPublished(agent.id, projectId)).toBe(true);
			await agentRepo.update({ id: agent.id }, { activeVersionId: null });
			expect(await agentRepo.isN8nChatPublished(agent.id, projectId)).toBe(false);
			expect(await agentRepo.isN8nChatPublished(agent.id, uuid())).toBe(false);
			await agentRepo.delete({ id: agent.id });
			expect(await agentRepo.isN8nChatPublished(agent.id, projectId)).toBe(false);
		});
	});

	describe('saveDraftFenced', () => {
		it('persists draft columns and bumps revision when the fence is won', async () => {
			const agent = await createAgent();

			agent.name = 'Renamed Agent';
			agent.schema = { name: 'Renamed Agent', model: 'm2', instructions: 'i2' };
			const won = await agentRepo.saveDraftFenced(agent);

			expect(won).toBe(true);
			expect(agent.revision).toBe(1);

			const row = await agentRepo.findById(agent.id);
			expect(row?.name).toBe('Renamed Agent');
			expect(row?.schema?.model).toBe('m2');
			expect(row?.revision).toBe(1);
		});

		it('cannot roll back a publish that won between load and save', async () => {
			const agent = await createAgent();
			const publishedVersionId = uuid();
			await createHistory(agent.id, publishedVersionId);

			// The stale writer loads the row first.
			const stale = await agentRepo.findById(agent.id);
			expect(stale).not.toBeNull();

			// A concurrent publish wins the fence: sets the active pointer and
			// bumps revision.
			const publishWon = await agentRepo.setActiveVersionFenced(agent.id, agent.revision, {
				activeVersionId: publishedVersionId,
				versionId: publishedVersionId,
			});
			expect(publishWon).toBe(true);

			// The stale draft save must lose instead of writing its
			// pre-publish column values over the row.
			stale!.schema = { name: 'Stale Edit', model: 'm', instructions: 'i' };
			const draftWon = await agentRepo.saveDraftFenced(stale!);

			expect(draftWon).toBe(false);
			const row = await agentRepo.findById(agent.id);
			expect(row?.activeVersionId).toBe(publishedVersionId);
			expect(row?.versionId).toBe(publishedVersionId);
			expect(row?.schema?.name).toBe('Test Agent');
		});

		it('never writes the active version pointer, even when it wins', async () => {
			const agent = await createAgent();
			const publishedVersionId = uuid();
			await createHistory(agent.id, publishedVersionId);
			await agentRepo.setActiveVersionFenced(agent.id, agent.revision, {
				activeVersionId: publishedVersionId,
				versionId: publishedVersionId,
			});

			// Fresh load sees the published state; a draft edit on top of it
			// must start a new draft without touching the active pointer.
			const fresh = await agentRepo.findById(agent.id);
			fresh!.schema = { name: 'Draft Edit', model: 'm', instructions: 'i' };
			fresh!.versionId = uuid();
			const won = await agentRepo.saveDraftFenced(fresh!);

			expect(won).toBe(true);
			const row = await agentRepo.findById(agent.id);
			expect(row?.activeVersionId).toBe(publishedVersionId);
			expect(row?.versionId).toBe(fresh!.versionId);
			expect(row?.schema?.name).toBe('Draft Edit');
		});

		it('lets a publish lose to a draft edit that won in between', async () => {
			const agent = await createAgent();
			const expectedAtLoad = agent.revision;

			agent.schema = { name: 'Concurrent Edit', model: 'm', instructions: 'i' };
			await agentRepo.saveDraftFenced(agent);

			const publishedVersionId = uuid();
			await createHistory(agent.id, publishedVersionId);
			const publishWon = await agentRepo.setActiveVersionFenced(agent.id, expectedAtLoad, {
				activeVersionId: publishedVersionId,
				versionId: publishedVersionId,
			});

			expect(publishWon).toBe(false);
			const row = await agentRepo.findById(agent.id);
			expect(row?.activeVersionId).toBeNull();
			expect(row?.schema?.name).toBe('Concurrent Edit');
		});
	});

	describe('findIntegrationState', () => {
		it('reads the columns an integration mutation needs', async () => {
			const agent = await createAgent({
				integrations: [{ type: 'slack', credentialId: 'slack-1' }],
				versionId: 'version-1',
				activeVersionId: null,
			});

			await expect(agentRepo.findIntegrationState(agent.id)).resolves.toEqual({
				integrations: [{ type: 'slack', credentialId: 'slack-1' }],
				versionId: 'version-1',
				activeVersionId: null,
			});
		});

		it('returns null for an agent that no longer exists', async () => {
			await expect(agentRepo.findIntegrationState(uuid())).resolves.toBeNull();
		});
	});

	describe('updateIntegrations', () => {
		it('writes the integration columns and leaves everything else alone', async () => {
			const agent = await createAgent({
				name: 'Original name',
				schema: { name: 'Original name', model: 'anthropic/claude-sonnet-4-5', instructions: 'Hi' },
				versionId: 'version-1',
			});

			const written = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: 'version-1', activeVersionId: null },
				'version-2',
			);

			expect(written).toBe(true);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.integrations).toEqual([{ type: 'slack', credentialId: 'slack-1' }]);
			expect(reloaded?.versionId).toBe('version-2');
			expect(reloaded?.name).toBe('Original name');
			expect(reloaded?.schema).toEqual(agent.schema);
		});

		it('refuses the write when a publication landed after the read', async () => {
			const agent = await createAgent({ versionId: 'version-1', activeVersionId: null });
			// A concurrent publish claims the current draft as the live version.
			await agentHistoryRepo.saveVersion({
				versionId: 'version-1',
				agentId: agent.id,
				schema: agent.schema,
				tools: null,
				skills: null,
				publishedBy: 'Someone Else',
			});
			await agentRepo.update({ id: agent.id }, { activeVersionId: 'version-1' });

			const written = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: 'version-1', activeVersionId: null },
				'version-2',
			);

			// The publish is untouched and the caller is told to re-read, so it cannot
			// act on stale publication state.
			expect(written).toBe(false);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.activeVersionId).toBe('version-1');
			expect(reloaded?.integrations).toEqual([]);

			// Reapplied against the state that is actually there, it lands.
			await expect(
				agentRepo.updateIntegrations(
					agent.id,
					[{ type: 'slack', credentialId: 'slack-1' }],
					{ versionId: 'version-1', activeVersionId: 'version-1' },
					'version-2',
				),
			).resolves.toBe(true);
			expect((await agentRepo.findById(agent.id))?.activeVersionId).toBe('version-1');
		});

		it('refuses the write when another writer moved the version on', async () => {
			const agent = await createAgent({ versionId: 'version-1' });
			await agentRepo.update({ id: agent.id }, { versionId: 'version-9' });

			const written = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: 'version-1', activeVersionId: null },
				'version-2',
			);

			expect(written).toBe(false);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.integrations).toEqual([]);
			expect(reloaded?.versionId).toBe('version-9');
		});

		it('matches a null version, so a never-published draft can still be updated', async () => {
			const agent = await createAgent({ versionId: null });

			const written = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: null, activeVersionId: null },
				null,
			);

			expect(written).toBe(true);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.integrations).toEqual([{ type: 'slack', credentialId: 'slack-1' }]);
			expect(reloaded?.versionId).toBeNull();
		});

		it('refuses the write when a null version was set in the meantime', async () => {
			const agent = await createAgent({ versionId: 'version-1' });

			const written = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: null, activeVersionId: null },
				null,
			);

			expect(written).toBe(false);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.integrations).toEqual([]);
			expect(reloaded?.versionId).toBe('version-1');
		});

		it('serialises two writers that read the same version', async () => {
			const agent = await createAgent({ versionId: 'version-1' });

			// Both read version-1 and both project onto the empty array they saw.
			const first = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: 'version-1', activeVersionId: null },
				'version-2',
			);
			const second = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'linear', credentialId: 'linear-1' }],
				{ versionId: 'version-1', activeVersionId: null },
				'version-3',
			);

			expect(first).toBe(true);
			// The loser is told, so it can re-read and reapply instead of clobbering.
			expect(second).toBe(false);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.integrations).toEqual([{ type: 'slack', credentialId: 'slack-1' }]);
		});

		it('reports no write for an agent that no longer exists', async () => {
			await expect(
				agentRepo.updateIntegrations(
					uuid(),
					[],
					{ versionId: 'version-1', activeVersionId: null },
					'version-2',
				),
			).resolves.toBe(false);
		});
	});

	describe('findPublishedIds', () => {
		/** An agent with a published version, so it owns scheduled jobs. */
		async function createPublishedAgent(): Promise<Agent> {
			const versionId = uuid();
			const agent = await createAgent();
			await createHistory(agent.id, versionId);
			await agentRepo.update({ id: agent.id }, { activeVersionId: versionId });
			return agent;
		}

		it('keeps the agents that have a published version and drops the drafts', async () => {
			const published = await createPublishedAgent();
			const draft = await createAgent();

			const ids = await agentRepo.findPublishedIds([published.id, draft.id]);

			expect(ids).toEqual(new Set([published.id]));
		});

		it('drops an id that belongs to no agent', async () => {
			const published = await createPublishedAgent();

			const ids = await agentRepo.findPublishedIds([published.id, uuid()]);

			expect(ids).toEqual(new Set([published.id]));
		});

		it('answers an empty list without a query', async () => {
			await createPublishedAgent();

			await expect(agentRepo.findPublishedIds([])).resolves.toEqual(new Set());
		});
	});

	describe('findByProjectIdsPaginated - availableInChat filter', () => {
		// Reachability lives in the **published** snapshot, not the draft column:
		// AGENT-963 writes the channel into `agent_history.schema.integrations` on
		// publish, so a draft edit does not move what production chat serves.
		// Nothing writes it on this branch yet, so the tests seed the snapshot.
		const chatChannel: AgentIntegrationConfig = {
			type: N8N_CHAT_INTEGRATION_TYPE,
			credentialId: '',
		};
		const publishedSchema = (integrations: AgentIntegrationConfig[]): AgentJsonConfig => ({
			name: 'Published',
			model: 'm',
			instructions: 'i',
			integrations,
		});

		/** Publishes `snapshotIntegrations`, while the draft column keeps `overrides`. */
		async function createPublishedAgent(
			snapshotIntegrations: AgentIntegrationConfig[],
			overrides: Partial<Agent> = {},
		): Promise<Agent> {
			const versionId = uuid();
			const agent = await createAgent(overrides);
			await agentHistoryRepo.save({
				versionId,
				agentId: agent.id,
				author: 'test',
				schema: publishedSchema(snapshotIntegrations),
				tools: null,
				skills: null,
			});
			await agentRepo.update({ id: agent.id }, { activeVersionId: versionId });
			return (await agentRepo.findById(agent.id)) as Agent;
		}

		async function listReachable(availableInChat = true) {
			return await agentRepo.findByProjectIdsPaginated([projectId], {
				skip: 0,
				take: 10,
				filter: { availableInChat },
			});
		}

		it('returns an agent whose published config carries the channel', async () => {
			const agent = await createPublishedAgent([chatChannel]);

			const { count, data } = await listReachable();

			expect(count).toBe(1);
			expect(data.map((a) => a.id)).toEqual([agent.id]);
		});

		it('excludes an agent whose published config has no channel', async () => {
			await createPublishedAgent([]);

			const { count, data } = await listReachable();

			expect(count).toBe(0);
			expect(data).toEqual([]);
		});

		it('excludes an agent that has the channel only in its unpublished draft', async () => {
			// The draft carries it, the snapshot does not: production chat refuses
			// this agent, so the list must not offer it.
			await createPublishedAgent([], {
				integrations: [chatChannel] as unknown as Agent['integrations'],
			});

			const { count, data } = await listReachable();

			expect(count).toBe(0);
			expect(data).toEqual([]);
		});

		it('returns an agent whose draft dropped the channel but whose published config keeps it', async () => {
			// The mirror case: production chat still serves this agent until the
			// next publish, so the list must keep offering it.
			const agent = await createPublishedAgent([chatChannel], { integrations: [] });

			const { count, data } = await listReachable();

			expect(count).toBe(1);
			expect(data.map((a) => a.id)).toEqual([agent.id]);
		});

		it('excludes an unpublished agent', async () => {
			await createAgent({
				integrations: [chatChannel] as unknown as Agent['integrations'],
				activeVersionId: null,
			});

			const { count, data } = await listReachable();

			expect(count).toBe(0);
			expect(data).toEqual([]);
		});

		it('excludes a published agent in another project', async () => {
			const otherProject = await createTeamProject();
			await createPublishedAgent([chatChannel], { projectId: otherProject.id });

			const { count, data } = await listReachable();

			expect(count).toBe(0);
			expect(data).toEqual([]);
		});

		it('excludes a telegram allowlist entry that happens to equal the channel type', async () => {
			// Publish snapshots only the chat entries today, so this shape cannot
			// occur yet. It pins the predicate on the entry's `type` regardless:
			// the value sits in `settings`, where a text match would still hit it.
			await createPublishedAgent([
				{
					type: 'telegram',
					credentialId: 'cred-1',
					settings: { accessMode: 'private', allowedUsers: [N8N_CHAT_INTEGRATION_TYPE] },
				},
			]);

			const { count, data } = await listReachable();

			expect(count).toBe(0);
			expect(data).toEqual([]);
		});

		it('applies the strict complement when false', async () => {
			const reachable = await createPublishedAgent([chatChannel]);
			const publishedWithout = await createPublishedAgent([]);
			const unpublished = await createAgent({ activeVersionId: null });

			const { count, data } = await listReachable(false);

			expect(count).toBe(2);
			expect(data.map((a) => a.id).sort()).toEqual([publishedWithout.id, unpublished.id].sort());
			expect(data.map((a) => a.id)).not.toContain(reachable.id);
		});

		it('agrees with isN8nChatPublished, the gate the production chat route uses', async () => {
			// The list decides what a user is offered and `isN8nChatPublished` decides
			// whether the run is allowed. If they ever disagree the page offers an
			// agent whose first message is refused, so pin them to each other.
			const reachable = await createPublishedAgent([chatChannel]);
			const draftOnly = await createPublishedAgent([], { integrations: [chatChannel] });
			const snapshotOnly = await createPublishedAgent([chatChannel], { integrations: [] });
			const unpublished = await createAgent({ integrations: [chatChannel], activeVersionId: null });

			const listed = new Set((await listReachable()).data.map((agent) => agent.id));

			for (const agent of [reachable, draftOnly, snapshotOnly, unpublished]) {
				expect({
					id: agent.id,
					listed: listed.has(agent.id),
				}).toEqual({
					id: agent.id,
					listed: await agentRepo.isN8nChatPublished(agent.id, projectId),
				});
			}
		});

		it('keeps count and skip/take pagination correct with the filter applied', async () => {
			const agents: Agent[] = [];
			for (let i = 0; i < 3; i++) {
				agents.push(await createPublishedAgent([chatChannel]));
			}
			await createPublishedAgent([]);

			const page = await agentRepo.findByProjectIdsPaginated([projectId], {
				skip: 1,
				take: 1,
				sortBy: 'name:asc',
				filter: { availableInChat: true },
			});

			expect(page.count).toBe(agents.length);
			expect(page.data).toHaveLength(1);
		});
	});
});
