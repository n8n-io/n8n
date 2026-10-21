import type {
	AssistantSkillContext,
	AssistantSkillSummary,
	ProjectScopeService,
} from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { Skill } from '../skill.entity';
import type { SkillVersion } from '../skill-version.entity';
import type { ResolvedSkillRow, SkillRepository } from '../skill.repository';
import { HubAssistantSkillProvider } from '../hub-assistant-skill-provider.service';
import type { SkillService } from '../skill.service';
import type { AssistantSkillsRollout } from '../assistant-skills-rollout';

describe('HubAssistantSkillProvider', () => {
	const repository = mock<SkillRepository>();
	const projects = mock<ProjectScopeService>();
	const rollout = mock<AssistantSkillsRollout>();
	const skills = mock<SkillService>();
	const provider = new HubAssistantSkillProvider(rollout, projects, repository, skills);
	const context: AssistantSkillContext = { user: mock<User>(), projectId: 'project-1' };
	const summary: AssistantSkillSummary = {
		id: 'skill-1',
		projectId: null,
		name: 'Tone',
		description: 'Writing style',
		versionId: 'version-1',
		version: 1,
	};
	let row: ResolvedSkillRow;

	beforeEach(() => {
		vi.resetAllMocks();
		rollout.isEnabled.mockResolvedValue(true);
		projects.getProjectIds.mockResolvedValue(['project-1', 'project-2']);
		repository.findAssistantSkillSummaries.mockResolvedValue([]);
		row = {
			skill: mock<Skill>({
				id: 'skill-1',
				agentId: null,
				projectId: null,
				availableToAssistant: true,
			}),
			version: mock<SkillVersion>({
				id: 'version-1',
				version: 1,
				name: 'Tone',
				description: 'Writing style',
				instructions: 'Be brief.',
				frontmatter: null,
			}),
			files: [],
		};
		repository.findLatestSaved.mockImplementation(async () => new Map([['skill-1', row]]));
		skills.canAccess.mockResolvedValue(true);
	});

	it('returns no skills and does not read storage when the flag is off', async () => {
		rollout.isEnabled.mockResolvedValue(false);
		expect(await provider.listSkills(context)).toEqual([]);
		expect(await provider.readSkill(context, 'skill-1')).toBeNull();
		expect(repository.findAssistantSkillSummaries).not.toHaveBeenCalled();
		expect(repository.findLatestSaved).not.toHaveBeenCalled();
	});

	it.each([
		['project-1', ['project-1', 'project-2'], 'project-1'],
		['project-1', null, 'project-1'],
		['project-1', [], null],
		[undefined, null, null],
	] as const)(
		'limits catalog reads to the authorized session project (%s, %s)',
		async (projectId, allowed, expected) => {
			projects.getProjectIds.mockResolvedValue(allowed === null ? null : [...allowed]);
			const summaries = [{ ...summary, projectId: expected }];
			repository.findAssistantSkillSummaries.mockResolvedValue(summaries);
			expect(await provider.listSkills({ ...context, projectId })).toEqual(summaries);
			expect(repository.findAssistantSkillSummaries).toHaveBeenCalledWith(expected);
		},
	);

	it('requires both list and read permissions for project skills', async () => {
		await provider.listSkills(context);
		await provider.readSkill(context, 'skill-1');
		expect(projects.getProjectIds).toHaveBeenCalledTimes(2);
		expect(projects.getProjectIds).toHaveBeenNthCalledWith(1, context.user, [
			'projectSkill:list',
			'projectSkill:read',
		]);
		expect(projects.getProjectIds).toHaveBeenNthCalledWith(2, context.user, [
			'projectSkill:list',
			'projectSkill:read',
		]);
	});

	it('refuses disabled content even when its ID is supplied', async () => {
		row.skill.availableToAssistant = false;
		expect(await provider.readSkill(context, 'skill-1')).toBeNull();
	});

	it('uses the existing skill permission check for content reads', async () => {
		skills.canAccess.mockResolvedValue(false);
		expect(await provider.readSkill(context, 'skill-1')).toBeNull();
		expect(skills.canAccess).toHaveBeenCalledWith(context.user, row.skill, 'read');
	});

	it.each([
		['project-1', ['project-1'], true],
		['project-2', ['project-1', 'project-2'], false],
		['project-1', [], false],
		['project-1', null, true],
	] as const)(
		'limits content reads to the authorized session project (%s, %s)',
		async (projectId, allowed, eligible) => {
			row.skill.projectId = projectId;
			projects.getProjectIds.mockResolvedValue(allowed === null ? null : [...allowed]);
			const result = await provider.readSkill(context, 'skill-1');
			if (eligible) expect(result).toMatchObject({ id: 'skill-1', projectId });
			else expect(result).toBeNull();
		},
	);

	it('returns no project content without a session project, including for global roles', async () => {
		row.skill.projectId = 'project-1';
		projects.getProjectIds.mockResolvedValue(null);
		expect(await provider.readSkill({ user: context.user }, 'skill-1')).toBeNull();
	});

	it('reads enabled content with its saved version', async () => {
		expect(await provider.readSkill(context, 'skill-1')).toEqual({
			id: 'skill-1',
			projectId: null,
			versionId: 'version-1',
			version: 1,
			name: 'Tone',
			description: 'Writing style',
			instructions: 'Be brief.',
			frontmatter: null,
			files: [],
		});
	});

	it('allows instance skills without project access', async () => {
		projects.getProjectIds.mockResolvedValue([]);
		expect(await provider.readSkill(context, 'skill-1')).not.toBeNull();
	});

	it('returns null for a missing skill', async () => {
		expect(await provider.readSkill(context, 'missing')).toBeNull();
	});
});
