import { NotFoundError } from '@n8n/errors';
import { createTeamProject, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentDefinitionService } from '@/modules/agents/agent-definition.service';
import { AgentSkillRefsService } from '@/modules/agents/agent-skill-refs.service';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { registerSkillUsage } from '@/modules/agents/register-skill-usage';
import {
	markAgentDraftDirty,
	saveAgentDraftFenced,
} from '@/modules/agents/utils/agent-draft.utils';
import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { AgentRuntimeCacheService } from '@/modules/agents/agent-runtime-cache.service';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentValidationService } from '@/modules/agents/agent-validation.service';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentPublishHistoryRepository } from '@/modules/agents/repositories/agent-publish-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { Telemetry } from '@/telemetry';

import { createOwner } from '../shared/db/users';

const emitter = { by: 'user', trigger: 'explicit' } as const;
const schema = { name: 'Support', model: '', instructions: 'Help users.' };

describe('Agent version history', () => {
	let owner: User;
	let projectId: string;
	let agentId: string;
	let versionId: string;
	let agents: AgentRepository;
	let history: AgentHistoryRepository;
	let publications: AgentPublishHistoryRepository;
	let service: AgentPublishService;

	beforeAll(async () => {
		mockInstance(Telemetry);
		mockInstance(AgentRuntimeCacheService);
		mockInstance(AgentTaskService).requestReconcile.mockResolvedValue(undefined);
		mockInstance(AgentValidationService).validateAgentHistoryConfiguration.mockResolvedValue({
			status: 'valid',
			issues: [],
		});
		await testModules.loadModules(['skills', 'agents']);
		await testDb.init();
		registerSkillUsage();
		owner = await createOwner();
		projectId = (await createTeamProject()).id;
		agents = Container.get(AgentRepository);
		history = Container.get(AgentHistoryRepository);
		publications = Container.get(AgentPublishHistoryRepository);
		service = Container.get(AgentPublishService);
	});

	beforeEach(async () => {
		agentId = randomUUID();
		versionId = randomUUID();
		await agents.save(
			agents.create({
				id: agentId,
				projectId,
				name: schema.name,
				schema,
				tools: {},
				integrations: [],
				versionId,
			}),
		);
		await history.saveVersion({ agentId, versionId, schema, tools: {}, savedBy: owner }, {});
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await agents.delete({});
	});
	afterAll(async () => await testDb.terminate());

	it('reads publication events in the caller transaction and rolls them back', async () => {
		const rollback = new Error('Cancel publication');
		await expect(
			Container.get(TransactionRunner).run({}, async (ctx) => {
				await publications.record(agentId, versionId, 'activated', owner, ctx);

				expect(await publications.hasPublication(agentId, versionId, ctx)).toBe(true);
				expect(await publications.hasPublication(agentId, undefined, ctx)).toBe(true);
				const latest = await publications.findLatestForVersions(agentId, [versionId], ctx);
				expect(latest.get(versionId)).toMatchObject({ agentId, versionId, userId: owner.id });
				expect(await publications.list(agentId, 10, 0, ctx)).toMatchObject([
					{ agentId, versionId, event: 'activated', version: { versionId } },
				]);
				throw rollback;
			}),
		).rejects.toBe(rollback);

		expect(await publications.hasPublication(agentId, versionId, {})).toBe(false);
		expect(await publications.findLatestForVersions(agentId, [versionId], {})).toEqual(new Map());
		expect(await publications.list(agentId, 10, 0, {})).toEqual([]);
	});

	it('edits labels without changing content, save time, or publication state', async () => {
		const saved = await history.findByVersionAndAgentId(versionId, agentId, {});
		await service.updateVersionMetadata(agentId, projectId, versionId, {
			name: 'Release',
			description: 'Ready for support',
		});
		expect(await history.findByVersionAndAgentId(versionId, agentId, {})).toMatchObject({
			name: 'Release',
			description: 'Ready for support',
			schema,
			createdAt: saved?.createdAt,
			updatedAt: saved?.updatedAt,
			author: saved?.author,
		});
		expect(await agents.findById(agentId)).toMatchObject({
			versionId,
			activeVersionId: null,
			revision: 0,
			publicationRevision: 0,
		});
		expect(await publications.list(agentId, 1, 0, {})).toEqual([]);
		const summary = await service.getVersionSummary(agentId, projectId, versionId);
		expect(summary).toMatchObject({
			versionId,
			name: 'Release',
			description: 'Ready for support',
			isCurrent: true,
			isActive: false,
		});
		expect(summary).not.toHaveProperty('schema');
		await service.updateVersionMetadata(agentId, projectId, versionId, { name: null });
		expect(await history.findByVersionAndAgentId(versionId, agentId, {})).toMatchObject({
			name: null,
			description: 'Ready for support',
		});
	});

	it('records each publication period and preserves the draft', async () => {
		const newerVersionId = randomUUID();
		await agents.update({ id: agentId }, { versionId: newerVersionId });
		await service.publishAgent(
			agentId,
			projectId,
			owner,
			emitter,
			versionId,
			undefined,
			undefined,
			{
				name: 'Release',
				description: 'Notes',
			},
		);
		await service.unpublishAgent(agentId, projectId, owner, 'user');
		await service.publishAgent(agentId, projectId, owner, emitter, versionId);
		expect(await agents.findById(agentId)).toMatchObject({
			versionId: newerVersionId,
			activeVersionId: versionId,
		});
		const events = await service.listPublishHistory(agentId, projectId, 20, 0);
		expect(events.map(({ event, isActive, name }) => ({ event, isActive, name }))).toEqual([
			{ event: 'activated', isActive: true, name: 'Release' },
			{ event: 'deactivated', isActive: false, name: 'Release' },
			{ event: 'activated', isActive: false, name: 'Release' },
		]);
		expect(events[2].endedAt).toBe(events[1].createdAt);
		expect((await service.getVersionSummary(agentId, projectId, versionId)).lastPublished).toEqual({
			author: events[0].author,
			createdAt: events[0].createdAt,
			isLegacy: false,
		});
	});

	it('publishes V1 content and keeps the V2 draft with skill-version pins', async () => {
		const definitions = Container.get(AgentDefinitionService);
		const skillRefs = Container.get(AgentSkillRefsService);
		const tasks = Container.get(AgentTaskRepository);
		const contents = ['V1', 'V2'].map((name, index) => ({
			name,
			tools: {
				lookup: {
					code: `return '${name}';`,
					descriptor: {
						name: 'lookup',
						description: name,
						systemInstruction: null,
						inputSchema: null,
						outputSchema: null,
						hasSuspend: false,
						hasResume: false,
						hasToMessage: false,
						requireApproval: false,
						providerOptions: null,
					},
				},
			},
			skill: { name, description: name, instructions: `Use ${name}.` },
			task: {
				name,
				objective: `Run ${name}.`,
				cronExpression: `0 ${index + 9} * * *`,
				timezone: 'Europe/Berlin',
			},
		}));
		const versionIds: string[] = [];
		for (const content of contents) {
			await Container.get(TransactionRunner).run({}, async (ctx) => {
				const draft = (await agents.lockForVersionCapture(agentId, ctx))!;
				draft.name = content.name;
				draft.schema = {
					...schema,
					name: content.name,
					instructions: content.name,
					tools: [{ type: 'custom', id: 'lookup' }],
					tasks: [{ type: 'task', id: 'daily', enabled: true }],
				};
				draft.tools = content.tools;
				markAgentDraftDirty(draft);
				await saveAgentDraftFenced(agents, draft, ctx);
				await skillRefs.createDraftRefs(
					draft,
					[{ type: 'skill', id: content.name }],
					{ [content.name]: content.skill },
					owner,
					ctx,
				);
				await tasks.replaceForAgent(agentId, new Map([['daily', content.task]]), ctx);
				versionIds.push((await definitions.captureVersion(draft, owner, ctx)).versionId);
			});
		}
		const draftBefore = await agents.findById(agentId);

		await service.publishAgent(agentId, projectId, owner, emitter, versionIds[0]);

		const agent = (await agents.findById(agentId))!;
		expect(agent).toMatchObject({
			activeVersionId: versionIds[0],
			versionId: versionIds[1],
			schema: draftBefore!.schema,
			tools: draftBefore!.tools,
			revision: draftBefore!.revision,
		});
		const published = await definitions.readVersion(agent.activeVersion!);
		const draft = await definitions.readDraft(agent);
		for (const [index, definition] of [published, draft].entries()) {
			const expected = contents[index];
			expect(definition.schema).toMatchObject({
				name: expected.name,
				instructions: expected.name,
			});
			expect(definition.tools).toEqual(expected.tools);
			expect(Object.values(definition.skills)).toEqual([expected.skill]);
			expect(definition.schema?.skills).toEqual(
				Object.keys(definition.skills).map((id) => ({ type: 'skill', id })),
			);
			expect(definition.tasks).toEqual(new Map([['daily', expected.task]]));
		}
	});

	it('rolls back labels and activation when the publication event cannot be saved', async () => {
		vi.spyOn(publications, 'record').mockRejectedValueOnce(new Error('Event write failed'));
		await expect(
			service.publishAgent(agentId, projectId, owner, emitter, versionId, undefined, undefined, {
				name: 'Release',
			}),
		).rejects.toThrow('Event write failed');
		expect(await history.findByVersionAndAgentId(versionId, agentId, {})).toMatchObject({
			name: null,
			publishedById: null,
		});
		expect(await agents.findById(agentId)).toMatchObject({
			activeVersionId: null,
			publicationRevision: 0,
		});
		expect(await publications.list(agentId, 1, 0, {})).toEqual([]);
	});

	it('scopes metadata and timeline reads to the Agent project', async () => {
		const otherProject = await createTeamProject();
		await expect(
			service.updateVersionMetadata(agentId, otherProject.id, versionId, { name: 'Release' }),
		).rejects.toThrow(NotFoundError);
		await expect(service.listPublishHistory(agentId, otherProject.id, 20, 0)).rejects.toThrow(
			NotFoundError,
		);
	});
});
