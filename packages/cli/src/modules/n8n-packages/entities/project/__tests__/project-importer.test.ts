import type { LicenseState } from '@n8n/backend-common';
import type { Project, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';

import type { PreparedProject, ProjectPlanItem } from '../project-import.types';
import { ProjectImporter } from '../project-importer';

const user = mock<User>({ id: 'user-1' });

const tags = [
	{ key: 'team', value: 'ligo' },
	{ key: 'env', value: 'prod' },
];

describe('ProjectImporter.apply — custom span attributes', () => {
	function makeImporter() {
		const projectService = mock<ProjectService>();
		projectService.createTeamProject.mockResolvedValue(
			mock<Project>({ id: 'proj-1', name: 'billing' }),
		);
		const importer = new ProjectImporter(projectService, mock<LicenseState>());
		return { importer, projectService };
	}

	it('passes customTelemetryTags to createTeamProject on create', async () => {
		const { importer, projectService } = makeImporter();
		const item: ProjectPlanItem = {
			action: 'create',
			sourceProjectId: 'proj-1',
			name: 'billing',
			customTelemetryTags: tags,
		};

		await importer.apply(user, [item]);

		expect(projectService.createTeamProject).toHaveBeenCalledWith(
			user,
			expect.objectContaining({ name: 'billing' }),
			expect.objectContaining({ id: 'proj-1', customTelemetryTags: tags }),
		);
	});

	it('passes customTelemetryTags to updateProject on update', async () => {
		const { importer, projectService } = makeImporter();
		const item: ProjectPlanItem = {
			action: 'update',
			sourceProjectId: 'proj-1',
			name: 'billing',
			customTelemetryTags: tags,
		};

		await importer.apply(user, [item]);

		expect(projectService.updateProject).toHaveBeenCalledWith(
			user,
			'proj-1',
			expect.objectContaining({ customTelemetryTags: tags }),
		);
	});

	it('passes undefined tags on update for older packages, leaving existing tags untouched', async () => {
		const { importer, projectService } = makeImporter();
		const item: ProjectPlanItem = {
			action: 'update',
			sourceProjectId: 'proj-1',
			name: 'billing',
		};

		await importer.apply(user, [item]);

		expect(projectService.updateProject).toHaveBeenCalledWith(
			user,
			'proj-1',
			expect.objectContaining({ customTelemetryTags: undefined }),
		);
	});
});

describe('ProjectImporter.plan — projectConflictPolicy', () => {
	const projectCreator = mock<User>({
		id: 'user-1',
		role: { slug: 'global:owner', scopes: [{ slug: 'project:create' }] },
	});

	const packaged: PreparedProject = {
		sourceProjectId: 'proj-1',
		name: 'billing renamed',
		description: 'from the package',
	};

	function makeImporter(existing?: Project) {
		const projectService = mock<ProjectService>();
		projectService.findProject.mockResolvedValue(existing ?? null);
		projectService.getProjectWithScope.mockResolvedValue(existing ?? null);
		const licenseState = mock<LicenseState>();
		licenseState.isLicensed.mockReturnValue(true);
		return { importer: new ProjectImporter(projectService, licenseState), projectService };
	}

	const existingProject = () => mock<Project>({ id: 'proj-1', name: 'billing', type: 'team' });

	it('plans an update under overwrite', async () => {
		const { importer } = makeImporter(existingProject());

		const plan = await importer.plan(user, [packaged], 'overwrite');

		expect(plan.conflicts).toEqual([]);
		expect(plan.items).toEqual([
			expect.objectContaining({ action: 'update', name: 'billing renamed' }),
		]);
	});

	it('plans a skip carrying the existing name under merge', async () => {
		const { importer } = makeImporter(existingProject());

		const plan = await importer.plan(user, [packaged], 'merge');

		expect(plan.conflicts).toEqual([]);
		expect(plan.items).toEqual([
			expect.objectContaining({ action: 'skip', name: 'billing renamed', existingName: 'billing' }),
		]);
	});

	it('records a conflict and plans nothing under fail', async () => {
		const { importer } = makeImporter(existingProject());

		const plan = await importer.plan(user, [packaged], 'fail');

		expect(plan.items).toEqual([]);
		expect(plan.conflicts).toEqual([
			{ kind: 'fail-policy', sourceProjectId: 'proj-1', name: 'billing renamed' },
		]);
	});

	it.each(['merge', 'fail', 'overwrite'] as const)(
		'plans a create for an absent project under %s',
		async (policy) => {
			const { importer } = makeImporter();

			const plan = await importer.plan(projectCreator, [packaged], policy);

			expect(plan.conflicts).toEqual([]);
			expect(plan.items).toEqual([expect.objectContaining({ action: 'create' })]);
		},
	);
});

describe('ProjectImporter.apply — merge', () => {
	it('reports a skipped project under the name it already has, without writing', async () => {
		const projectService = mock<ProjectService>();
		const importer = new ProjectImporter(projectService, mock<LicenseState>());

		const summaries = await importer.apply(user, [
			{
				action: 'skip',
				sourceProjectId: 'proj-1',
				name: 'billing renamed',
				existingName: 'billing',
			},
		]);

		expect(summaries).toEqual([
			{ sourceProjectId: 'proj-1', localId: 'proj-1', name: 'billing', status: 'skipped' },
		]);
		expect(projectService.updateProject).not.toHaveBeenCalled();
		expect(projectService.createTeamProject).not.toHaveBeenCalled();
	});
});
