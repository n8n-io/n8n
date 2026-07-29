import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { TagRepository, WorkflowRepository, WorkflowTagMappingRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { assignTagToWorkflow, createTag, updateTag } from '@test-integration/db/tags';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportPackageRequest } from '../n8n-packages.types';
import { buildEntityPackageBuffer, serializedWorkflow } from './fixtures/package-fixtures';
import { streamToBuffer } from './utils/tar-support';

let service: N8nPackagesService;
let tagRepository: TagRepository;
let mappingRepository: WorkflowTagMappingRepository;
let workflowRepository: WorkflowRepository;

const licenseMocker = new LicenseMocker();

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	await initNodeTypes();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	service = Container.get(N8nPackagesService);
	tagRepository = Container.get(TagRepository);
	mappingRepository = Container.get(WorkflowTagMappingRepository);
	workflowRepository = Container.get(WorkflowRepository);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowTagMapping',
		'TagEntity',
		'WorkflowEntity',
		'SharedWorkflow',
		'ProjectRelation',
		'Project',
	]);
});

type ImportParams = { user: User; projectId?: string; packageBuffer: Buffer } & Partial<
	Omit<ImportPackageRequest, 'user' | 'projectId' | 'packageBuffer'>
>;

async function importPackage(params: ImportParams) {
	return await service.importPackage({
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'must-preexist',
		workflowConflictPolicy: 'fail',
		workflowPublishingPolicy: 'preserve-published-state',
		workflowIdPolicy: 'new',
		folderConflictPolicy: 'merge',
		dataTableMatchingMode: 'by-id',
		dataTableMissingMode: 'create',
		dataTableSchemaConflictPolicy: 'keep-existing',
		variableMissingMode: 'do-nothing',
		missingNodeTypeMode: 'fail',
		tagMissingMode: 'create',
		tagConflictPolicy: 'skip',
		...params,
	});
}

async function exportWorkflowPackage(
	user: User,
	workflowIds: string[],
	includeTags = true,
): Promise<Buffer> {
	const { stream } = await service.exportPackage({ user, workflowIds, includeTags });
	return await streamToBuffer(stream);
}

/** A workflow tagged with `tagName` in a fresh source project, packaged for import. */
async function taggedWorkflowPackage(owner: User, tagName: string) {
	const sourceProject = await createTeamProject('Source', owner);
	const workflow = await createWorkflow({ name: 'Tagged workflow' }, sourceProject);
	const tag = await createTag({ name: tagName }, workflow);
	const packageBuffer = await exportWorkflowPackage(owner, [workflow.id]);
	return { workflow, tag, packageBuffer };
}

async function tagIdsOf(workflowId: string): Promise<string[]> {
	const mappings = await mappingRepository.find({ where: { workflowId } });
	return mappings.map(({ tagId }) => tagId).sort();
}

describe('workflow package import — with tags', () => {
	let owner: User;

	beforeEach(async () => {
		owner = await createOwner();
	});

	describe('create missing mode (default)', () => {
		it('creates an absent shared tag once with its source id and name, attaching re-id’d workflows', async () => {
			const sourceProject = await createTeamProject('Source', owner);
			const wfA = await createWorkflow({ name: 'Workflow A' }, sourceProject);
			const wfB = await createWorkflow({ name: 'Workflow B' }, sourceProject);
			const tag = await createTag({ name: 'shared' });
			await assignTagToWorkflow(tag, wfA);
			await assignTagToWorkflow(tag, wfB);
			const packageBuffer = await exportWorkflowPackage(owner, [wfA.id, wfB.id]);
			// Absent on the target: the import must recreate it under the source id.
			await tagRepository.delete(tag.id);

			const targetProject = await createTeamProject('Target', owner);
			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
			});

			expect(result.tags).toEqual({ matched: [], created: ['shared'], renamed: [], skipped: [] });
			expect(await tagRepository.find()).toEqual([
				expect.objectContaining({ id: tag.id, name: 'shared' }),
			]);
			for (const imported of result.workflows) {
				expect(imported.localId).not.toBe(imported.sourceWorkflowId);
				expect(await tagIdsOf(imported.localId)).toEqual([tag.id]);
			}
		});

		it('attaches without creating when a tag with the same id and name exists', async () => {
			const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			const targetProject = await createTeamProject('Target', owner);

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
			});

			expect(result.tags).toEqual({ matched: ['prod'], created: [], renamed: [], skipped: [] });
			expect(await tagRepository.count()).toBe(1);
			expect(await tagIdsOf(result.workflows[0].localId)).toEqual([tag.id]);
		});

		it('re-imports idempotently under new-version: nothing created or renamed twice', async () => {
			const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			await tagRepository.delete(tag.id);
			const targetProject = await createTeamProject('Target', owner);

			const first = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});
			const second = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});

			expect(first.tags.created).toEqual(['prod']);
			expect(second.tags).toEqual({ matched: ['prod'], created: [], renamed: [], skipped: [] });
			expect(second.workflows[0].localId).toBe(first.workflows[0].localId);
			expect(await tagRepository.count()).toBe(1);
			expect(await tagIdsOf(first.workflows[0].localId)).toEqual([tag.id]);
		});

		it('rejects an import that would create a tag when the API key lacks tag:create', async () => {
			const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			await tagRepository.delete(tag.id);
			const targetProject = await createTeamProject('Target', owner);

			await expect(
				importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					apiKeyScopes: ['workflow:import'],
				}),
			).rejects.toBeInstanceOf(ForbiddenError);
			expect(await tagRepository.count()).toBe(0);
		});
	});

	describe('do-nothing missing mode', () => {
		it('imports the workflow without the missing tag and creates nothing', async () => {
			const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			await tagRepository.delete(tag.id);
			const targetProject = await createTeamProject('Target', owner);

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				tagMissingMode: 'do-nothing',
			});

			expect(result.workflows[0].status).toBe('created');
			expect(result.tags).toEqual({ matched: [], created: [], renamed: [], skipped: ['prod'] });
			expect(await tagRepository.count()).toBe(0);
			expect(await tagIdsOf(result.workflows[0].localId)).toEqual([]);
		});
	});

	describe('rename drift (target tag with the same id carries a different name)', () => {
		it('blocks under fail and writes nothing, leaving the drifted tag name alone', async () => {
			const { workflow, tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			await updateTag(tag, { name: 'production' });
			const targetProject = await createTeamProject('Target', owner);
			const workflowsBefore = await workflowRepository.count();
			const tagsBefore = await tagRepository.count();

			await expect(
				importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					tagConflictPolicy: 'fail',
				}),
			).rejects.toMatchObject({
				message: /Import blocked/,
				meta: {
					issues: [
						expect.objectContaining({
							type: 'tag-unresolved',
							kind: 'rename-drift',
							sourceId: tag.id,
							name: 'prod',
							existingName: 'production',
							usedByWorkflows: [workflow.id],
						}),
					],
				},
			});

			expect(await workflowRepository.count()).toBe(workflowsBefore);
			expect(await tagRepository.count()).toBe(tagsBefore);
			expect((await tagRepository.findOneByOrFail({ id: tag.id })).name).toBe('production');
		});

		it('renames the target tag to the package name under rename and attaches it', async () => {
			const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			await updateTag(tag, { name: 'production' });
			const targetProject = await createTeamProject('Target', owner);

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				tagConflictPolicy: 'rename',
			});

			expect(result.tags).toEqual({ matched: [], created: [], renamed: ['prod'], skipped: [] });
			expect((await tagRepository.findOneByOrFail({ id: tag.id })).name).toBe('prod');
			expect(await tagIdsOf(result.workflows[0].localId)).toEqual([tag.id]);
		});

		it('blocks a rename whose wanted name is held by another tag', async () => {
			const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			await updateTag(tag, { name: 'production' });
			const holder = await createTag({ name: 'prod' });
			const targetProject = await createTeamProject('Target', owner);

			await expect(
				importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					tagConflictPolicy: 'rename',
				}),
			).rejects.toMatchObject({
				meta: {
					issues: [
						expect.objectContaining({
							type: 'tag-unresolved',
							kind: 'rename-drift',
							sourceId: tag.id,
							existingTagId: holder.id,
						}),
					],
				},
			});
		});

		it('gates a rename-policy import on the tag:update API key scope', async () => {
			const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			await updateTag(tag, { name: 'production' });
			const targetProject = await createTeamProject('Target', owner);

			await expect(
				importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					tagConflictPolicy: 'rename',
					apiKeyScopes: ['workflow:import', 'tag:create'],
				}),
			).rejects.toBeInstanceOf(ForbiddenError);

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				tagConflictPolicy: 'rename',
				apiKeyScopes: ['workflow:import', 'tag:create', 'tag:update'],
			});

			expect(result.tags.renamed).toEqual(['prod']);
			expect((await tagRepository.findOneByOrFail({ id: tag.id })).name).toBe('prod');
		});
	});

	describe('name collision (name taken by a different tag, e.g. tag created manually on the target)', () => {
		it('blocks under fail with a 409, deleting and altering nothing', async () => {
			const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			await tagRepository.delete(tag.id);
			const holder = await createTag({ name: 'prod' });
			const targetProject = await createTeamProject('Target', owner);
			const workflowsBefore = await workflowRepository.count();

			let caught: unknown;
			await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				tagConflictPolicy: 'fail',
			}).catch((error: unknown) => (caught = error));

			expect(caught).toBeInstanceOf(ConflictError);
			expect(caught).toMatchObject({
				meta: {
					issues: [
						expect.objectContaining({
							type: 'tag-unresolved',
							kind: 'name-collision',
							sourceId: tag.id,
							name: 'prod',
							existingTagId: holder.id,
						}),
					],
				},
			});
			expect(await workflowRepository.count()).toBe(workflowsBefore);
			// The colliding target tag is never deleted or renamed to make room.
			expect(await tagRepository.find()).toEqual([
				expect.objectContaining({ id: holder.id, name: 'prod' }),
			]);
		});

		it('treats a case-variant target name as free and creates without conflict', async () => {
			const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			await tagRepository.delete(tag.id);
			await createTag({ name: 'Prod' });
			const targetProject = await createTeamProject('Target', owner);

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				tagConflictPolicy: 'fail',
			});

			expect(result.tags).toEqual({ matched: [], created: ['prod'], renamed: [], skipped: [] });
			expect(await tagIdsOf(result.workflows[0].localId)).toEqual([tag.id]);
		});

		it('blocks two package tags whose trimmed names collide, creating nothing', async () => {
			const workflow = serializedWorkflow({
				id: 'wf-0',
				name: 'Workflow 0',
				tagIds: ['tag-a', 'tag-b'],
			});
			const packageBuffer = await buildEntityPackageBuffer({
				workflows: [{ target: 'workflows/wf-0', workflow }],
				manifestExtras: {
					requirements: {
						tags: [
							{ id: 'tag-a', name: 'prod', usedByWorkflows: ['wf-0'] },
							{ id: 'tag-b', name: ' prod ', usedByWorkflows: ['wf-0'] },
						],
					},
				},
			});
			const targetProject = await createTeamProject('Target', owner);

			let caught: unknown;
			await importPackage({ user: owner, projectId: targetProject.id, packageBuffer }).catch(
				(error: unknown) => (caught = error),
			);

			expect(caught).toBeInstanceOf(ConflictError);
			expect(caught).toMatchObject({
				meta: {
					issues: [
						expect.objectContaining({
							type: 'tag-unresolved',
							kind: 'name-collision',
							sourceId: 'tag-a',
							name: 'prod',
							usedByWorkflows: ['wf-0'],
						}),
						expect.objectContaining({
							type: 'tag-unresolved',
							kind: 'name-collision',
							sourceId: 'tag-b',
							name: 'prod',
							usedByWorkflows: ['wf-0'],
						}),
					],
				},
			});
			expect(await tagRepository.count()).toBe(0);
		});

		it('drops the tag under the default skip policy and imports the workflow without it', async () => {
			const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			await tagRepository.delete(tag.id);
			const holder = await createTag({ name: 'prod' });
			const targetProject = await createTeamProject('Target', owner);

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
			});

			expect(result.workflows[0].status).toBe('created');
			expect(result.tags).toEqual({ matched: [], created: [], renamed: [], skipped: ['prod'] });
			expect(await tagIdsOf(result.workflows[0].localId)).toEqual([]);
			expect(await tagRepository.find()).toEqual([
				expect.objectContaining({ id: holder.id, name: 'prod' }),
			]);
		});
	});

	describe('update semantics', () => {
		it('overwrites taggings to exactly the package set on a new-version re-import', async () => {
			const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
			const targetProject = await createTeamProject('Target', owner);
			const first = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});
			const imported = await workflowRepository.findOneByOrFail({
				id: first.workflows[0].localId,
			});
			const extra = await createTag({ name: 'extra' });
			await assignTagToWorkflow(extra, imported);

			await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});

			expect(await tagIdsOf(imported.id)).toEqual([tag.id]);
		});

		it('strips all taggings when the package carries an empty tagIds set', async () => {
			const sourceProject = await createTeamProject('Source', owner);
			const workflow = await createWorkflow({ name: 'Untagged workflow' }, sourceProject);
			const packageBuffer = await exportWorkflowPackage(owner, [workflow.id]);
			const targetProject = await createTeamProject('Target', owner);
			const first = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});
			const imported = await workflowRepository.findOneByOrFail({
				id: first.workflows[0].localId,
			});
			const extra = await createTag({ name: 'extra' });
			await assignTagToWorkflow(extra, imported);

			await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});

			expect(await tagIdsOf(imported.id)).toEqual([]);
		});

		it('attaches a tag listed twice in the package tagIds exactly once on the update path', async () => {
			const workflow = serializedWorkflow({
				id: 'wf-0',
				name: 'Workflow 0',
				tagIds: ['tag-1', 'tag-1'],
			});
			const packageBuffer = await buildEntityPackageBuffer({
				workflows: [{ target: 'workflows/wf-0', workflow }],
				manifestExtras: {
					requirements: { tags: [{ id: 'tag-1', name: 'prod', usedByWorkflows: ['wf-0'] }] },
				},
			});
			const targetProject = await createTeamProject('Target', owner);

			const first = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});
			const second = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});

			expect(second.workflows[0].status).toBe('updated');
			expect(second.workflows[0].localId).toBe(first.workflows[0].localId);
			expect(await tagIdsOf(second.workflows[0].localId)).toEqual(['tag-1']);
		});

		it('leaves target taggings untouched when the package was exported without tags', async () => {
			const sourceProject = await createTeamProject('Source', owner);
			const workflow = await createWorkflow({ name: 'Tagged workflow' }, sourceProject);
			await createTag({ name: 'prod' }, workflow);
			const packageBuffer = await exportWorkflowPackage(owner, [workflow.id], false);
			const targetProject = await createTeamProject('Target', owner);
			const first = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});
			const imported = await workflowRepository.findOneByOrFail({
				id: first.workflows[0].localId,
			});
			const extra = await createTag({ name: 'extra' });
			await assignTagToWorkflow(extra, imported);

			await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});

			expect(await tagIdsOf(imported.id)).toEqual([extra.id]);
		});
	});

	it('never gates or creates for a tag referenced only by skipped workflows', async () => {
		const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
		const targetProject = await createTeamProject('Target', owner);
		await importPackage({ user: owner, projectId: targetProject.id, packageBuffer });
		// A second import would now gate on this drift — unless its workflow is skipped.
		await updateTag(tag, { name: 'production' });
		const tagsBefore = await tagRepository.count();

		const result = await importPackage({
			user: owner,
			projectId: targetProject.id,
			packageBuffer,
			workflowConflictPolicy: 'skip',
			tagConflictPolicy: 'fail',
		});

		expect(result.workflows[0].status).toBe('skipped');
		expect(result.tags).toEqual({ matched: [], created: [], renamed: [], skipped: [] });
		expect(await tagRepository.count()).toBe(tagsBefore);
	});

	it('does not require tag scopes when every tag consumer is skipped', async () => {
		const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
		const targetProject = await createTeamProject('Target', owner);
		await importPackage({ user: owner, projectId: targetProject.id, packageBuffer });
		// The tag is now absent, so a create would be planned — unless its only consumer is skipped.
		await tagRepository.delete(tag.id);

		const result = await importPackage({
			user: owner,
			projectId: targetProject.id,
			packageBuffer,
			workflowConflictPolicy: 'skip',
			apiKeyScopes: ['workflow:import'],
		});

		expect(result.workflows[0].status).toBe('skipped');
		expect(await tagRepository.count()).toBe(0);
	});

	it('silently ignores tags when workflow tags are disabled on the instance', async () => {
		const { tag, packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
		// A drift that would gate under fail — disabled tags must not even look at it.
		await updateTag(tag, { name: 'production' });
		const targetProject = await createTeamProject('Target', owner);
		const mappingsBefore = await mappingRepository.count();

		const globalConfig = Container.get(GlobalConfig);
		globalConfig.tags.disabled = true;
		try {
			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				tagConflictPolicy: 'fail',
			});

			expect(result.workflows[0].status).toBe('created');
			expect(result.tags).toEqual({ matched: [], created: [], renamed: [], skipped: [] });
			expect((await tagRepository.findOneByOrFail({ id: tag.id })).name).toBe('production');
			expect(await mappingRepository.count()).toBe(mappingsBefore);
		} finally {
			globalConfig.tags.disabled = false;
		}
	});

	it('does not require tag scopes when workflow tags are disabled', async () => {
		const { packageBuffer } = await taggedWorkflowPackage(owner, 'prod');
		const targetProject = await createTeamProject('Target', owner);

		const globalConfig = Container.get(GlobalConfig);
		globalConfig.tags.disabled = true;
		try {
			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				apiKeyScopes: ['workflow:import'],
			});

			expect(result.workflows[0].status).toBe('created');
			expect(result.tags).toEqual({ matched: [], created: [], renamed: [], skipped: [] });
		} finally {
			globalConfig.tags.disabled = false;
		}
	});

	it('rejects a package whose workflow references a tag missing from the requirements', async () => {
		const workflow = serializedWorkflow({
			id: 'wf-0',
			name: 'Workflow 0',
			tagIds: ['ghost-tag'],
		});
		const packageBuffer = await buildEntityPackageBuffer({
			workflows: [{ target: 'workflows/wf-0', workflow }],
		});
		const targetProject = await createTeamProject('Target', owner);

		await expect(
			importPackage({ user: owner, projectId: targetProject.id, packageBuffer }),
		).rejects.toThrowError(/missing from the package's tag requirements/);
	});
});
