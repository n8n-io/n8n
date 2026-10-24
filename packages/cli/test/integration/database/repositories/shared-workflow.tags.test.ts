import { createWorkflowWithHistory, setActiveVersion, testDb } from '@n8n/backend-test-utils';
import {
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	WorkflowEntity,
	SharedWorkflow,
	TagEntity,
	WorkflowTagMapping,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

import { createTag } from '../../shared/db/tags';
import { createWorkflowPublishHistoryItem } from '../../shared/db/workflow-publish-history';

const payloadMarker = 'large-workflow-payload';

describe('SharedWorkflowRepository tag payload size', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it.each([
		...[0, 1, 5, 10, 20].map((tagCount) => ({ tagCount, projectCount: 1 })),
		{ tagCount: 20, projectCount: 3 },
	])(
		'loads each large workflow version once with $tagCount tags and $projectCount projects',
		async ({ tagCount, projectCount }) => {
			const projectRepository = Container.get(ProjectRepository);
			const project = await projectRepository.save(
				projectRepository.create({ name: 'Tag payload test', type: 'team' }),
			);
			const workflow = await createWorkflowWithHistory(
				{
					nodes: [
						{
							id: uuid(),
							name: 'Code',
							type: 'n8n-nodes-base.code',
							typeVersion: 2,
							position: [0, 0],
							parameters: {
								jsCode: `/* ${payloadMarker}${'x'.repeat(4_600_000)} */ return [];`,
							},
						},
					],
				},
				project,
			);
			await setActiveVersion(workflow.id, workflow.versionId);
			for (const event of ['activated', 'deactivated', 'activated'] as const) {
				await createWorkflowPublishHistoryItem(
					{ workflowId: workflow.id, versionId: workflow.versionId },
					{ event },
				);
			}
			const draftVersionId = uuid();
			await Container.get(WorkflowRepository).update(workflow.id, {
				active: true,
				versionId: draftVersionId,
				nodes: [
					...workflow.nodes,
					{
						id: uuid(),
						name: 'Draft note',
						type: 'n8n-nodes-base.stickyNote',
						typeVersion: 1,
						position: [300, 0],
						parameters: { content: 'Unpublished change' },
					},
				],
			});
			for (let index = 0; index < tagCount; index++) {
				await createTag({}, workflow);
			}

			const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
			for (let index = 1; index < projectCount; index++) {
				const sharedProject = await projectRepository.save(
					projectRepository.create({ name: 'Shared project', type: 'team' }),
				);
				await sharedWorkflowRepository.save(
					sharedWorkflowRepository.create({
						workflowId: workflow.id,
						projectId: sharedProject.id,
						role: 'workflow:editor',
					}),
				);
			}

			const runner = Container.get(DataSource).createQueryRunner();
			const query = runner.query.bind(runner);
			let payloadCopies = 0;
			let payloadBytes = 0;
			// Count payloads before hydration removes duplicate entities.
			const querySpy = vi
				.spyOn(runner, 'query')
				.mockImplementation(
					async (sql: string, parameters?: unknown[], useStructuredResult?: boolean) => {
						const result = await query(sql, parameters, true);
						for (const row of result.records as Array<Record<string, unknown>>) {
							for (const value of Object.values(row)) {
								const text =
									typeof value === 'string'
										? value
										: Array.isArray(value)
											? JSON.stringify(value)
											: undefined;
								if (text?.includes(payloadMarker)) {
									payloadCopies++;
									payloadBytes += Buffer.byteLength(text);
								}
							}
						}
						return useStructuredResult ? result : result.raw;
					},
				);

			try {
				const result = await Container.get(SharedWorkflowRepository).findWorkflowWithOptions(
					workflow.id,
					{
						includeTags: true,
						includeParentFolder: true,
						includeActiveVersion: true,
						publishHistory: 'latestActivation',
						em: runner.manager,
					},
				);

				expect(result?.workflow.tags).toHaveLength(tagCount);
				expect(result?.workflow.shared).toHaveLength(projectCount);
				expect(result?.workflow.shared.every((share) => share.project.id)).toBe(true);
				expect(result?.workflow.versionId).toBe(draftVersionId);
				expect(result?.workflow.nodes).toHaveLength(2);
				expect(result?.workflow.activeVersion?.versionId).toBe(workflow.versionId);
				expect(result?.workflow.activeVersion?.nodes).toHaveLength(1);
				expect(result?.workflow.activeVersion?.workflowPublishHistory).toHaveLength(1);
				expect(payloadBytes).toBeGreaterThanOrEqual(9_200_000);
				expect(payloadCopies).toBe(2);
			} finally {
				querySpy.mockRestore();
				await runner.release();
			}
		},
	);

	it.each(['default', 'em', 'ctx'] as const)(
		'keeps the existing query count when tags are omitted through %s',
		async (api) => {
			const projectRepository = Container.get(ProjectRepository);
			const project = await projectRepository.save(
				projectRepository.create({ name: 'Query count test', type: 'team' }),
			);
			const workflow = await createWorkflowWithHistory({}, project);
			await setActiveVersion(workflow.id, workflow.versionId);
			await createTag({}, workflow);

			const dataSource = Container.get(DataSource);
			const runner = dataSource.createQueryRunner();
			const querySpy = vi.spyOn(dataSource.logger, 'logQuery');
			const options = api === 'em' ? { em: runner.manager } : api === 'ctx' ? { ctx: {} } : {};
			try {
				const repository = Container.get(SharedWorkflowRepository);
				const result = await repository.findWorkflowWithOptions(workflow.id, options);
				expect(result?.workflow.tags).toBeUndefined();
				expect(result?.workflow.activeVersion).toBeUndefined();
				expect(querySpy).toHaveBeenCalledTimes(2);
				expect(querySpy.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);

				querySpy.mockClear();
				const withVersion = await repository.findWorkflowWithOptions(workflow.id, {
					...options,
					includeTags: false,
					includeParentFolder: true,
					includeActiveVersion: true,
					publishHistory: 'latestActivation',
				});
				expect(withVersion?.workflow.tags).toBeUndefined();
				expect(withVersion?.workflow.activeVersion?.versionId).toBe(workflow.versionId);
				expect(querySpy).toHaveBeenCalledTimes(3);
				expect(querySpy.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
			} finally {
				querySpy.mockRestore();
				await runner.release();
			}
		},
	);

	it.each(['em', 'ctx'] as const)(
		'loads uncommitted workflow tags through %s without ending the caller transaction',
		async (api) => {
			const projectRepository = Container.get(ProjectRepository);
			const project = await projectRepository.save(
				projectRepository.create({ name: 'Transaction test', type: 'team' }),
			);
			const repository = Container.get(SharedWorkflowRepository);
			const rollback = new Error('Roll back the test transaction');
			let workflowId = '';
			let tagId = '';
			await expect(
				repository.runInTransaction({}, async (manager, ctx) => {
					const workflow = await manager.save(
						WorkflowEntity,
						manager.create(WorkflowEntity, {
							name: 'Uncommitted workflow',
							active: false,
							nodes: [],
							connections: {},
							versionId: uuid(),
						}),
					);
					workflowId = workflow.id;
					await manager.save(SharedWorkflow, {
						workflowId,
						projectId: project.id,
						role: 'workflow:owner',
					});
					const tag = await manager.save(
						TagEntity,
						manager.create(TagEntity, {
							name: uuid().slice(0, 24),
						}),
					);
					tagId = tag.id;
					await manager.save(WorkflowTagMapping, { workflowId, tagId });

					const options = api === 'em' ? { em: manager } : { ctx };
					const result = await repository.findWorkflowWithOptions(workflowId, {
						...options,
						includeTags: true,
						includeActiveVersion: true,
					});
					expect(result?.workflow.tags?.map((item) => item.id)).toEqual([tagId]);
					expect(result?.workflow.activeVersion).toBeNull();
					expect(result?.workflow.shared[0].project.id).toBe(project.id);
					expect(manager.queryRunner?.isTransactionActive).toBe(true);
					throw rollback;
				}),
			).rejects.toBe(rollback);
			expect(
				await repository.findWorkflowWithOptions(workflowId, { includeTags: true }),
			).toBeNull();
			expect(
				await Container.get(DataSource).manager.findOneBy(TagEntity, { id: tagId }),
			).toBeNull();
		},
	);
});
