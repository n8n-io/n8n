import type { User } from '@n8n/db';
import { ModuleRegistry } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import {
	SkillAccessService,
	SkillService,
	SkillRuntimeService,
	SkillsGate,
} from '@/modules/skills';

import { PromotionSkillSelectionService } from '../promotion-skill-selection.service';

const project = { id: 'p1', name: 'Project', target: 'projects/project-p1' };
const projectSkill = {
	id: 'skill_project',
	name: 'Project guide',
	target: `${project.target}/skills/guide-skill_project`,
};
const instanceSkill = {
	id: 'skill_instance',
	name: 'Instance guide',
	target: 'skills/guide-skill_instance',
};
const manifest: PackageManifest = {
	packageFormatVersion: '2',
	sourceId: 'source',
	sourceN8nVersion: '2.0.0',
	projects: [project],
	skills: [projectSkill, instanceSkill],
};

describe('PromotionSkillSelectionService', () => {
	const skills = mock<SkillService>();
	const access = mock<SkillAccessService>();
	const runtime = mock<SkillRuntimeService>();
	const moduleRegistry = mock<ModuleRegistry>();
	const gate = { isEnabled: true };
	const service = new PromotionSkillSelectionService(
		gate as SkillsGate,
		skills,
		access,
		runtime,
		moduleRegistry,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		gate.isEnabled = true;
		moduleRegistry.isActive.mockReturnValue(true);
		skills.findIdsInProjects.mockResolvedValue(['skill_project', 'skill_removed']);
		skills.findInstanceIds.mockResolvedValue(['skill_instance']);
		access.accessCheck.mockResolvedValue(() => true);
	});

	it('selects project and instance Skills and reports explicit removals', async () => {
		await expect(service.forApply(manifest, ['p1'])).resolves.toEqual({
			selectedSkillIds: ['skill_project', 'skill_instance'],
			deletedSkillIds: ['skill_removed'],
		});
	});

	it('blocks project deletion even when Skills are unavailable', async () => {
		gate.isEnabled = false;
		await expect(service.projectDeletionConflicts(['p1'])).resolves.toEqual([
			expect.objectContaining({ code: 'skill-conflict', id: 'skill_project' }),
			expect.objectContaining({ code: 'skill-conflict', id: 'skill_removed' }),
		]);
	});

	it('skips Skill storage when the module is not loaded', async () => {
		moduleRegistry.isActive.mockReturnValue(false);
		skills.findIdsInProjects.mockRejectedValue(new Error('Skill entity is not registered'));
		await expect(service.projectDeletionConflicts(['p1'])).resolves.toEqual([]);
		expect(skills.findIdsInProjects).not.toHaveBeenCalled();
	});

	it('keeps unselected Skills, including instance Skills', async () => {
		await expect(service.forApply(manifest, ['p1'], ['skill_project'])).resolves.toEqual({
			selectedSkillIds: ['skill_project'],
			deletedSkillIds: [],
		});
		await expect(service.forApply(manifest, ['p1'], [])).resolves.toEqual({});
	});

	it.each([
		{ ...manifest, packageFormatVersion: '1' as const, skills: undefined },
		{ ...manifest, skills: undefined },
	])('does not remove Skills when the package has no supported collection', async (legacy) => {
		await expect(service.forApply(legacy, ['p1'])).resolves.toEqual({});
		await expect(service.forApply(legacy, ['p1'], ['skill_project'])).rejects.toThrow(
			'standalone Skills',
		);
	});

	it('does not interpret unavailable local Skills as removals', async () => {
		gate.isEnabled = false;
		await expect(service.forApply(manifest, ['p1'])).resolves.toEqual({
			selectedSkillIds: ['skill_project', 'skill_instance'],
			deletedSkillIds: [],
		});
		await expect(service.forApply(manifest, ['p1'], ['skill_project'])).rejects.toThrow(
			'unavailable',
		);
	});

	it('rejects a selection from another project', async () => {
		await expect(service.forApply(manifest, ['other'], ['skill_project'])).rejects.toThrow(
			'outside',
		);
	});

	it('does not remove a Skill that the branch moved to another project', async () => {
		await expect(
			service.forApply(
				{ ...manifest, skills: [{ ...projectSkill, target: 'projects/other/skills/guide' }] },
				['p1'],
				['skill_project'],
			),
		).rejects.toThrow('outside');
	});

	it('classifies selected source Skills by identity and rejects scope changes', async () => {
		runtime.findTargets.mockResolvedValue(
			new Map([
				['skill_project', { projectId: 'p1' }],
				['skill_instance', { projectId: null }],
			]),
		);
		await expect(
			service.forPromote(mock<User>(), 'p1', ['skill_project', 'skill_removed']),
		).resolves.toEqual({ skillIds: ['skill_project'], deletedSkillIds: ['skill_removed'] });
		await expect(service.forPromote(mock<User>(), 'p1', ['skill_instance'])).resolves.toEqual({
			skillIds: ['skill_instance'],
			deletedSkillIds: [],
		});
		expect(skills.findLatest).not.toHaveBeenCalled();
		await expect(service.forPromote(mock<User>(), 'other', ['skill_project'])).rejects.toThrow(
			'another project',
		);
		access.accessCheck.mockResolvedValue(() => false);
		await expect(service.forPromote(mock<User>(), 'p1', ['skill_project'])).rejects.toThrow(
			'cannot read',
		);
	});
});
