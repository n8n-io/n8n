import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { createUser } from '@test-integration/db/users';

/** A shared session keeps its owner: `accessScope 'project'` with an `ownerId`. */
describe('AgentExecutionThreadRepository with shared sessions', () => {
	let threads: AgentExecutionThreadRepository;
	let agents: AgentRepository;
	let owner: User;
	let teammate: User;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		threads = Container.get(AgentExecutionThreadRepository);
		agents = Container.get(AgentRepository);
		[owner, teammate] = await Promise.all([createUser(), createUser()]);
	});
	afterAll(async () => await testDb.terminate());

	const createAgent = async (projectId: string) =>
		await agents.save(
			agents.create({
				id: randomUUID(),
				name: 'Agent',
				projectId,
				integrations: [],
				tools: {},
				skills: {},
			}),
		);

	const createThread = async (
		agentId: string,
		projectId: string,
		access: Pick<AgentExecutionThread, 'accessScope' | 'ownerId'>,
		extra: Partial<AgentExecutionThread> = {},
	) => {
		const id = randomUUID();
		await threads.save(
			threads.create({
				id,
				agentId,
				agentName: 'Agent',
				projectId,
				parentThreadId: null,
				...access,
				...extra,
			}),
		);
		return id;
	};

	const setup = async () => {
		const project = await createTeamProject();
		const otherProject = await createTeamProject();
		const agent = await createAgent(project.id);
		return { project, otherProject, agent };
	};

	describe('shareWithProject', () => {
		it('shares a private top-level session of its owner and keeps the owner', async () => {
			const { project, agent } = await setup();
			const id = await createThread(agent.id, project.id, {
				accessScope: 'user',
				ownerId: owner.id,
			});

			await expect(threads.shareWithProject(id, owner.id)).resolves.toBe(true);

			await expect(threads.findOneBy({ id })).resolves.toMatchObject({
				accessScope: 'project',
				ownerId: owner.id,
			});
		});

		it('shares nothing for another owner, a shared session or a child session', async () => {
			const { project, agent } = await setup();
			const theirs = await createThread(agent.id, project.id, {
				accessScope: 'user',
				ownerId: owner.id,
			});
			const shared = await createThread(agent.id, project.id, {
				accessScope: 'project',
				ownerId: owner.id,
			});
			const child = await createThread(
				agent.id,
				project.id,
				{ accessScope: 'user', ownerId: owner.id },
				{ parentThreadId: theirs },
			);

			await expect(threads.shareWithProject(theirs, teammate.id)).resolves.toBe(false);
			await expect(threads.shareWithProject(shared, owner.id)).resolves.toBe(false);
			await expect(threads.shareWithProject(child, owner.id)).resolves.toBe(false);
			await expect(threads.findOneBy({ id: theirs })).resolves.toMatchObject({
				accessScope: 'user',
			});
			await expect(threads.findOneBy({ id: child })).resolves.toMatchObject({
				accessScope: 'user',
			});
		});
	});

	describe('findOrCreate', () => {
		it("matches a shared session with its owner's private access", async () => {
			const { project, agent } = await setup();
			const id = await createThread(agent.id, project.id, {
				accessScope: 'project',
				ownerId: owner.id,
			});
			const run = Container.get(TransactionRunner);

			const result = await run.run(
				{},
				async (ctx) =>
					await threads.findOrCreate(
						id,
						agent.id,
						'Agent',
						project.id,
						{ accessScope: 'user', ownerId: owner.id },
						ctx,
						undefined,
						undefined,
						undefined,
						'existing',
					),
			);

			expect(result).toMatchObject({ created: false, thread: { id, accessScope: 'project' } });
		});

		it('does not give a session to another user or a session without owner to a user', async () => {
			const { project, agent } = await setup();
			const shared = await createThread(agent.id, project.id, {
				accessScope: 'project',
				ownerId: owner.id,
			});
			const integration = await createThread(agent.id, project.id, {
				accessScope: 'project',
				ownerId: null,
			});
			const run = Container.get(TransactionRunner);
			const find = async (
				id: string,
				access: Pick<AgentExecutionThread, 'accessScope' | 'ownerId'>,
			) =>
				await run.run(
					{},
					async (ctx) =>
						await threads.findOrCreate(
							id,
							agent.id,
							'Agent',
							project.id,
							access,
							ctx,
							undefined,
							undefined,
							undefined,
							'existing',
						),
				);

			await expect(find(shared, { accessScope: 'user', ownerId: teammate.id })).rejects.toThrow(
				'Session not found',
			);
			await expect(find(integration, { accessScope: 'user', ownerId: owner.id })).rejects.toThrow(
				'Session not found',
			);
			await expect(
				find(integration, { accessScope: 'project', ownerId: null }),
			).resolves.toMatchObject({
				created: false,
			});
			await expect(find(shared, { accessScope: 'project', ownerId: null })).rejects.toThrow(
				'Session not found',
			);
		});
	});

	describe('owner and visible lists', () => {
		it('lists private and shared sessions of the owner, and the shared sessions of given projects', async () => {
			const { project, otherProject, agent } = await setup();
			const mine = await createThread(agent.id, project.id, {
				accessScope: 'user',
				ownerId: owner.id,
			});
			const mineShared = await createThread(agent.id, project.id, {
				accessScope: 'project',
				ownerId: owner.id,
			});
			const sharedElsewhere = await createThread(agent.id, otherProject.id, {
				accessScope: 'project',
				ownerId: owner.id,
			});
			const integration = await createThread(agent.id, project.id, {
				accessScope: 'project',
				ownerId: null,
			});
			const theirs = await createThread(agent.id, project.id, {
				accessScope: 'user',
				ownerId: teammate.id,
			});
			const ids = (rows: AgentExecutionThread[]) => rows.map(({ id }) => id).sort();

			expect(ids(await threads.findOwnedByAgent(agent.id, owner.id))).toEqual(
				[mine, mineShared, sharedElsewhere].sort(),
			);
			expect(ids(await threads.findVisibleByAgent(agent.id, teammate.id, [project.id]))).toEqual(
				[mineShared, theirs].sort(),
			);
			expect(ids(await threads.findVisibleByAgent(agent.id, teammate.id, []))).toEqual([theirs]);
			expect(ids(await threads.findSharedByIds(agent.id, [mine, mineShared, integration]))).toEqual(
				[mineShared],
			);
			await expect(threads.findOwnedById(agent.id, owner.id, mineShared)).resolves.toMatchObject({
				id: mineShared,
			});
			await expect(threads.findOwnedById(agent.id, teammate.id, mineShared)).resolves.toBeNull();
		});

		it('pages the same visible sessions, with the search', async () => {
			const { project, otherProject, agent } = await setup();
			const shared = await createThread(
				agent.id,
				project.id,
				{ accessScope: 'project', ownerId: owner.id },
				{ title: 'Invoices' },
			);
			await createThread(
				agent.id,
				otherProject.id,
				{ accessScope: 'project', ownerId: owner.id },
				{ title: 'Invoices elsewhere' },
			);
			const own = await createThread(
				agent.id,
				project.id,
				{ accessScope: 'user', ownerId: teammate.id },
				{ title: 'Invoices of my own' },
			);

			const page = await threads.findVisibleHistoryPage(
				agent.id,
				{ userId: teammate.id, sharedProjectIds: [project.id] },
				{ limit: 10, search: 'invoices' },
			);
			const ownOnly = await threads.findVisibleHistoryPage(
				agent.id,
				{ userId: teammate.id, sharedProjectIds: [] },
				{ limit: 10 },
			);

			expect(page.map(({ id }) => id).sort()).toEqual([shared, own].sort());
			expect(ownOnly.map(({ id }) => id)).toEqual([own]);
		});
	});

	describe('deleteSession', () => {
		it('lets only the owner delete a shared session', async () => {
			const { project, agent } = await setup();
			const shared = await createThread(agent.id, project.id, {
				accessScope: 'project',
				ownerId: owner.id,
			});
			const run = Container.get(TransactionRunner);
			const remove = async (userId: string) =>
				await run.run(
					{},
					async (ctx) => await threads.deleteSession(project.id, agent.id, shared, userId, ctx),
				);

			await expect(remove(teammate.id)).resolves.toBeNull();
			await expect(remove(owner.id)).resolves.toMatchObject({ status: 'deleted' });
			await expect(threads.findOneBy({ id: shared })).resolves.toBeNull();
		});

		it('still lets a project reader delete a session without owner', async () => {
			const { project, agent } = await setup();
			const integration = await createThread(agent.id, project.id, {
				accessScope: 'project',
				ownerId: null,
			});

			const result = await Container.get(TransactionRunner).run(
				{},
				async (ctx) =>
					await threads.deleteSession(project.id, agent.id, integration, teammate.id, ctx),
			);

			expect(result).toMatchObject({ status: 'deleted' });
		});
	});
});
