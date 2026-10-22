import { NotFoundError } from '@n8n/errors';
import { createTeamProject, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

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
				skills: {},
				integrations: [],
				versionId,
			}),
		);
		await history.saveVersion({ agentId, versionId, schema, tools: {}, savedBy: owner });
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await agents.delete({});
	});
	afterAll(async () => await testDb.terminate());

	it('edits labels without changing content, save time, or publication state', async () => {
		const saved = await history.findByVersionAndAgentId(versionId, agentId);
		await service.updateVersionMetadata(agentId, projectId, versionId, {
			name: 'Release',
			description: 'Ready for support',
		});
		expect(await history.findByVersionAndAgentId(versionId, agentId)).toMatchObject({
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
		expect(await publications.countBy({ agentId })).toBe(0);
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
		expect(await history.findByVersionAndAgentId(versionId, agentId)).toMatchObject({
			name: null,
			description: 'Ready for support',
		});
	});

	it('records each publication period and preserves the draft', async () => {
		const newerVersionId = randomUUID();
		await agents.update({ id: agentId }, { versionId: newerVersionId });
		await service.publishAgent(agentId, projectId, owner, emitter, versionId, undefined, {
			name: 'Release',
			description: 'Notes',
		});
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

	it('rolls back labels and activation when the publication event cannot be saved', async () => {
		vi.spyOn(publications, 'record').mockRejectedValueOnce(new Error('Event write failed'));
		await expect(
			service.publishAgent(agentId, projectId, owner, emitter, versionId, undefined, {
				name: 'Release',
			}),
		).rejects.toThrow('Event write failed');
		expect(await history.findByVersionAndAgentId(versionId, agentId)).toMatchObject({
			name: null,
			publishedById: null,
		});
		expect(await agents.findById(agentId)).toMatchObject({
			activeVersionId: null,
			publicationRevision: 0,
		});
		expect(await publications.countBy({ agentId })).toBe(0);
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
