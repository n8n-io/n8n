import {
	createTeamProject,
	createWorkflow,
	createWorkflowWithHistory,
	linkUserToProject,
	setActiveVersion,
	shareWorkflowWithProjects,
	testDb,
} from '@n8n/backend-test-utils';
import type { Folder, Project, User, WorkflowEntity } from '@n8n/db';
import {
	ProjectRepository,
	SharedWorkflowRepository,
	TagEntity,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
	WorkflowTagMapping,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import {
	captureStatements,
	countCopies,
	statementContaining,
	type CapturedStatement,
} from '@test-integration/utils/query-capture';

import { createFolder } from '../../shared/db/folders';
import { createTag } from '../../shared/db/tags';
import { createMember, createOwner } from '../../shared/db/users';
import { createWorkflowPublishHistoryItem } from '../../shared/db/workflow-publish-history';

/**
 * Loading a workflow with a to-many relation (tags, shares) in the same JOIN as the
 * workflow row repeats every workflow column, including the nodes JSON, once per
 * related row. These tests count how many copies of the draft and published JSON
 * the database sends back for each read path, check that the workflow, its published
 * version, tags and shares come from one statement (one consistent read), and check
 * that the loaded shape does not change.
 */

const DRAFT_MARKER = 'draft-json-marker';
const PUBLISHED_MARKER = 'published-json-marker';

const codeNode = (marker: string): INode => ({
	id: uuid(),
	name: 'Code',
	type: 'n8n-nodes-base.code',
	typeVersion: 2,
	position: [0, 0],
	parameters: { jsCode: `/* ${marker} ${'x'.repeat(20_000)} */ return [];` },
});

/** Runs `load` and counts the copies of the draft and published JSON the database sent. */
async function measure<T>(load: () => Promise<T>) {
	const { result, statements } = await captureStatements(load);
	return {
		result,
		statements,
		draftCopies: countCopies(statements, DRAFT_MARKER),
		publishedCopies: countCopies(statements, PUBLISHED_MARKER),
	};
}

/**
 * Every text in `texts` came back in the same statement. Reading a workflow and its tags or
 * shares in separate statements can combine rows that never existed together, for example the
 * content of one save with the tags of the next.
 */
function expectOneStatement(statements: CapturedStatement[], texts: string[]) {
	const first = statementContaining(statements, texts[0]);
	expect(first).toBeGreaterThanOrEqual(0);
	for (const text of texts) expect(statementContaining(statements, text)).toBe(first);
}

describe('Workflow relation loading', () => {
	let owner: User;
	let member: User;
	let ownerProject: Project;
	let opsProject: Project;
	let auditProject: Project;
	let folder: Folder;
	let workflow: WorkflowEntity;
	let untaggedWorkflow: WorkflowEntity;
	let publishedVersionId: string;
	let draftVersionId: string;

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();
		member = await createMember();
		ownerProject = await createTeamProject('Finance', owner);
		opsProject = await createTeamProject('Ops');
		auditProject = await createTeamProject('Audit');
		await linkUserToProject(member, ownerProject, 'project:editor');
		folder = await createFolder(ownerProject, { name: 'Accounting' });

		// Publish a version, then save a different draft, so the draft and the
		// published JSON can be counted separately.
		workflow = await createWorkflowWithHistory(
			{ name: 'Invoice Sync', nodes: [codeNode(PUBLISHED_MARKER)], parentFolder: folder },
			ownerProject,
		);
		publishedVersionId = workflow.versionId;
		await setActiveVersion(workflow.id, publishedVersionId);
		await createWorkflowPublishHistoryItem({
			workflowId: workflow.id,
			versionId: publishedVersionId,
		});
		await Container.get(WorkflowPublishedVersionRepository).setPublishedVersion(
			workflow.id,
			publishedVersionId,
		);
		draftVersionId = uuid();
		await Container.get(WorkflowRepository).update(workflow.id, {
			versionId: draftVersionId,
			nodes: [codeNode(DRAFT_MARKER)],
		});

		const baseTime = Date.now();
		for (const [index, name] of ['billing', 'nightly', 'prod'].entries()) {
			await createTag({ name, createdAt: new Date(baseTime + index * 1000) }, workflow);
		}
		await shareWorkflowWithProjects(workflow, [{ project: opsProject }, { project: auditProject }]);

		untaggedWorkflow = await createWorkflowWithHistory({ name: 'No tags' }, ownerProject);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const expectedTagNames = ['billing', 'nightly', 'prod'];
	const sortedProjectIds = (shares: { projectId: string }[]) =>
		shares.map((share) => share.projectId).sort();
	const allProjectIds = () => [ownerProject.id, opsProject.id, auditProject.id].sort();
	/** Project ids that only the shares carry, not the share row the read goes through. */
	const sharedProjectIds = () => [opsProject.id, auditProject.id];
	const allTexts = () => [
		DRAFT_MARKER,
		PUBLISHED_MARKER,
		...expectedTagNames,
		...sharedProjectIds(),
	];

	describe('opening a workflow (SharedWorkflowRepository.findWorkflowWithOptions)', () => {
		const editorOptions = {
			includeTags: true,
			includeParentFolder: true,
			includeActiveVersion: true,
			publishHistory: 'latestActivation',
		} as const;

		it('loads each JSON payload once and keeps the loaded shape', async () => {
			const { result, statements, draftCopies, publishedCopies } = await measure(
				async () =>
					await Container.get(WorkflowFinderService).findWorkflowForUser(
						workflow.id,
						owner,
						['workflow:read'],
						editorOptions,
					),
			);

			expect(draftCopies).toBe(1);
			expect(publishedCopies).toBe(1);
			// One statement for the workflow, its published version, tags and shares, so
			// `activeVersionId`, `activeVersion`, the tags and the shares all come from the same
			// state of the database. The second statement is the publish history.
			expectOneStatement(statements, allTexts());
			expect(statements).toHaveLength(2);

			expect(result?.versionId).toBe(draftVersionId);
			expect(result?.activeVersionId).toBe(publishedVersionId);
			expect(result?.activeVersion?.versionId).toBe(publishedVersionId);
			expect(result?.activeVersion?.workflowPublishHistory).toHaveLength(1);
			expect(result?.parentFolder?.id).toBe(folder.id);
			expect(result?.tags?.map((tag) => tag.name)).toEqual(expectedTagNames);
			expect(sortedProjectIds(result?.shared ?? [])).toEqual(allProjectIds());
			expect(result?.shared.every((share) => share.project?.id === share.projectId)).toBe(true);
		});

		it('loads each JSON payload once for a project member', async () => {
			const where = {
				role: In(['workflow:owner', 'workflow:editor']),
				project: { projectRelations: { role: In(['project:editor']), userId: member.id } },
			};
			const { result, draftCopies, publishedCopies, statements } = await measure(
				async () =>
					await Container.get(SharedWorkflowRepository).findWorkflowWithOptions(workflow.id, {
						...editorOptions,
						where,
					}),
			);

			expect(draftCopies).toBe(1);
			expect(publishedCopies).toBe(1);
			expectOneStatement(statements, allTexts());
			expect(statements).toHaveLength(2);
			// The access check runs in the same statement as the read.
			expect(statements[statementContaining(statements, DRAFT_MARKER)].sql).toMatch(
				/project_relation/,
			);
			expect(result?.projectId).toBe(ownerProject.id);
			expect(result?.workflow.tags?.map((tag) => tag.name)).toEqual(expectedTagNames);
			expect(sortedProjectIds(result?.workflow.shared ?? [])).toEqual(allProjectIds());
		});

		it('loads each JSON payload once without tags', async () => {
			const { result, draftCopies, publishedCopies, statements } = await measure(
				async () =>
					await Container.get(WorkflowFinderService).findWorkflowForUser(
						workflow.id,
						owner,
						['workflow:read'],
						{ ...editorOptions, includeTags: false },
					),
			);

			expect(draftCopies).toBe(1);
			expect(publishedCopies).toBe(1);
			expectOneStatement(statements, [DRAFT_MARKER, PUBLISHED_MARKER, ...sharedProjectIds()]);
			expect(statements).toHaveLength(2);
			expect(result?.tags).toBeUndefined();
			expect(sortedProjectIds(result?.shared ?? [])).toEqual(allProjectIds());
		});

		it('returns null for a workflow the user cannot reach', async () => {
			const otherMember = await createMember();
			const result = await Container.get(WorkflowFinderService).findWorkflowForUser(
				workflow.id,
				otherMember,
				['workflow:read'],
				editorOptions,
			);

			expect(result).toBeNull();
		});

		it('sees uncommitted rows in the caller transaction', async () => {
			const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
			const rollback = new Error('roll back');
			let newTagId = '';

			await expect(
				sharedWorkflowRepository.runInTransaction({}, async (manager, ctx) => {
					const tag = await manager.save(manager.create(TagEntity, { name: uuid().slice(0, 20) }));
					newTagId = tag.id;
					await manager.insert(WorkflowTagMapping, {
						workflowId: workflow.id,
						tagId: tag.id,
					});

					const result = await sharedWorkflowRepository.findWorkflowWithOptions(workflow.id, {
						ctx,
						includeTags: true,
					});

					expect(result?.workflow.tags?.map(({ id }) => id)).toContain(newTagId);
					throw rollback;
				}),
			).rejects.toBe(rollback);

			const afterRollback = await sharedWorkflowRepository.findWorkflowWithOptions(workflow.id, {
				includeTags: true,
			});
			expect(afterRollback?.workflow.tags?.map(({ id }) => id)).not.toContain(newTagId);
		});
	});

	describe('saving and sub-workflow loading (WorkflowRepository.get)', () => {
		it('loads tags without repeating the JSON per tag', async () => {
			const { result, draftCopies, publishedCopies, statements } = await measure(
				async () =>
					await Container.get(WorkflowRepository).get(
						{ id: workflow.id },
						{ relations: ['tags', 'activeVersion'] },
					),
			);

			expect(draftCopies).toBe(1);
			expect(publishedCopies).toBe(1);
			expectOneStatement(statements, [DRAFT_MARKER, PUBLISHED_MARKER, ...expectedTagNames]);
			// TypeORM adds a DISTINCT query for `findOne`-style reads with joins.
			expect(statements).toHaveLength(2);
			expect(result?.tags?.map((tag) => tag.name)).toEqual(expectedTagNames);
			expect(result?.activeVersion?.versionId).toBe(publishedVersionId);
			expect(result?.shared).toBeUndefined();
		});

		it('loads shares without repeating the JSON per share', async () => {
			const { result, draftCopies, publishedCopies } = await measure(
				async () =>
					await Container.get(WorkflowRepository).get(
						{ id: workflow.id },
						{ relations: { activeVersion: true, shared: true } },
					),
			);

			expect(draftCopies).toBe(1);
			expect(publishedCopies).toBe(1);
			expect(sortedProjectIds(result?.shared ?? [])).toEqual(allProjectIds());
			expect(result?.shared.every((share) => share.project === undefined)).toBe(true);
			expect(result?.tags).toBeUndefined();
		});

		it('returns a workflow without tags as an empty list', async () => {
			const result = await Container.get(WorkflowRepository).get(
				{ id: untaggedWorkflow.id },
				{ relations: ['tags'] },
			);

			expect(result?.tags).toEqual([]);
		});

		it('returns null when nothing matches', async () => {
			const result = await Container.get(WorkflowRepository).get(
				{ id: 'does-not-exist' },
				{ relations: ['tags', 'activeVersion'] },
			);

			expect(result).toBeNull();
		});
	});

	describe('activation (WorkflowRepository.findById)', () => {
		it('loads shares with projects without repeating the JSON per share', async () => {
			const { result, draftCopies, publishedCopies, statements } = await measure(
				async () => await Container.get(WorkflowRepository).findById(workflow.id),
			);

			expect(draftCopies).toBe(1);
			expect(publishedCopies).toBe(1);
			expectOneStatement(statements, [DRAFT_MARKER, PUBLISHED_MARKER, ...sharedProjectIds()]);
			expect(statements).toHaveLength(1);
			expect(result?.activeVersion?.versionId).toBe(publishedVersionId);
			expect(sortedProjectIds(result?.shared ?? [])).toEqual(allProjectIds());
			expect(result?.shared.every((share) => share.project?.id === share.projectId)).toBe(true);
		});

		it('returns null for an unknown id', async () => {
			expect(await Container.get(WorkflowRepository).findById('does-not-exist')).toBeNull();
		});

		it('still loads a workflow that exists without shares', async () => {
			const workflowRepository = Container.get(WorkflowRepository);
			const unshared = await createWorkflow({ name: 'No shares' });

			try {
				const result = await workflowRepository.findById(unshared.id);

				expect(result?.id).toBe(unshared.id);
				expect(result?.shared).toEqual([]);
			} finally {
				await workflowRepository.delete(unshared.id);
			}
		});
	});

	describe('webhooks (WorkflowPublishedVersionRepository.getPublishedVersionWithRelations)', () => {
		it('loads shares without repeating the JSON per share', async () => {
			const { result, draftCopies, publishedCopies, statements } = await measure(
				async () =>
					await Container.get(WorkflowPublishedVersionRepository).getPublishedVersionWithRelations(
						workflow.id,
					),
			);

			expect(draftCopies).toBe(1);
			expect(publishedCopies).toBe(1);
			expectOneStatement(statements, [DRAFT_MARKER, PUBLISHED_MARKER, ...sharedProjectIds()]);
			expect(statements).toHaveLength(1);
			expect(result?.publishedVersion.versionId).toBe(publishedVersionId);
			expect(result?.workflow.versionId).toBe(draftVersionId);
			expect(sortedProjectIds(result?.workflow.shared ?? [])).toEqual(allProjectIds());
			expect(result?.workflow.shared.every((share) => share.project?.id === share.projectId)).toBe(
				true,
			);
		});

		it('returns null for a workflow without a published version', async () => {
			expect(
				await Container.get(WorkflowPublishedVersionRepository).getPublishedVersionWithRelations(
					untaggedWorkflow.id,
				),
			).toBeNull();
		});
	});

	describe('listing (WorkflowFinderService.findWorkflowsForUser)', () => {
		const publicApiOptions = {
			includePinnedData: true,
			includeTags: true,
			includeActiveVersion: true,
		};

		it('loads each JSON payload once per workflow', async () => {
			const { result, draftCopies, publishedCopies } = await measure(
				async () =>
					await Container.get(WorkflowFinderService).findWorkflowsForUser(
						owner,
						['workflow:read'],
						publicApiOptions,
					),
			);

			expect(draftCopies).toBe(1);
			expect(publishedCopies).toBe(1);

			const listed = result.workflows.find(({ id }) => id === workflow.id);
			expect(listed?.tags?.map((tag) => tag.name)).toEqual(expectedTagNames);
			expect(sortedProjectIds(listed?.shared ?? [])).toEqual(allProjectIds());
			expect(listed?.shared.every((share) => share.project === undefined)).toBe(true);
			expect(listed?.activeVersion?.versionId).toBe(publishedVersionId);

			const untagged = result.workflows.find(({ id }) => id === untaggedWorkflow.id);
			expect(untagged?.tags).toEqual([]);
			expect(untagged?.shared.map((share) => share.projectId)).toEqual([ownerProject.id]);
		});

		it('includes projects when asked', async () => {
			const { result } = await measure(
				async () =>
					await Container.get(WorkflowFinderService).findWorkflowsForUser(
						owner,
						['workflow:read'],
						{ ...publicApiOptions, includeProjects: true },
					),
			);

			const listed = result.workflows.find(({ id }) => id === workflow.id);
			expect(listed?.shared.every((share) => share.project?.id === share.projectId)).toBe(true);
		});

		it('keeps only the filtered project share when filtering by project', async () => {
			const { result, draftCopies } = await measure(
				async () =>
					await Container.get(WorkflowFinderService).findWorkflowsForUser(
						owner,
						['workflow:read'],
						{ ...publicApiOptions, filters: { projectId: opsProject.id } },
					),
			);

			expect(draftCopies).toBe(1);
			expect(result.workflows.map(({ id }) => id)).toEqual([workflow.id]);
			expect(result.workflows[0].shared.map((share) => share.projectId)).toEqual([opsProject.id]);
		});

		it('pages and counts by workflow, not by joined row', async () => {
			const { result } = await measure(
				async () =>
					await Container.get(WorkflowFinderService).findWorkflowsForUser(
						owner,
						['workflow:read'],
						{ ...publicApiOptions, offset: 0, limit: 1 },
					),
			);

			expect(result.count).toBe(2);
			expect(result.workflows).toHaveLength(1);
		});

		it('leaves tags out when not asked', async () => {
			const { result } = await measure(
				async () =>
					await Container.get(WorkflowFinderService).findWorkflowsForUser(
						owner,
						['workflow:read'],
						{ includeActiveVersion: true },
					),
			);

			expect(result.workflows.every((listed) => listed.tags === undefined)).toBe(true);
		});
	});

	describe('package export (WorkflowFinderService.findWorkflowsByIdsForUser)', () => {
		const options = { includeTags: true, includeActiveVersion: true, includeParentFolder: true };

		it.each([
			['the instance owner', () => owner],
			['a project member', () => member],
		])('loads each JSON payload once for %s', async (_, getUser) => {
			const { result, draftCopies, publishedCopies } = await measure(
				async () =>
					await Container.get(WorkflowFinderService).findWorkflowsByIdsForUser(
						[workflow.id, untaggedWorkflow.id],
						getUser(),
						['workflow:read'],
						options,
					),
			);

			expect(draftCopies).toBe(1);
			expect(publishedCopies).toBe(1);
			expect(result.map(({ id }) => id).sort()).toEqual([workflow.id, untaggedWorkflow.id].sort());

			const found = result.find(({ id }) => id === workflow.id);
			expect(found?.tags?.map((tag) => tag.name)).toEqual(expectedTagNames);
			expect(found?.activeVersion?.versionId).toBe(publishedVersionId);
			expect(found?.parentFolder?.id).toBe(folder.id);
			expect(result.find(({ id }) => id === untaggedWorkflow.id)?.tags).toEqual([]);
		});

		it('skips workflows the user cannot reach', async () => {
			const otherMember = await createMember();
			const result = await Container.get(WorkflowFinderService).findWorkflowsByIdsForUser(
				[workflow.id],
				otherMember,
				['workflow:read'],
				options,
			);

			expect(result).toEqual([]);
		});
	});

	describe('folder transfer (WorkflowRepository.findInFoldersForTransfer)', () => {
		it('loads shares with projects without repeating the JSON per share', async () => {
			const { result, draftCopies, publishedCopies } = await measure(
				async () =>
					await Container.get(WorkflowRepository).findInFoldersForTransfer([folder.id], {
						withNodes: true,
					}),
			);

			expect(draftCopies).toBe(1);
			expect(publishedCopies).toBe(1);
			expect(result.map(({ id }) => id)).toEqual([workflow.id]);
			expect(result[0].activeVersion?.versionId).toBe(publishedVersionId);
			expect(sortedProjectIds(result[0].shared)).toEqual(allProjectIds());
			expect(result[0].shared.every((share) => share.project?.id === share.projectId)).toBe(true);
		});

		it('leaves the nodes out when not asked', async () => {
			const { result, draftCopies, publishedCopies } = await measure(
				async () =>
					await Container.get(WorkflowRepository).findInFoldersForTransfer([folder.id], {
						withNodes: false,
					}),
			);

			expect(draftCopies).toBe(0);
			expect(publishedCopies).toBe(0);
			expect(sortedProjectIds(result[0].shared)).toEqual(allProjectIds());
		});
	});

	describe('reading many workflows by id (WorkflowFinderService.findWorkflowsByIdsForUser)', () => {
		it('reads ids in batches the database accepts, each with its access check', async () => {
			// 10,001 ids span two batches. Only the first and the last exist.
			const ids = Array.from({ length: 10_001 }, (_, index) =>
				index === 0 ? workflow.id : index === 10_000 ? untaggedWorkflow.id : uuid(),
			);

			const { result, statements } = await measure(
				async () =>
					await Container.get(WorkflowFinderService).findWorkflowsByIdsForUser(
						ids,
						member,
						['workflow:read'],
						{ includeTags: true },
					),
			);

			const workflowReads = statements.filter(({ sql }) => /workflow_entity/.test(sql));
			expect(workflowReads).toHaveLength(2);
			expect(workflowReads.every(({ sql }) => /project_relation/.test(sql))).toBe(true);
			expect(result.map(({ id }) => id).sort()).toEqual([workflow.id, untaggedWorkflow.id].sort());
			expect(result.find(({ id }) => id === workflow.id)?.tags?.map(({ name }) => name)).toEqual(
				expectedTagNames,
			);
			expect(result.find(({ id }) => id === untaggedWorkflow.id)?.tags).toEqual([]);
		});
	});

	describe('a workflow shared with many projects', () => {
		it('opens with tags on every database', async () => {
			const projectRepository = Container.get(ProjectRepository);
			const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
			const widelyShared = await createWorkflowWithHistory({ name: 'Widely shared' }, ownerProject);
			await createTag({}, widelyShared);

			// SQLite rejects expressions nested more than 1,000 levels deep, so a loader
			// that writes one OR term per share would fail here.
			const shareCount = 1_100;
			const projects = Array.from({ length: shareCount }, (_, index) =>
				projectRepository.create({ id: uuid().slice(0, 16), name: `Team ${index}`, type: 'team' }),
			);
			for (let start = 0; start < projects.length; start += 100) {
				const batch = projects.slice(start, start + 100);
				await projectRepository.insert(batch);
				await sharedWorkflowRepository.insert(
					batch.map((project) => ({
						workflowId: widelyShared.id,
						projectId: project.id,
						role: 'workflow:editor' as const,
					})),
				);
			}

			const result = await Container.get(WorkflowFinderService).findWorkflowForUser(
				widelyShared.id,
				owner,
				['workflow:read'],
				{ includeTags: true, includeParentFolder: true, includeActiveVersion: true },
			);

			expect(result?.shared).toHaveLength(shareCount + 1);
			expect(result?.tags).toHaveLength(1);
		});
	});
});
