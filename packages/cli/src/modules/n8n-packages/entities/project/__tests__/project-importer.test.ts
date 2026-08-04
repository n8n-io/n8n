import type { LicenseState } from '@n8n/backend-common';
import type { Project, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';

import type { ProjectPlanItem } from '../project-import.types';
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
			'proj-1',
			expect.objectContaining({ customTelemetryTags: undefined }),
		);
	});
});
