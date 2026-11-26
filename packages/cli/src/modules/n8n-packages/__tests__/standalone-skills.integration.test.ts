import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { InstanceWriteAccessService, TelemetryProxy } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { CredentialTypes } from '@/credential-types';
import { storedAgentConfig } from '@/modules/agents/__tests__/test-utils/stored-agent-config';
import { AgentSkillRefsService } from '@/modules/agents/agent-skill-refs.service';
import { AgentRuntimeCacheService } from '@/modules/agents/agent-runtime-cache.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { registerSkillUsage } from '@/modules/agents/register-skill-usage';
import { SkillAccessService, SkillService } from '@/modules/skills';
import { ForbiddenError } from '@n8n/errors';
import {
	createSkill,
	createSkillVersion,
	deleteAllSkills,
	findSkill,
	findSkillIds,
	findLatestSkillVersion,
} from '@/modules/skills/testing';
import { createMember, createOwner } from '@test-integration/db/users';
import { createAgent } from '@test-integration/db/agents';
import { LicenseMocker } from '@test-integration/license';

import { importPackageRequest } from './fixtures/import-request';
import { streamToBuffer } from './utils/tar-support';
import { SkillImporter } from '../entities/skill/skill-importer';
import { N8nPackagesService } from '../n8n-packages.service';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import { TarPackageWriter } from '../io/tar/tar-package-writer';
import { N8nPackageParser } from '../engine/n8n-package-parser';
import { ImportOrchestrator } from '../engine/import-orchestrator';
import { PackageImportConfig } from '../n8n-packages.config';
import type { SerializedSkill } from '../spec/serialized/skill.schema';

mockInstance(TelemetryProxy);
mockInstance(AgentRuntimeCacheService);
mockInstance(AgentUpdateBroadcaster);
mockInstance(CredentialTypes).recognizes.mockReturnValue(true);
const license = new LicenseMocker();
let owner: User;
let destination: Project;
let service: N8nPackagesService;
const content = {
	name: 'Writing guide',
	description: 'Write clear text.',
	instructions: 'Read references/style.md.',
	frontmatter: { license: 'MIT', metadata: { audience: 'team' } },
	files: [{ path: 'references/style.md', content: '# Style\nUse short sentences.\n' }],
};
const agentSchema = storedAgentConfig({
	name: 'Test agent',
	model: 'openai/gpt-4.1-mini',
	instructions: 'Use the attached Skills.',
});

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents', 'n8n-packages']);
	await testDb.init();
	registerSkillUsage();
	license.mockLicenseState(Container.get(LicenseState));
	owner = await createOwner();
	destination = await createTeamProject('Destination', owner);
	service = Container.get(N8nPackagesService);
}, 60_000);

beforeEach(async () => {
	vi.restoreAllMocks();
	Container.get(ModuleRegistry).settings.set('agents', { enabled: true });
	Container.get(InstanceWriteAccessService).setReadOnly(false);
	await deleteAllSkills();
});

afterAll(async () => {
	Container.get(InstanceWriteAccessService).setReadOnly(false);
	await testDb.terminate();
});

async function archive(skills: SerializedSkill[], version = '2', agentSkillIds?: string[]) {
	const writer = new TarPackageWriter();
	for (const skill of skills)
		writer.writeFile(`skills/${skill.id}/skill.json`, JSON.stringify(skill));
	if (agentSkillIds) {
		writer.writeFile(
			'agents/imported/agent-metadata.json',
			JSON.stringify({ versionId: 'draft', publishedVersionId: null }),
		);
		writer.writeFile(
			'agents/imported/agent.json',
			JSON.stringify({
				id: 'imported-agent',
				name: 'Imported agent',
				availableInMCP: false,
				config: {
					name: 'Imported agent',
					model: '',
					instructions: '',
					skills: agentSkillIds.map((id) => ({ type: 'skill', id })),
				},
				tools: {},
				tasks: {},
			}),
		);
	}
	writer.writeFile(
		'manifest.json',
		JSON.stringify({
			packageFormatVersion: version,
			sourceN8nVersion: '2.0.0',
			sourceId: 'source',
			skills: skills.map(({ id, skill }) => ({ id, name: skill.name, target: `skills/${id}` })),
			...(agentSkillIds
				? { agents: [{ id: 'imported-agent', name: 'Imported agent', target: 'agents/imported' }] }
				: {}),
			...(version === '2' ? { selectedSkillIds: skills.map(({ id }) => id) } : {}),
		}),
	);
	return await streamToBuffer(writer.finalize());
}

function packaged(id = 'skill_one', scope: 'project' | 'instance' = 'project'): SerializedSkill {
	return {
		id,
		scope,
		skill: {
			name: content.name,
			description: content.description,
			instructions: content.instructions,
			references: content.files,
		},
		frontmatter: content.frontmatter,
	};
}

async function importSkills(
	packageBuffer: Buffer,
	overrides: Partial<Parameters<typeof importPackageRequest>[0]> = {},
) {
	return await service.importPackage(
		importPackageRequest({
			user: owner,
			projectId: destination.id,
			conflictPolicy: 'new-version',
			packageBuffer,
			...overrides,
		}),
	);
}

it.each(['project', 'instance'] as const)(
	'round-trips a standalone %s Skill into an empty destination',
	async (scope) => {
		const source = await createTeamProject('Source', owner);
		const { id } = await createSkill({
			projectId: scope === 'project' ? source.id : null,
			createdById: owner.id,
			content,
		});
		const exported = await service.exportPackage({ user: owner, skillIds: [id] });
		const packageBuffer = await streamToBuffer(exported.stream);
		expect(exported.counts.skills).toBe(1);
		const reader = new TarPackageReader(packageBuffer, new PackageImportConfig());
		expect(await Container.get(N8nPackageParser).getManifest(reader)).toMatchObject({
			packageFormatVersion: '2',
			selectedSkillIds: [id],
		});
		await deleteAllSkills();
		const result = await importSkills(packageBuffer);
		expect(result.counts.skills).toMatchObject({ created: 1, updated: 0 });
		expect(await findSkill(id)).toMatchObject({
			projectId: scope === 'project' ? destination.id : null,
			source: 'import',
		});
		expect(await findLatestSkillVersion(id)).toMatchObject({ ...content, version: 1 });
		const repeated = await importSkills(packageBuffer);
		expect(repeated.counts.skills).toMatchObject({ created: 0, unchanged: 1 });
		expect(await findLatestSkillVersion(id)).toMatchObject({ version: 1 });
	},
);

it('imports an instance Skill without selecting a destination project', async () => {
	const result = await importSkills(await archive([packaged('instance', 'instance')]), {
		projectId: undefined,
	});
	expect(result.skills?.[0]).toMatchObject({ projectId: null, status: 'created' });
});

it('updates content and names through a new local version', async () => {
	const skill = packaged();
	await importSkills(await archive([skill]));
	skill.skill.name = 'Updated guide';
	skill.skill.instructions = 'Use active voice.';
	const result = await importSkills(await archive([skill]));
	expect(result.counts.skills?.updated).toBe(1);
	expect(await findLatestSkillVersion(skill.id)).toMatchObject({
		version: 2,
		name: 'Updated guide',
		instructions: 'Use active voice.',
	});
});

it('normalizes names before comparing content and rejects blank names before writes', async () => {
	const skill = packaged();
	skill.skill.name = `  ${content.name}  `;
	const buffer = await archive([skill]);
	await importSkills(buffer);
	const repeated = await importSkills(buffer, { conflictPolicy: 'fail' });
	expect(repeated.counts.skills).toMatchObject({ unchanged: 1, updated: 0 });
	expect(await findLatestSkillVersion(skill.id)).toMatchObject({ name: content.name, version: 1 });
	const blank = packaged('blank');
	blank.skill.name = '   ';
	await expect(importSkills(await archive([packaged('new'), blank]))).rejects.toThrow();
	expect(await findSkillIds()).toEqual([skill.id]);
});

it('reports batch rename conflicts across scopes before applying the plan', async () => {
	const projectSkill = packaged('project-skill');
	const instanceSkill = packaged('instance-skill', 'instance');
	instanceSkill.skill.name = 'Instance guide';
	await importSkills(await archive([projectSkill, instanceSkill]));
	const follower = await createAgent({ projectId: destination.id, schema: agentSchema });
	await Container.get(AgentSkillRefsService).replaceDraftRefs(
		follower,
		[
			{ type: 'skill', id: projectSkill.id },
			{ type: 'skill', id: instanceSkill.id },
		],
		{},
	);
	projectSkill.skill.name = instanceSkill.skill.name = 'New guide';
	await expect(importSkills(await archive([projectSkill, instanceSkill]))).rejects.toMatchObject({
		meta: {
			issues: [expect.objectContaining({ type: 'skill-conflict', skillId: instanceSkill.id })],
		},
	});
	for (const { id } of [projectSkill, instanceSkill])
		expect(await findLatestSkillVersion(id)).toMatchObject({ version: 1 });
});

it('imports only the explicit selection and preserves unrelated Skills', async () => {
	await createSkill({
		id: 'unselected',
		projectId: destination.id,
		content: { name: 'Unselected' },
	});
	const a = packaged('a');
	const b = packaged('b');
	b.skill.name = 'Second guide';
	const result = await importSkills(await archive([a, b]), { skillIds: ['b'] });
	expect(result.skills?.map(({ localId }) => localId)).toEqual(['b']);
	expect(await findSkillIds()).toEqual(['b', 'unselected']);
});

it.each([
	[false, 'instance'],
	[true, 'instance'],
	[false, 'project'],
	[true, 'project'],
] as const)(
	'checks batch renames in save order (vacate name first: %s, scope: %s)',
	async (vacateFirst, scope) => {
		const projectSkill = packaged('project-skill');
		const instanceSkill = packaged('other-skill', scope);
		instanceSkill.skill.name = 'Instance guide';
		await importSkills(await archive([projectSkill, instanceSkill]));
		const follower = await createAgent({ projectId: destination.id, schema: agentSchema });
		await Container.get(AgentSkillRefsService).replaceDraftRefs(
			follower,
			[
				{ type: 'skill', id: projectSkill.id },
				{ type: 'skill', id: instanceSkill.id },
			],
			{},
		);
		projectSkill.skill.name = instanceSkill.skill.name;
		instanceSkill.skill.name = 'New instance guide';
		const skills = vacateFirst ? [instanceSkill, projectSkill] : [projectSkill, instanceSkill];
		if (vacateFirst) {
			vi.spyOn(Container.get(SkillService), 'refreshFollowingAgents').mockResolvedValue();
			await importSkills(await archive(skills));
			for (const skill of skills)
				expect(await findLatestSkillVersion(skill.id)).toMatchObject({
					version: 2,
					name: skill.skill.name,
				});
		} else {
			await expect(importSkills(await archive(skills))).rejects.toMatchObject({
				meta: {
					issues: [expect.objectContaining({ type: 'skill-conflict', skillId: projectSkill.id })],
				},
			});
			for (const skill of skills)
				expect(await findLatestSkillVersion(skill.id)).toMatchObject({ version: 1 });
		}
	},
);

it('reports name conflicts before creating any Skill', async () => {
	await expect(importSkills(await archive([packaged('a'), packaged('b')]))).rejects.toMatchObject({
		meta: { issues: [expect.objectContaining({ type: 'skill-conflict' })] },
	});
	expect(await findSkillIds()).toEqual([]);
});

it.each([false, true])(
	'uses standalone rename order when an imported Agent references the batch (both Skills: %s)',
	async (both) => {
		const projectSkill = packaged('project-skill');
		const instanceSkill = packaged('instance-skill', 'instance');
		instanceSkill.skill.name = 'Instance guide';
		await importSkills(await archive([projectSkill, instanceSkill]));
		const follower = await createAgent({ projectId: destination.id, schema: agentSchema });
		await Container.get(AgentSkillRefsService).replaceDraftRefs(
			follower,
			[
				{ type: 'skill', id: projectSkill.id },
				{ type: 'skill', id: instanceSkill.id },
			],
			{},
		);
		projectSkill.skill.name = instanceSkill.skill.name;
		instanceSkill.skill.name = 'New instance guide';
		vi.spyOn(Container.get(SkillService), 'refreshFollowingAgents').mockResolvedValue();
		const result = await importSkills(
			await archive(
				[instanceSkill, projectSkill],
				'2',
				both ? [projectSkill.id, instanceSkill.id] : [projectSkill.id],
			),
		);
		expect(result.counts.skills?.updated).toBe(2);
		for (const skill of [projectSkill, instanceSkill])
			expect(await findLatestSkillVersion(skill.id)).toMatchObject({
				version: 2,
				name: skill.skill.name,
			});
	},
);

it.each(['project', 'workflow'] as const)(
	'defers explicit Skill deletion until %s content is saved',
	async (shape) => {
		const project = await createTeamProject('Removal destination', owner);
		const workflow = await createWorkflow(
			{ name: 'Workflow', nodes: [], connections: {} },
			project,
		);
		const { id } = await createSkill({ projectId: project.id, content });
		const exported = await service.exportPackage({
			user: owner,
			...(shape === 'project'
				? { projectIds: [project.id], includeSkills: true }
				: { workflowIds: [workflow.id], skillIds: [id] }),
		});
		const packageBuffer = await streamToBuffer(exported.stream);
		const options = {
			projectId: shape === 'project' ? undefined : project.id,
			skillIds: [],
			deletedSkillIds: [id],
		};
		vi.spyOn(Container.get(ImportOrchestrator), 'apply').mockRejectedValueOnce(
			new Error('Content write failed'),
		);
		await expect(importSkills(packageBuffer, options)).rejects.toThrow('Content write failed');
		expect(await findSkill(id)).not.toBeNull();
		const result = await importSkills(packageBuffer, options);
		expect(result.skills).toEqual([expect.objectContaining({ localId: id, status: 'deleted' })]);
		expect(await findSkill(id)).toBeNull();
	},
);

it('rejects an identity in another scope', async () => {
	await createSkill({ id: 'skill_one', projectId: null, content });
	await expect(importSkills(await archive([packaged()]))).rejects.toThrow('Import blocked');
	expect(await findSkill('skill_one')).toMatchObject({ projectId: null });
});

it('requires the scope for each planned action', async () => {
	const buffer = await archive([packaged()]);
	await expect(importSkills(buffer, { apiKeyScopes: ['skill:read'] })).rejects.toThrow('Forbidden');
	expect(await findSkillIds()).toEqual([]);
	await importSkills(buffer, { apiKeyScopes: ['skill:create'] });
	await expect(
		importSkills(buffer, {
			skillIds: [],
			deletedSkillIds: ['skill_one'],
			apiKeyScopes: ['skill:update'],
		}),
	).rejects.toThrow('Forbidden');
	expect(await findSkill('skill_one')).not.toBeNull();
});

it('reports missing resource permission as a plan issue', async () => {
	const member = await createMember();
	const plan = await Container.get(SkillImporter).planStandalone(
		member,
		[{ skill: packaged('instance', 'instance'), projectId: null }],
		[],
		'new-version',
	);
	expect(plan.issues).toEqual([
		expect.objectContaining({ type: 'skill-conflict', skillId: 'instance' }),
	]);
	await expect(
		importSkills(await archive([packaged('instance', 'instance')]), {
			user: member,
			projectId: undefined,
		}),
	).rejects.toThrow('Import blocked');
	expect(await findSkillIds()).toEqual([]);
});

it('removes only explicitly selected destination Skills', async () => {
	await importSkills(await archive([packaged()]));
	await createSkill({ id: 'keep', projectId: destination.id, content: { name: 'Keep' } });
	const result = await importSkills(await archive([]), {
		deletedSkillIds: ['skill_one'],
		apiKeyScopes: ['skill:delete'],
	});
	expect(result.counts.skills?.deleted).toBe(1);
	expect(await findSkillIds()).toEqual(['keep']);
});

it('rechecks delete access before applying a reviewed plan', async () => {
	await importSkills(await archive([packaged()]));
	const importer = Container.get(SkillImporter);
	const plan = await importer.planStandalone(owner, [], ['skill_one'], 'new-version');
	expect(plan.issues).toEqual([]);
	vi.spyOn(Container.get(SkillAccessService), 'requireAccess').mockRejectedValue(
		new ForbiddenError('Access changed'),
	);
	await expect(importer.applyStandalone(owner, plan)).rejects.toThrow('Access changed');
	expect(await findSkill('skill_one')).not.toBeNull();
});

it('rejects source-managed destinations before writes', async () => {
	await importSkills(await archive([packaged()]));
	vi.spyOn(Container.get(SkillService), 'isSourceManaged').mockResolvedValue(true);
	await expect(importSkills(await archive([packaged()]))).rejects.toThrow('Import blocked');
	expect(await findLatestSkillVersion('skill_one')).toMatchObject({ version: 1 });
});

it('detects edits between planning and applying', async () => {
	await importSkills(await archive([packaged()]));
	const importer = Container.get(SkillImporter);
	const skill = packaged();
	skill.skill.instructions = 'Reviewed instructions';
	const plan = await importer.planStandalone(
		owner,
		[{ skill, projectId: destination.id }],
		[],
		'new-version',
	);
	await createSkillVersion(skill.id, { ...content, instructions: 'A later edit' });
	await expect(importer.applyStandalone(owner, plan)).rejects.toThrow('changed somewhere else');
	expect(await findLatestSkillVersion(skill.id)).toMatchObject({
		version: 2,
		instructions: 'A later edit',
	});
});

it.each(['unchanged', 'skipped'] as const)(
	'rechecks a %s Skill before applying the batch',
	async (status) => {
		const skill = packaged();
		await importSkills(await archive([skill]));
		if (status === 'skipped') skill.skill.instructions = 'Skip this change';
		const importer = Container.get(SkillImporter);
		const plan = await importer.planStandalone(
			owner,
			[{ skill, projectId: destination.id }],
			[],
			'skip',
		);
		expect(plan.outcomes[0].status).toBe(status);
		await createSkillVersion(skill.id, { ...content, instructions: 'Later edit' });
		await expect(importer.applyStandalone(owner, plan)).rejects.toThrow('changed after planning');
		expect(await findLatestSkillVersion(skill.id)).toMatchObject({
			version: 2,
			instructions: 'Later edit',
		});
	},
);

it('rejects a source link added after planning', async () => {
	const skill = packaged();
	await importSkills(await archive([skill]));
	skill.skill.instructions = 'Reviewed edit';
	const importer = Container.get(SkillImporter);
	const plan = await importer.planStandalone(
		owner,
		[{ skill, projectId: destination.id }],
		[],
		'new-version',
	);
	vi.spyOn(Container.get(SkillService), 'isSourceManaged').mockResolvedValue(true);
	await expect(importer.applyStandalone(owner, plan)).rejects.toThrow('now managed by a source');
	expect(await findLatestSkillVersion(skill.id)).toMatchObject({ version: 1 });
});

it('rejects package imports on a protected instance', async () => {
	const { id } = await createSkill({
		projectId: destination.id,
		content: { ...content, name: 'Existing guide' },
	});
	Container.get(InstanceWriteAccessService).setReadOnly(true);
	await expect(importSkills(await archive([packaged()]))).rejects.toMatchObject({
		meta: {
			issues: [expect.objectContaining({ message: expect.stringContaining('protected instance') })],
		},
	});
	expect(await findSkillIds()).toEqual([id]);
});

it.each(['create', 'update', 'delete'] as const)(
	'rechecks instance write settings before applying a Skill %s',
	async (action) => {
		const skill = packaged();
		if (action !== 'create') await importSkills(await archive([skill]));
		const before = await findLatestSkillVersion(skill.id);
		skill.skill.instructions = 'Reviewed instructions';
		const importer = Container.get(SkillImporter);
		const plan = await importer.planStandalone(
			owner,
			action === 'delete' ? [] : [{ skill, projectId: destination.id }],
			action === 'delete' ? [skill.id] : [],
			'new-version',
		);
		expect(plan.issues).toEqual([]);

		Container.get(InstanceWriteAccessService).setReadOnly(true);
		await expect(importer.applyStandalone(owner, plan)).rejects.toThrow('protected instance');
		expect(await findLatestSkillVersion(skill.id)).toEqual(before);
	},
);

it('reports unavailable Skills and rejects unsupported format versions', async () => {
	Container.get(ModuleRegistry).settings.set('agents', { enabled: false });
	await expect(importSkills(await archive([packaged()]))).rejects.toMatchObject({
		meta: {
			issues: [
				expect.objectContaining({
					type: 'skill-conflict',
					skillId: 'skill_one',
					message: expect.stringContaining('unavailable'),
				}),
			],
		},
	});
	Container.get(ModuleRegistry).settings.set('agents', { enabled: true });
	await expect(importSkills(await archive([packaged()], '99'))).rejects.toThrow(
		'manifest failed validation',
	);
	expect(await findSkillIds()).toEqual([]);
});

it.each([false, true])('checks availability for selected Skills only (%s)', async (selectSkill) => {
	const project = await createTeamProject('Selected resources', owner);
	const { id } = await createSkill({ projectId: project.id, content });
	const workflow = await createWorkflow({ name: 'Workflow', nodes: [], connections: {} }, project);
	const exported = await service.exportPackage({
		user: owner,
		projectIds: [project.id],
		includeSkills: true,
	});
	const packageBuffer = await streamToBuffer(exported.stream);
	const request = importPackageRequest({
		user: owner,
		packageBuffer,
		conflictPolicy: 'new-version',
	});
	const selection = {
		selectedProjectId: project.id,
		selectedWorkflowIds: [workflow.id],
		selectedSkillIds: selectSkill ? [id] : [],
	};
	Container.get(ModuleRegistry).settings.set('agents', { enabled: false });
	const plan = await service.planPackageSelection(
		request,
		new TarPackageReader(packageBuffer, new PackageImportConfig()),
		selection,
		'check',
	);
	if (selectSkill) {
		expect(plan.issues).toEqual([
			expect.objectContaining({
				type: 'skill-conflict',
				skillId: id,
				message: expect.stringContaining('unavailable'),
			}),
		]);
		await expect(service.importPackageSelection(request, selection)).rejects.toMatchObject({
			meta: { issues: plan.issues },
		});
	} else {
		expect(plan.issues).toEqual([]);
		const result = await service.importPackageSelection(request, selection);
		expect(result.workflows).toEqual([expect.objectContaining({ sourceWorkflowId: workflow.id })]);
		expect(result.skills).toBeUndefined();
	}
	expect(await findLatestSkillVersion(id)).toMatchObject({ version: 1 });
});

it('keeps published pins and updates only consumers that follow latest', async () => {
	const skill = packaged();
	await importSkills(await archive([skill]));
	const refs = Container.get(AgentSkillRefsService);
	const follower = await createAgent({ projectId: destination.id, schema: agentSchema });
	await refs.replaceDraftRefs(follower, [{ type: 'skill', id: skill.id }], {});
	const pins = await refs.versionSnapshot(follower, {});
	const version = await Container.get(AgentHistoryRepository).saveVersion(
		{
			versionId: 'published-skill-consumer',
			agentId: follower.id,
			savedBy: 'Test',
			schema: follower.schema,
			tools: null,
		},
		{},
	);
	await refs.pinVersion(version.versionId, pins, {});
	const pinned = await createAgent({ projectId: destination.id, schema: agentSchema });
	await refs.replaceDraftRefs(
		pinned,
		[{ type: 'skill', id: skill.id, versionId: pins.get(skill.id)! }],
		{},
	);
	skill.skill.instructions = 'Use the new guide.';
	const importer = Container.get(SkillImporter);
	const plan = await importer.planStandalone(
		owner,
		[{ skill, projectId: destination.id }],
		[],
		'new-version',
	);
	expect(plan.outcomes[0]).toMatchObject({ status: 'updated', followingAgentCount: 1 });
	expect(await findLatestSkillVersion(skill.id)).toMatchObject({ version: 1 });
	const refresh = vi
		.spyOn(Container.get(SkillService), 'refreshFollowingAgents')
		.mockResolvedValue();
	await importer.applyStandalone(owner, plan);
	expect(refresh).toHaveBeenCalledWith([follower.id]);
	expect((await refs.readDraft(follower, {})).skills[skill.id].instructions).toBe(
		'Use the new guide.',
	);
	expect((await refs.readDraft(pinned, {})).skills[skill.id].instructions).toBe(
		content.instructions,
	);
	expect((await refs.readVersion(version, {})).skills[skill.id].instructions).toBe(
		content.instructions,
	);
	await expect(
		importSkills(await archive([]), { deletedSkillIds: [skill.id] }),
	).rejects.toMatchObject({
		message: expect.stringContaining('Import blocked'),
		meta: { issues: [expect.objectContaining({ type: 'skill-conflict', skillId: skill.id })] },
	});
});

it('rechecks the destination scope before applying a reviewed plan', async () => {
	const skill = packaged();
	await importSkills(await archive([skill]));
	skill.skill.instructions = 'New instructions';
	const importer = Container.get(SkillImporter);
	const plan = await importer.planStandalone(
		owner,
		[{ skill, projectId: destination.id }],
		[],
		'new-version',
	);
	await Container.get(SkillService).moveTrusted(
		skill.id,
		{ projectId: null },
		undefined,
		{},
		{ checkedSource: { projectId: destination.id } },
	);
	await expect(importer.applyStandalone(owner, plan)).rejects.toThrow('skill scope changed');
	expect(await findLatestSkillVersion(skill.id)).toMatchObject({ version: 1 });
});

it('reports saved changes if refreshing consumers fails', async () => {
	await importSkills(await archive([packaged()]));
	const skill = packaged();
	const follower = await createAgent({ projectId: destination.id, schema: agentSchema });
	await Container.get(AgentSkillRefsService).replaceDraftRefs(
		follower,
		[{ type: 'skill', id: skill.id }],
		{},
	);
	skill.skill.instructions = 'New instructions';
	vi.spyOn(Container.get(SkillService), 'refreshFollowingAgents').mockRejectedValue(
		new Error('Refresh failed'),
	);
	await expect(importSkills(await archive([skill]))).rejects.toMatchObject({
		meta: {
			counts: { skills: { updated: 1 } },
			skills: [expect.objectContaining({ status: 'updated' })],
		},
	});
	expect(await findLatestSkillVersion(skill.id)).toMatchObject({ version: 2 });
});

it('reports saved Skills if a later project content write fails', async () => {
	const project = await createTeamProject('Skill project', owner);
	const { id } = await createSkill({ projectId: project.id, content });
	const exported = await service.exportPackage({
		user: owner,
		projectIds: [project.id],
		includeSkills: true,
	});
	const packageBuffer = await streamToBuffer(exported.stream);
	await deleteAllSkills();
	vi.spyOn(Container.get(ImportOrchestrator), 'apply').mockRejectedValueOnce(
		new Error('Content write failed'),
	);
	await expect(importSkills(packageBuffer, { projectId: undefined })).rejects.toMatchObject({
		meta: {
			counts: { skills: { created: 1 } },
			skills: [expect.objectContaining({ localId: id, status: 'created' })],
		},
	});
	expect(await findSkill(id)).toMatchObject({ projectId: project.id });
});

it('reports both Skill phases when publishing fails', async () => {
	const project = await createTeamProject('Skill phases', owner);
	const created = await createSkill({ projectId: project.id, content });
	const removed = await createSkill({
		projectId: project.id,
		content: { ...content, name: 'Removed guide' },
	});
	const exported = await service.exportPackage({
		user: owner,
		projectIds: [project.id],
		includeSkills: true,
	});
	const packageBuffer = await streamToBuffer(exported.stream);
	await deleteAllSkills();
	await createSkill({
		id: removed.id,
		projectId: project.id,
		content: { ...content, name: 'Removed guide' },
	});
	vi.spyOn(Container.get(ImportOrchestrator), 'publishPackage').mockRejectedValueOnce(
		new Error('Publish failed'),
	);
	await expect(
		importSkills(packageBuffer, {
			projectId: undefined,
			skillIds: [created.id],
			deletedSkillIds: [removed.id],
		}),
	).rejects.toMatchObject({
		meta: {
			counts: { skills: { created: 1, deleted: 1 } },
			skills: [
				expect.objectContaining({ localId: created.id, status: 'created' }),
				expect.objectContaining({ localId: removed.id, status: 'deleted' }),
			],
		},
	});
	expect(await findSkill(created.id)).not.toBeNull();
	expect(await findSkill(removed.id)).toBeNull();
});

it('reports workflow and Skill conflicts together before writes', async () => {
	const source = await createTeamProject('Source', owner);
	const { id } = await createSkill({ projectId: source.id, content });
	const workflow = await createWorkflow(
		{ name: 'Source workflow', nodes: [], connections: {} },
		source,
	);
	const exported = await service.exportPackage({
		user: owner,
		workflowIds: [workflow.id],
		skillIds: [id],
	});
	const packageBuffer = await streamToBuffer(exported.stream);
	await deleteAllSkills();
	await createSkill({
		id,
		projectId: destination.id,
		content: { ...content, instructions: 'Keep this edit.' },
	});
	await expect(importSkills(packageBuffer, { conflictPolicy: 'fail' })).rejects.toMatchObject({
		meta: {
			issues: expect.arrayContaining([
				expect.objectContaining({ type: 'skill-conflict', skillId: id }),
				expect.objectContaining({ type: 'workflow-id-conflict', sourceWorkflowId: workflow.id }),
			]),
		},
	});
	expect(await findLatestSkillVersion(id)).toMatchObject({
		version: 1,
		instructions: 'Keep this edit.',
	});
});

it('reads legacy Skills collections without removing unselected destination Skills', async () => {
	const { id } = await createSkill({ projectId: destination.id, content: { name: 'Keep' } });
	const result = await importSkills(await archive([packaged()], '1'));
	expect(result.counts.skills?.created).toBe(1);
	expect(await findSkill(id)).not.toBeNull();
});

it('rejects invalid supporting file paths before creating Skills', async () => {
	const skill = packaged();
	skill.skill.references = [{ path: '../outside.md', content: '# Outside' }];
	await expect(importSkills(await archive([skill]))).rejects.toThrow();
	expect(await findSkillIds()).toEqual([]);
});

it('exports project Skills without Agents and retains an explicit empty collection', async () => {
	const project = await createTeamProject('Skill project', owner);
	const { id } = await createSkill({ projectId: project.id, content });
	const exported = await service.exportPackage({
		user: owner,
		projectIds: [project.id],
		includeSkills: true,
	});
	const packageBuffer = await streamToBuffer(exported.stream);
	await deleteAllSkills();
	const result = await importSkills(packageBuffer, { projectId: undefined });
	expect(result.counts.skills?.created).toBe(1);
	expect(await findSkill(id)).toMatchObject({ projectId: project.id });
	await deleteAllSkills();
	const empty = await service.exportPackage({
		user: owner,
		projectIds: [project.id],
		includeSkills: true,
	});
	const reader = new TarPackageReader(
		await streamToBuffer(empty.stream),
		new PackageImportConfig(),
	);
	expect(await Container.get(N8nPackageParser).getManifest(reader)).toMatchObject({
		packageFormatVersion: '2',
		skills: [],
		selectedSkillIds: [],
	});
});

it('previews a project Skill selection without changing unselected Skills', async () => {
	const project = await createTeamProject('Selected Skills', owner);
	const first = await createSkill({ projectId: project.id, content });
	const second = await createSkill({
		projectId: project.id,
		content: { ...content, name: 'Other' },
	});
	const exported = await service.exportPackage({
		user: owner,
		projectIds: [project.id],
		includeSkills: true,
	});
	const packageBuffer = await streamToBuffer(exported.stream);
	await createSkillVersion(first.id, { ...content, instructions: 'Destination edit' });
	await createSkillVersion(second.id, {
		...content,
		name: 'Other',
		instructions: 'Keep this edit',
	});
	const request = importPackageRequest({
		user: owner,
		packageBuffer,
		conflictPolicy: 'new-version',
	});
	const plan = await service.planPackageSelection(
		request,
		new TarPackageReader(packageBuffer, new PackageImportConfig()),
		{ selectedProjectId: project.id, selectedWorkflowIds: [], selectedSkillIds: [first.id] },
		'check',
	);
	expect(plan.issues).toEqual([]);
	expect(plan.skillPlan?.outcomes).toEqual([
		expect.objectContaining({ localId: first.id, status: 'updated' }),
	]);
	expect(await findLatestSkillVersion(first.id)).toMatchObject({ version: 2 });
	const result = await service.applyPackagePlan(plan);
	expect(result.counts.skills?.updated).toBe(1);
	expect(await findLatestSkillVersion(first.id)).toMatchObject({
		version: 3,
		instructions: content.instructions,
	});
	expect(await findLatestSkillVersion(second.id)).toMatchObject({
		version: 2,
		instructions: 'Keep this edit',
	});
});

it('rejects a removal when the package has no Skills collection', async () => {
	const project = await createTeamProject('No Skills collection', owner);
	const { id } = await createSkill({ projectId: project.id, content });
	const exported = await service.exportPackage({ user: owner, projectIds: [project.id] });
	await expect(
		importSkills(await streamToBuffer(exported.stream), { deletedSkillIds: [id] }),
	).rejects.toThrow('no Skills collection');
	expect(await findSkill(id)).not.toBeNull();
});
