import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { v4 as uuid } from 'uuid';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { getAgentOrThrow } from '@/modules/agents/utils/get-agent-or-throw';

describe('AgentRepository instance scope', () => {
	let agentRepo: AgentRepository;
	let projectId: string;
	let projectAgentId: string;
	const instanceAgentId = 'test-instance-agent';

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		agentRepo = Container.get(AgentRepository);
	});

	beforeEach(async () => {
		projectId = (await createTeamProject()).id;
		projectAgentId = uuid();
		await agentRepo.insert({
			id: projectAgentId,
			name: 'Project agent',
			projectId,
			schema: null,
			availableInMCP: true,
		});
		await agentRepo.ensureInstanceAgent(instanceAgentId, 'Instance agent');
		// Match the project agent, so only the scope filter can tell them apart.
		await agentRepo.update({ id: instanceAgentId }, { availableInMCP: true });
	});

	afterEach(async () => {
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('ensureInstanceAgent', () => {
		it('creates an instance agent without a project', async () => {
			const row = await agentRepo.findOneByOrFail({ id: instanceAgentId });

			expect(row).toMatchObject({
				name: 'Instance agent',
				scope: 'instance',
				projectId: null,
				schema: null,
			});
			expect(await agentRepo.isInstanceAgent(instanceAgentId)).toBe(true);
			expect(await agentRepo.isInstanceAgent(projectAgentId)).toBe(false);
		});

		it('renames an existing instance agent and does not create a second row', async () => {
			await agentRepo.ensureInstanceAgent(instanceAgentId, 'Renamed agent');

			const rows = await agentRepo.findBy({ id: instanceAgentId });
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ name: 'Renamed agent', scope: 'instance' });
		});

		it('refuses to take over a project agent with the same id', async () => {
			await expect(agentRepo.ensureInstanceAgent(projectAgentId, 'Taken over')).rejects.toThrow(
				'exists as a project agent',
			);

			expect(await agentRepo.findOneByOrFail({ id: projectAgentId })).toMatchObject({
				name: 'Project agent',
				scope: 'project',
				projectId,
			});
		});
	});

	describe('project-scoped queries', () => {
		it('never return instance agents', async () => {
			const ids = <T extends { id: string }>(rows: T[]) => rows.map((row) => row.id);

			expect(await agentRepo.findById(instanceAgentId)).toBeNull();
			expect(await agentRepo.getProjectIdById(instanceAgentId)).toBeNull();
			expect(await agentRepo.findBudgetAlertTarget(instanceAgentId)).toBeNull();
			expect(await agentRepo.findIntegrationState(instanceAgentId)).toBeNull();
			expect(await agentRepo.findActiveVersionId(instanceAgentId)).toBeNull();
			expect(await agentRepo.findChatReachableById(instanceAgentId, null)).toBeNull();

			expect(
				ids((await agentRepo.findByProjectIdsPaginated(null, { skip: 0, take: 50 })).data),
			).toEqual([projectAgentId]);
			expect(ids(await agentRepo.findSummariesByProjectIds(null))).toEqual([projectAgentId]);
			expect(ids(await agentRepo.findSummariesByIds([projectAgentId, instanceAgentId]))).toEqual([
				projectAgentId,
			]);
			expect(ids(await agentRepo.findMcpAvailabilityCandidates({ all: true }))).toEqual([
				projectAgentId,
			]);
			expect(
				ids(await agentRepo.findMcpAvailabilityCandidates({ ids: [instanceAgentId] })),
			).toEqual([]);
			expect(ids(await agentRepo.findDependencyIndexAgentIdsBatch(null, 50))).toEqual([
				projectAgentId,
			]);
			expect(
				ids(await agentRepo.findByIntegrationCredentialAnyProject('slack', 'credential', 'none')),
			).toEqual([]);
		});

		it('keep returning project agents', async () => {
			expect(await agentRepo.findById(projectAgentId)).toMatchObject({ projectId });
			expect(await agentRepo.findByIdAndProjectId(projectAgentId, projectId)).toMatchObject({
				id: projectAgentId,
			});
			expect(await agentRepo.getProjectIdById(projectAgentId)).toBe(projectId);
			expect(await agentRepo.existsByIdAndProjectId(projectAgentId, projectId)).toBe(true);
		});
	});

	describe('getAgentOrThrow', () => {
		it('refuses an instance agent as read-only', async () => {
			await expect(getAgentOrThrow(agentRepo, instanceAgentId, projectId)).rejects.toThrow(
				ForbiddenError,
			);
		});

		it('reports a missing agent as not found', async () => {
			await expect(getAgentOrThrow(agentRepo, uuid(), projectId)).rejects.toThrow(NotFoundError);
		});
	});
});
