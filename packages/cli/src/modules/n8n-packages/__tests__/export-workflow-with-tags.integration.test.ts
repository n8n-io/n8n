import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { TagRepository, WorkflowTagMappingRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { createFolder } from '@test-integration/db/folders';
import { assignTagToWorkflow, createTag } from '@test-integration/db/tags';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import { readExport, streamToBuffer } from './utils/tar-support';
import type { UnpackedEntry } from './utils/tar-support';
import { buildWorkflowCallingSubWorkflow } from './utils/test-builders';

const licenseMocker = new LicenseMocker();

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	await initNodeTypes();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowTagMapping',
		'TagEntity',
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'ProjectRelation',
		'Project',
	]);
});

function tagFiles(entries: UnpackedEntry[]) {
	return entries.filter((entry) => entry.name.endsWith('/tag.json'));
}

function workflowJson(entries: UnpackedEntry[], target: string) {
	const file = entries.find((entry) => entry.name === `${target}/workflow.json`);
	if (!file) throw new Error(`missing ${target}/workflow.json`);
	return jsonParse<Record<string, unknown>>(file.content.toString());
}

describe('workflow package export — with tags', () => {
	let service: N8nPackagesService;

	beforeAll(() => {
		service = Container.get(N8nPackagesService);
	});

	it('bundles referenced tags, writes tagIds and catalogs them in manifest and requirements', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const workflow = await createWorkflow({ name: 'Tagged workflow' }, project);
		// Created in reverse of sorted order so the exact-order assertions pin the sort.
		const beta = await createTag({ name: 'beta' }, workflow);
		const alpha = await createTag({ name: 'alpha' }, workflow);

		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
		try {
			const { stream } = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
			const { manifest, entries } = await readExport(stream);

			expect(manifest.tags).toEqual([
				{ id: alpha.id, name: 'alpha', target: 'tags/alpha' },
				{ id: beta.id, name: 'beta', target: 'tags/beta' },
			]);
			expect(manifest.requirements!.tags).toEqual([
				{ id: alpha.id, name: 'alpha', usedByWorkflows: [workflow.id] },
				{ id: beta.id, name: 'beta', usedByWorkflows: [workflow.id] },
			]);

			const serialized = workflowJson(entries, manifest.workflows![0].target);
			expect(serialized.tagIds).toEqual([alpha.id, beta.id]);

			for (const entry of manifest.tags!) {
				const file = entries.find((e) => e.name === `${entry.target}/tag.json`);
				expect(file).toBeDefined();
				const parsed = jsonParse<Record<string, unknown>>(file!.content.toString());
				expect(parsed).toEqual({ id: entry.id, name: entry.name });
			}

			const exportedEvents = emitSpy.mock.calls.filter(([name]) => name === 'n8n-package-exported');
			expect(exportedEvents).toHaveLength(1);
			const payload = exportedEvents[0][1] as RelayEventMap['n8n-package-exported'];
			expect(payload.counts.tags).toBe(2);
		} finally {
			emitSpy.mockRestore();
		}
	});

	it('writes a tag shared by two workflows once', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const wfA = await createWorkflow({ name: 'Workflow A' }, project);
		const wfB = await createWorkflow({ name: 'Workflow B' }, project);
		const tag = await createTag({ name: 'shared' });
		await assignTagToWorkflow(tag, wfA);
		await assignTagToWorkflow(tag, wfB);

		const { stream } = await service.exportPackage({ user: owner, workflowIds: [wfA.id, wfB.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest.tags).toEqual([{ id: tag.id, name: 'shared', target: 'tags/shared' }]);
		expect(tagFiles(entries)).toHaveLength(1);
		expect(manifest.requirements!.tags).toEqual([
			{ id: tag.id, name: 'shared', usedByWorkflows: [wfA.id, wfB.id] },
		]);

		for (const entry of manifest.workflows!) {
			expect(workflowJson(entries, entry.target).tagIds).toEqual([tag.id]);
		}
	});

	it('exports an untagged workflow without any tag artifacts', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const workflow = await createWorkflow({ name: 'Untagged workflow' }, project);

		const { stream } = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(workflowJson(entries, manifest.workflows![0].target)).not.toHaveProperty('tagIds');
		expect(tagFiles(entries)).toEqual([]);
		expect(manifest).not.toHaveProperty('tags');
		expect(manifest.requirements).toEqual({ nodeTypes: expect.any(Array) });
	});

	it('with includeTags=false exports a tagged folder workflow without any tag artifacts', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const folder = await createFolder(project, { name: 'ops' });
		const workflow = await createWorkflow({ name: 'In folder', parentFolder: folder }, project);
		await createTag({ name: 'prod' }, workflow);

		const { stream } = await service.exportPackage({
			user: owner,
			folderIds: [folder.id],
			includeTags: false,
		});
		const { manifest, entries } = await readExport(stream);

		expect(workflowJson(entries, manifest.workflows![0].target)).not.toHaveProperty('tagIds');
		expect(tagFiles(entries)).toEqual([]);
		expect(manifest).not.toHaveProperty('tags');
		expect(manifest.requirements).toEqual({ nodeTypes: expect.any(Array) });
	});

	it('writes tags at the package root for a project export', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('team-ligo', owner);
		const folder = await createFolder(project, { name: 'ops' });
		const workflow = await createWorkflow({ name: 'Deep workflow', parentFolder: folder }, project);
		const tag = await createTag({ name: 'prod' }, workflow);

		const { stream } = await service.exportPackage({ user: owner, projectIds: [project.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest.tags).toEqual([{ id: tag.id, name: 'prod', target: 'tags/prod' }]);
		expect(entries.find((e) => e.name === 'tags/prod/tag.json')).toBeDefined();

		const workflowEntry = manifest.workflows!.find((entry) => entry.id === workflow.id)!;
		expect(workflowEntry.target).toMatch(/^projects\//);
		expect(workflowJson(entries, workflowEntry.target).tagIds).toEqual([tag.id]);
	});

	it('bundles the tags of auto-included sub-workflows', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const sub = await createWorkflow({ name: 'Sub workflow' }, project);
		const tag = await createTag({ name: 'prod' }, sub);
		const parent = await buildWorkflowCallingSubWorkflow({
			name: 'Parent workflow',
			project,
			subWorkflowId: sub.id,
		});

		const { stream } = await service.exportPackage({
			user: owner,
			workflowIds: [parent.id],
			missingWorkflowDependencyPolicy: 'include-in-package',
		});
		const { manifest, entries } = await readExport(stream);

		expect(manifest.tags).toEqual([{ id: tag.id, name: 'prod', target: 'tags/prod' }]);
		expect(manifest.requirements!.tags).toEqual([
			{ id: tag.id, name: 'prod', usedByWorkflows: [sub.id] },
		]);

		const subEntry = manifest.workflows!.find((entry) => entry.id === sub.id)!;
		expect(workflowJson(entries, subEntry.target).tagIds).toEqual([tag.id]);
	});

	it('skips tags silently when workflow tags are disabled on the instance', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const workflow = await createWorkflow({ name: 'Tagged workflow' }, project);
		await createTag({ name: 'prod' }, workflow);

		const globalConfig = Container.get(GlobalConfig);
		globalConfig.tags.disabled = true;
		try {
			const { stream } = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
			const { manifest, entries } = await readExport(stream);

			expect(workflowJson(entries, manifest.workflows![0].target)).not.toHaveProperty('tagIds');
			expect(tagFiles(entries)).toEqual([]);
			expect(manifest).not.toHaveProperty('tags');
			expect(manifest.requirements).toEqual({ nodeTypes: expect.any(Array) });
		} finally {
			globalConfig.tags.disabled = false;
		}
	});

	it('imports a tag-bearing package as a no-op for tags', async () => {
		const owner = await createOwner();
		const source = await createTeamProject('Source project', owner);
		const workflow = await createWorkflow({ name: 'Tagged workflow' }, source);
		await createTag({ name: 'prod' }, workflow);
		const packageBuffer = await streamToBuffer(
			(await service.exportPackage({ user: owner, workflowIds: [workflow.id] })).stream,
		);

		const target = await createTeamProject('Target project', owner);
		const result = await service.importPackage({
			user: owner,
			projectId: target.id,
			packageBuffer,
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
		});

		expect(result.workflows).toHaveLength(1);
		expect(result.workflows[0].status).toBe('created');

		// Only the source tag and the source workflow's mapping remain — the import created neither.
		const mappings = await Container.get(WorkflowTagMappingRepository).find();
		expect(mappings).toHaveLength(1);
		expect(mappings[0].workflowId).toBe(workflow.id);
		expect(await Container.get(TagRepository).count()).toBe(1);
	});
});
