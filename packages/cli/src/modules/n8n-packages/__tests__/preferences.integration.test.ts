import { LicenseState } from '@n8n/backend-common';
import {
	AiPreferenceService,
	InstanceWriteAccessService,
	ProjectMutationHooksProxy,
} from '@n8n/backend-services';
import {
	createTeamProject,
	getPersonalProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import {
	AiPreferenceRepository,
	ProjectRepository,
	WorkflowRepository,
	Person,
	Role,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { randomUUID } from 'node:crypto';

import { ProjectService } from '@/services/project.service.ee';
import { AiPreferenceSettingsService } from '@/services/ai-preference-settings.service';
import { createMember, createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import { ImportOrchestrator } from '../engine/import-orchestrator';
import { ProjectPackageImporter } from '../engine/project-package-importer';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import { TarPackageWriter } from '../io/tar/tar-package-writer';
import { PackageImportConfig } from '../n8n-packages.config';
import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportPackageRequest } from '../n8n-packages.types';
import type { PackageManifest } from '../spec/manifest.schema';
import { importPackageRequest } from './fixtures/import-request';
import { serializedWorkflow, type PackageWorkflow } from './fixtures/package-fixtures';
import { streamToBuffer, unpackTar } from './utils/tar-support';

const license = new LicenseMocker();
let service: N8nPackagesService;
let preferences: AiPreferenceService;
let repository: AiPreferenceRepository;
let owner: User;
let member: User;
let enabled = true;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	license.mockLicenseState(Container.get(LicenseState));
	license.setDefaults({
		features: ['feat:projectRole:admin'],
		quotas: { 'quota:maxTeamProjects': 100 },
	});
	vi.spyOn(Container.get(AiPreferenceSettingsService), 'isEnabled', 'get').mockImplementation(
		() => enabled,
	);
	service = Container.get(N8nPackagesService);
	preferences = Container.get(AiPreferenceService);
	repository = Container.get(AiPreferenceRepository);
	owner = await createOwner();
	member = await createMember();
});

afterAll(async () => await testDb.terminate());
beforeEach(async () => {
	license.reset();
	vi.spyOn(Container.get(AiPreferenceSettingsService), 'isEnabled', 'get').mockImplementation(
		() => enabled,
	);
	await repository.delete({});
	Container.get(InstanceWriteAccessService).setReadOnly(false);
	enabled = true;
});

afterEach(() => Container.get(InstanceWriteAccessService).setReadOnly(false));

async function bundle(
	items: Array<{ id: string; scope: string; content: string; projectId?: string }>,
	projectId?: string,
	includeCollection = true,
	options: { manifest?: Partial<PackageManifest>; workflow?: PackageWorkflow } = {},
) {
	const writer = new TarPackageWriter();
	const manifest: PackageManifest = {
		packageFormatVersion: includeCollection ? '3' : '1',
		sourceId: 'source-instance',
		sourceN8nVersion: '2.50.0',
		...(includeCollection ? { preferences: [] } : {}),
	};
	if (projectId) {
		manifest.projects = [
			{ id: projectId, name: 'Shared project', target: `projects/${projectId}` },
		];
	}
	for (const { projectId: itemProjectId, ...item } of items) {
		const target = `${itemProjectId ? `projects/${itemProjectId}/` : ''}preferences/${item.id}`;
		manifest.preferences!.push({ id: item.id, name: 'Preference', target });
		writer.writeFile(`${target}/preference.json`, JSON.stringify(item));
	}
	Object.assign(manifest, options.manifest);
	for (const project of manifest.projects ?? []) {
		writer.writeFile(
			`${project.target}/project.json`,
			JSON.stringify({ id: project.id, name: project.name }),
		);
	}
	if (options.workflow) {
		const { versionId, publishedVersionId, ...workflow } = options.workflow;
		const target = `${projectId ? `projects/${projectId}/` : ''}workflows/${workflow.id}`;
		manifest.workflows = [{ id: workflow.id, name: workflow.name, target }];
		writer.writeFile(`${target}/workflow.json`, JSON.stringify(workflow));
		writer.writeFile(
			`${target}/workflow-metadata.json`,
			JSON.stringify({ versionId, publishedVersionId }),
		);
	}
	writer.writeFile('manifest.json', JSON.stringify(manifest));
	return { manifest, buffer: await streamToBuffer(writer.finalize()) };
}

async function importItems(
	items: Parameters<typeof bundle>[0],
	options: Partial<ImportPackageRequest> = {},
) {
	const { buffer } = await bundle(items);
	return await service.importPackage(
		importPackageRequest({ user: owner, packageBuffer: buffer, ...options }),
	);
}

it('exports project Preferences and creates the same identities in a destination project', async () => {
	const project = await createTeamProject('Portable rules', owner);
	const row = await preferences.create(
		owner,
		{ scope: 'project', projectId: project.id, content: 'Use clear names' },
		'ui',
	);
	const exported = await service.exportPackage({
		user: owner,
		projectIds: [project.id],
		includePreferences: true,
	});
	const buffer = await streamToBuffer(exported.stream);
	const files = await unpackTar(buffer);
	const preferenceFile = files.find(({ name }) => name.endsWith('/preference.json'))!;
	expect(JSON.parse(preferenceFile.content.toString())).toEqual({
		id: row.id,
		scope: 'project',
		content: row.content,
	});
	expect(exported.counts.preferences).toBe(1);
	// Clear source data before import to model an independent destination.
	await Container.get(ProjectRepository).delete(project.id);
	const destinationActor = await createOwner();
	const result = await service.importPackage(
		importPackageRequest({ user: destinationActor, packageBuffer: buffer }),
	);
	expect(await repository.findOneByOrFail({ id: row.id })).toMatchObject({
		content: row.content,
		projectId: project.id,
		userId: null,
		source: 'import',
		createdById: destinationActor.id,
	});
	expect(result.counts.preferences).toEqual({ created: 1, updated: 0, removed: 0, skipped: 0 });
});

it('maps loose project Preferences to the requested destination project', async () => {
	const project = await createTeamProject('Destination', owner);
	const id = randomUUID();
	await importItems([{ id, scope: 'project', content: 'Use short names' }], {
		projectId: project.id,
	});
	expect(await repository.findOneByOrFail({ id })).toMatchObject({
		projectId: project.id,
		userId: null,
	});
});

it('imports instance Preferences without workflow API key scopes and skips an identical repeat', async () => {
	const id = randomUUID();
	const items = [{ id, scope: 'instance', content: 'Use short steps' }];
	await importItems(items, { apiKeyScopes: ['aiPreference:create'] });
	const before = await repository.findOneByOrFail({ id });
	const result = await importItems(items, { apiKeyScopes: ['aiPreference:read'] });
	expect(result.counts.preferences).toEqual({ created: 0, updated: 0, removed: 0, skipped: 1 });
	expect((await repository.findOneByOrFail({ id })).updatedAt).toEqual(before.updatedAt);
});

it('requires explicit replacement and keeps the existing creator and source', async () => {
	const existing = await preferences.create(
		owner,
		{ scope: 'instance', content: 'Original' },
		'ui',
	);
	const items = [{ id: existing.id, scope: 'instance', content: 'Replacement' }];
	await expect(importItems(items)).rejects.toMatchObject({ meta: { issues: expect.any(Array) } });
	expect((await repository.findOneByOrFail({ id: existing.id })).content).toBe('Original');
	await importItems(items, { preferenceConflictPolicy: 'skip' });
	await importItems(items, { preferenceConflictPolicy: 'replace' });
	expect(await repository.findOneByOrFail({ id: existing.id })).toMatchObject({
		content: 'Replacement',
		source: 'ui',
		createdById: owner.id,
	});
});

it('imports only explicitly selected Preferences and removes only selected destination rows', async () => {
	const project = await createTeamProject('Selection', owner);
	const remove = await preferences.create(
		owner,
		{ scope: 'project', projectId: project.id, content: 'Remove' },
		'ui',
	);
	const keep = await preferences.create(owner, { scope: 'user', content: 'Keep personal' }, 'ui');
	const [selected, unselected, instance] = [randomUUID(), randomUUID(), randomUUID()];
	const { buffer } = await bundle(
		[
			{ id: selected, scope: 'project', projectId: project.id, content: 'Selected' },
			{ id: unselected, scope: 'project', projectId: project.id, content: 'Unselected' },
			{ id: instance, scope: 'instance', content: 'Instance' },
		],
		project.id,
	);
	const result = await service.importPackageSelection(
		{ user: owner, publicApi: false, packageBuffer: buffer },
		{
			selectedProjectId: project.id,
			selectedWorkflowIds: [],
			selectedPreferenceIds: [selected, instance],
			deletedPreferenceIds: [remove.id],
		},
	);
	expect(result.counts.preferences).toEqual({ created: 2, updated: 0, removed: 1, skipped: 0 });
	expect((await repository.find()).map(({ id }) => id).sort()).toEqual(
		[selected, instance, keep.id].sort(),
	);
});

it('validates the final batch after selected removals at the scope limit', async () => {
	const rows = [];
	for (let i = 0; i < 50; i++)
		rows.push(
			await preferences.create(owner, { scope: 'instance', content: `Existing ${i}` }, 'ui'),
		);
	const id = randomUUID();
	await expect(importItems([{ id, scope: 'instance', content: 'New' }])).rejects.toThrow(
		'Import blocked',
	);
	await importItems([{ id, scope: 'instance', content: 'New' }], {
		deletedPreferenceIds: [rows[0].id],
	});
	expect(await repository.count()).toBe(50);
	expect(await repository.existsBy({ id: rows[0].id })).toBe(false);
});

it.each(['', '  ', 'x'.repeat(2001)])(
	'rejects invalid content before any rows are written',
	async (content) => {
		await expect(
			importItems([
				{ id: randomUUID(), scope: 'instance', content: 'Valid' },
				{ id: randomUUID(), scope: 'instance', content },
			]),
		).rejects.toThrow();
		expect(await repository.count()).toBe(0);
	},
);

it('rejects duplicate content and identity scope changes', async () => {
	const row = await preferences.create(owner, { scope: 'user', content: 'Personal' }, 'ui');
	await expect(
		importItems([{ id: row.id, scope: 'instance', content: 'Changed' }], {
			preferenceConflictPolicy: 'replace',
		}),
	).rejects.toThrow('Import blocked');
	await expect(
		importItems([
			{ id: randomUUID(), scope: 'instance', content: 'Same' },
			{ id: randomUUID(), scope: 'instance', content: 'Same' },
		]),
	).rejects.toThrow('Import blocked');
	expect(await repository.count()).toBe(1);
});

it('rejects a stale plan before a new project shell is written', async () => {
	const row = await preferences.create(owner, { scope: 'instance', content: 'Before' }, 'ui');
	const { buffer, manifest } = await bundle(
		[{ id: row.id, scope: 'instance', content: 'After' }],
		'new-project',
	);
	const importer = Container.get(ProjectPackageImporter);
	const request = {
		...importPackageRequest({
			user: owner,
			packageBuffer: buffer,
			preferenceConflictPolicy: 'replace',
		}),
		folderConflictPolicy: 'merge' as const,
	};
	const plan = await importer.planImport(
		request,
		new TarPackageReader(buffer, Container.get(PackageImportConfig)),
		manifest,
		'package-import',
		'check',
	);
	expect(plan.issues).toEqual([]);
	await preferences.update(owner, row.id, { content: 'Edited after preview' });
	await expect(importer.applyPlan(plan)).rejects.toThrow('Import blocked');
	expect(await Container.get(ProjectRepository).existsBy({ id: 'new-project' })).toBe(false);
});

it('checks permissions and actual API key actions before writing', async () => {
	const items = [{ id: randomUUID(), scope: 'instance', content: 'Shared' }];
	await expect(importItems(items, { user: member })).rejects.toThrow('Import blocked');
	await expect(importItems(items, { apiKeyScopes: ['aiPreference:read'] })).rejects.toThrow(
		'Forbidden',
	);
	expect(await repository.count()).toBe(0);
});

it('protects shared creates, edits, moves, removals and package imports while keeping personal writes', async () => {
	const shared = await preferences.create(owner, { scope: 'instance', content: 'Shared' }, 'ui');
	const personalProject = await getPersonalProject(owner);
	Container.get(InstanceWriteAccessService).setReadOnly(true);
	await expect(
		preferences.create(owner, { scope: 'instance', content: 'New' }, 'api'),
	).rejects.toThrow('protected');
	await expect(preferences.update(owner, shared.id, { content: 'Changed' })).rejects.toThrow(
		'protected',
	);
	await expect(
		preferences.update(owner, shared.id, { scope: 'user', userId: owner.id, content: 'Moved' }),
	).rejects.toThrow('protected');
	await expect(preferences.delete(owner, shared.id)).rejects.toThrow('protected');
	await expect(
		importItems([{ id: randomUUID(), scope: 'instance', content: 'New' }]),
	).rejects.toThrow('Import blocked');
	const own = await preferences.create(owner, { scope: 'user', content: 'Personal' }, 'ui');
	await expect(
		preferences.update(owner, own.id, { scope: 'instance', content: 'Moved' }),
	).rejects.toThrow('protected');
	await preferences.update(owner, own.id, { content: 'Personal edit' });
	await preferences.delete(owner, own.id);
	await preferences.create(
		owner,
		{ scope: 'project', projectId: personalProject.id, content: 'Personal project' },
		'ui',
	);
});

it('preserves destination rows when unavailable or the collection is absent', async () => {
	const row = await preferences.create(owner, { scope: 'instance', content: 'Keep' }, 'ui');
	enabled = false;
	await expect(
		importItems([{ id: randomUUID(), scope: 'instance', content: 'New' }]),
	).rejects.toMatchObject({
		httpStatusCode: 422,
		meta: { issues: [expect.objectContaining({ kind: 'unavailable' })] },
	});
	const { buffer } = await bundle([], undefined, false);
	await service.importPackage(importPackageRequest({ user: owner, packageBuffer: buffer }));
	await expect(
		service.importPackage(
			importPackageRequest({ user: owner, packageBuffer: buffer, deletedPreferenceIds: [row.id] }),
		),
	).rejects.toThrow('collection');
	expect(await repository.count()).toBe(1);
});

it('does not export personal Preferences', async () => {
	const row = await preferences.create(owner, { scope: 'user', content: 'Personal' }, 'ui');
	await expect(service.exportPackage({ user: owner, preferenceIds: [row.id] })).rejects.toThrow(
		'Personal',
	);
});

it('repeats explicit removal without removing unrelated rows', async () => {
	const kept = await preferences.create(owner, { scope: 'instance', content: 'Keep' }, 'ui');
	const row = await preferences.create(owner, { scope: 'instance', content: 'Remove' }, 'ui');
	await importItems([], { deletedPreferenceIds: [row.id], apiKeyScopes: ['aiPreference:delete'] });
	const result = await importItems([], {
		deletedPreferenceIds: [row.id],
		apiKeyScopes: ['aiPreference:read'],
	});
	expect(result.counts.preferences).toEqual({ created: 0, updated: 0, removed: 0, skipped: 1 });
	expect(await repository.findOneByOrFail({ id: kept.id })).toMatchObject({ content: 'Keep' });
});

it('rejects target changes after planning before writing the Preference batch', async () => {
	const row = await preferences.create(owner, { scope: 'instance', content: 'Original' }, 'ui');
	const addedId = randomUUID();
	const plan = await preferences.planSharedChanges(
		owner,
		[
			{ id: addedId, scope: 'instance', content: 'New' },
			{ id: row.id, scope: 'instance', content: 'Changed' },
		],
		'replace',
	);
	await preferences.update(owner, row.id, {
		scope: 'user',
		userId: owner.id,
		content: row.content,
	});
	await expect(preferences.applySharedChanges(owner, plan)).rejects.toThrow('changed');
	expect(await repository.existsBy({ id: addedId })).toBe(false);
	expect((await repository.findOneByOrFail({ id: row.id })).userId).toBe(owner.id);
});

it.each(['update', 'delete'] as const)(
	'reports earlier writes when a conditional %s detects a newer row',
	async (action) => {
		const firstId = '00000000-0000-4000-8000-000000000001';
		const lastId = '00000000-0000-4000-8000-000000000002';
		await repository.insert({
			id: lastId,
			content: 'Original',
			userId: null,
			projectId: null,
			source: 'ui',
			createdById: owner.id,
		});
		const plan = await preferences.planSharedChanges(
			owner,
			[
				{ id: firstId, scope: 'instance', content: 'New' },
				{
					id: lastId,
					scope: 'instance',
					...(action === 'update' ? { content: 'Imported edit' } : {}),
				},
			],
			'replace',
		);
		expect(plan.issues).toEqual([]);
		await preferences.update(owner, lastId, { content: 'Newer edit' });
		// Model a preview that passed before the newer edit committed.
		const preview = vi.spyOn(repository, 'checkUnchanged').mockResolvedValueOnce(undefined);
		const insert = vi.spyOn(repository, 'createPreference');
		try {
			await expect(preferences.applySharedChanges(owner, plan)).rejects.toMatchObject({
				cause: { meta: { reason: 'stale' } },
				completed: [{ id: firstId, scope: 'instance', status: 'create' }],
				preferenceId: lastId,
			});
			expect(insert).toHaveBeenCalledOnce();
			expect(await repository.existsBy({ id: firstId })).toBe(true);
			expect(await repository.findOneByOrFail({ id: lastId })).toMatchObject({
				content: 'Newer edit',
			});
		} finally {
			preview.mockRestore();
			insert.mockRestore();
		}
	},
);

it('reports the saved outcomes and counts when a later Preference write conflicts', async () => {
	const firstId = randomUUID();
	const secondId = randomUUID();
	const create = repository.createPreference.bind(repository);
	const write = vi
		.spyOn(repository, 'createPreference')
		.mockImplementationOnce(create)
		.mockRejectedValueOnce(new ConflictError('The Preference changed.'));
	try {
		await expect(
			importItems([
				{ id: firstId, scope: 'instance', content: 'First' },
				{ id: secondId, scope: 'instance', content: 'Second' },
			]),
		).rejects.toMatchObject({
			httpStatusCode: 409,
			meta: {
				issues: [{ type: 'preference-conflict', kind: 'conflict', preferenceId: secondId }],
				preferences: [{ id: firstId, scope: 'instance', status: 'create' }],
				counts: { preferences: { created: 1, updated: 0, removed: 0, skipped: 0 } },
			},
		});
		expect(await repository.existsBy({ id: firstId })).toBe(true);
		expect(await repository.existsBy({ id: secondId })).toBe(false);
	} finally {
		write.mockRestore();
	}
});

it('accepts only one import that claims the same identity in different projects', async () => {
	const projects = await Promise.all([
		createTeamProject('First destination', owner),
		createTeamProject('Second destination', owner),
	]);
	const id = randomUUID();
	const plans = await Promise.all(
		projects.map(
			async (project) =>
				await preferences.planSharedChanges(owner, [
					{ id, scope: 'project', projectId: project.id, content: project.name },
				]),
		),
	);
	for (const plan of plans) expect(plan.issues).toEqual([]);
	const outcomes = await Promise.allSettled(
		plans.map(async (plan) => await preferences.applySharedChanges(owner, plan)),
	);
	expect(outcomes.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
	const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
	expect(
		rejected?.status === 'rejected' && (rejected.reason.cause ?? rejected.reason),
	).toMatchObject({ httpStatusCode: 409 });
	expect(await repository.count()).toBe(1);
	const saved = await repository.findOneByOrFail({ id });
	const winningProject = projects.find((project) => project.id === saved.projectId);
	expect(saved.content).toBe(winningProject?.name);
});

it.each([{}, { workflows: [], credentials: [], agents: [] }])(
	'imports a Preference-only package with empty requirements: %j',
	async (requirements) => {
		const { buffer } = await bundle(
			[{ id: randomUUID(), scope: 'instance', content: 'Shared' }],
			undefined,
			true,
			{ manifest: { requirements } },
		);
		const result = await service.importPackage(
			importPackageRequest({
				user: owner,
				packageBuffer: buffer,
				apiKeyScopes: ['aiPreference:create'],
			}),
		);
		expect(result.counts.preferences?.created).toBe(1);
	},
);

it('removes an explicit project Preference from a package with an empty projects list', async () => {
	const project = await createTeamProject('Destination', owner);
	const row = await preferences.create(
		owner,
		{ scope: 'project', projectId: project.id, content: 'Remove' },
		'ui',
	);
	const { buffer } = await bundle([], undefined, true, { manifest: { projects: [] } });
	const result = await service.importPackage(
		importPackageRequest({
			user: owner,
			packageBuffer: buffer,
			projectId: project.id,
			deletedPreferenceIds: [row.id],
			apiKeyScopes: ['aiPreference:delete'],
		}),
	);
	expect(result.counts.preferences?.removed).toBe(1);
	expect(await repository.existsBy({ id: row.id })).toBe(false);
});

it('requires project Preference access for a Preference-only import', async () => {
	const project = await createTeamProject('Destination', owner);
	const id = randomUUID();
	const items = [{ id, scope: 'project', content: 'Shared' }];
	await expect(
		importItems(items, {
			user: member,
			projectId: project.id,
			apiKeyScopes: ['aiPreference:create'],
		}),
	).rejects.toMatchObject({ meta: { issues: [expect.objectContaining({ kind: 'forbidden' })] } });
	expect(await repository.existsBy({ id })).toBe(false);
	const result = await importItems(items, {
		projectId: project.id,
		apiKeyScopes: ['aiPreference:create'],
	});
	expect(result.preferences).toEqual([
		{ id, scope: 'project', projectId: project.id, status: 'create' },
	]);
});

it.each([false, true])(
	'rejects a concurrent Preference edit before content writes in a project package=%s',
	async (projectPackage) => {
		const project = await createTeamProject('Shared project', owner);
		const row = await preferences.create(owner, { scope: 'instance', content: 'Before' }, 'ui');
		const workflow = serializedWorkflow({ id: randomUUID(), nodes: [] });
		const { buffer } = await bundle(
			[{ id: row.id, scope: 'instance', content: 'Imported' }],
			projectPackage ? project.id : undefined,
			true,
			{ workflow },
		);
		const orchestrator = Container.get(ImportOrchestrator);
		const applyContent = vi.spyOn(orchestrator, 'apply');
		const publish = vi.spyOn(orchestrator, 'publishPackage');
		const applyPreferences = preferences.applySharedChanges.bind(preferences);
		const apply = vi
			.spyOn(preferences, 'applySharedChanges')
			.mockImplementationOnce(async (user, plan) => {
				await preferences.update(owner, row.id, { content: 'Concurrent edit' });
				return await applyPreferences(user, plan);
			});
		try {
			await expect(
				service.importPackage(
					importPackageRequest({
						user: owner,
						packageBuffer: buffer,
						...(projectPackage ? {} : { projectId: project.id }),
						preferenceConflictPolicy: 'replace',
					}),
				),
			).rejects.toThrow('Import blocked');
			expect(apply).toHaveBeenCalledOnce();
			expect(applyContent).not.toHaveBeenCalled();
			expect(publish).not.toHaveBeenCalled();
			expect(await Container.get(WorkflowRepository).existsBy({ id: workflow.id })).toBe(false);
			expect(await repository.findOneByOrFail({ id: row.id })).toMatchObject({
				content: 'Concurrent edit',
			});
		} finally {
			apply.mockRestore();
			applyContent.mockRestore();
			publish.mockRestore();
		}
	},
);

it('keeps a created project when a Preference changes after the initial check', async () => {
	const row = await preferences.create(owner, { scope: 'instance', content: 'Before' }, 'ui');
	const projectId = randomUUID();
	const newPreferenceId = randomUUID();
	const { buffer } = await bundle(
		[
			{ id: row.id, scope: 'instance', content: 'Imported' },
			{ id: newPreferenceId, scope: 'project', projectId, content: 'Project preference' },
		],
		projectId,
	);
	const projects = Container.get(ProjectService);
	const create = projects.createTeamProject.bind(projects);
	const createSpy = vi
		.spyOn(projects, 'createTeamProject')
		.mockImplementationOnce(async (...args) => {
			await preferences.update(owner, row.id, { content: 'Concurrent edit' });
			return await create(...args);
		});
	const hooks = vi.spyOn(Container.get(ProjectMutationHooksProxy), 'afterTeamProjectCreated');
	try {
		await expect(
			service.importPackage(
				importPackageRequest({
					user: owner,
					packageBuffer: buffer,
					preferenceConflictPolicy: 'replace',
				}),
			),
		).rejects.toThrow('Import blocked');
		expect(createSpy).toHaveBeenCalledOnce();
		expect(await Container.get(ProjectRepository).existsBy({ id: projectId })).toBe(true);
		expect(await repository.existsBy({ id: newPreferenceId })).toBe(false);
		expect(await repository.findOneByOrFail({ id: row.id })).toMatchObject({
			content: 'Concurrent edit',
		});
		expect(hooks).toHaveBeenCalledWith(projectId);
	} finally {
		createSpy.mockRestore();
		hooks.mockRestore();
	}
});

it.each([false, true])(
	'applies a batch across new and existing projects with global access=%s',
	async (globalAccess) => {
		const existing = await createTeamProject('Existing project', owner);
		const row = await preferences.create(
			owner,
			{ scope: 'project', projectId: existing.id, content: 'Before' },
			'ui',
		);
		const kept = await preferences.create(
			owner,
			{ scope: 'project', projectId: existing.id, content: 'Keep' },
			'ui',
		);
		const actor = Object.assign(new Person(), owner);
		actor.role = Object.assign(new Role(), owner.role, {
			scopes: owner.role.scopes.filter(
				({ slug }) => globalAccess || !slug.startsWith('projectAiPreference:'),
			),
		});
		const projectId = randomUUID();
		const newId = randomUUID();
		const { buffer } = await bundle(
			[
				{ id: row.id, scope: 'project', projectId: existing.id, content: 'Updated' },
				{ id: kept.id, scope: 'project', projectId: existing.id, content: 'Keep' },
				{ id: newId, scope: 'project', projectId, content: 'Created' },
			],
			undefined,
			true,
			{
				manifest: {
					projects: [
						{ id: existing.id, name: existing.name, target: `projects/${existing.id}` },
						{ id: projectId, name: 'New project', target: `projects/${projectId}` },
					],
				},
			},
		);
		const result = await service.importPackage(
			importPackageRequest({
				user: actor,
				packageBuffer: buffer,
				preferenceConflictPolicy: 'replace',
			}),
		);
		expect(result.counts.preferences).toEqual({ created: 1, updated: 1, removed: 0, skipped: 1 });
		expect(await repository.findOneByOrFail({ id: row.id })).toMatchObject({
			content: 'Updated',
			projectId: existing.id,
		});
		expect(await repository.findOneByOrFail({ id: newId })).toMatchObject({
			content: 'Created',
			projectId,
		});
	},
);
