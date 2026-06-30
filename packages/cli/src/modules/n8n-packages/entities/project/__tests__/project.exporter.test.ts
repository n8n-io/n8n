import type { Project, ProjectRepository, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Readable } from 'node:stream';

import type { ProjectService } from '@/services/project.service.ee';

import type { PackageWriter } from '../../../io/package-writer';
import { ProjectExporter } from '../project.exporter';
import { ProjectSerializer } from '../project.serializer';

const user = mock<User>({ id: 'user-1' });

function makeProject(overrides: Partial<Project> = {}): Project {
	return {
		id: '550e8400-e29b-41d4-a716-446655440000',
		name: 'billing',
		type: 'team',
		description: null,
		icon: null,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	} as Project;
}

class CapturingWriter implements PackageWriter {
	readonly files: Array<{ path: string; content: string }> = [];

	readonly directories: string[] = [];

	writeFile(path: string, content: string | Buffer): void {
		this.files.push({ path, content: content.toString() });
	}

	writeDirectory(path: string): void {
		this.directories.push(path);
	}

	finalize(): Readable {
		throw new Error('not used in this test');
	}
}

function makeExporter({
	projects = [],
	accessibleProjectIds = projects.map((project) => project.id),
}: {
	projects?: Project[];
	accessibleProjectIds?: string[];
} = {}) {
	const projectService = mock<ProjectService>();
	const projectRepository = mock<ProjectRepository>();

	projectService.getProjectIdsWithScope.mockImplementation(async (_user, _scopes, projectIds) =>
		(projectIds ?? []).filter((id) => accessibleProjectIds.includes(id)),
	);
	projectRepository.find.mockImplementation(async (options) => {
		const result = [...projects];
		const order = options?.order;

		if (order?.createdAt === 'ASC') {
			result.sort((left, right) => {
				const createdAtDiff = left.createdAt.getTime() - right.createdAt.getTime();
				return createdAtDiff !== 0 ? createdAtDiff : left.id.localeCompare(right.id);
			});
		}

		return result;
	});

	const exporter = new ProjectExporter(projectService, projectRepository, new ProjectSerializer());
	return { exporter, projectService, projectRepository };
}

describe('ProjectExporter', () => {
	it('checks project:export scope for the requested projects', async () => {
		const project = makeProject();
		const { exporter, projectService } = makeExporter({ projects: [project] });
		const writer = new CapturingWriter();

		await exporter.export({ user, projectIds: [project.id], writer });

		expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(
			user,
			['project:export'],
			[project.id],
		);
	});

	it('throws when the user lacks access to a requested project', async () => {
		const project = makeProject();
		const { exporter } = makeExporter({
			projects: [project],
			accessibleProjectIds: [],
		});
		const writer = new CapturingWriter();

		await expect(exporter.export({ user, projectIds: [project.id], writer })).rejects.toThrow(
			'1 project(s) not found or not accessible. Export aborted.',
		);
	});

	it('exports an empty team project with project.json only', async () => {
		const project = makeProject();
		const { exporter } = makeExporter({ projects: [project] });
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({ user, projectIds: [project.id], writer });

		expect(entries).toEqual([
			{
				id: project.id,
				name: project.name,
				target: 'projects/billing',
			},
		]);
		expect(writer.directories).toEqual(['projects/billing']);
		expect(writer.files).toEqual([
			{
				path: 'projects/billing/project.json',
				content: expect.stringContaining('"name": "billing"'),
			},
		]);
	});

	it('suffixes duplicate project names and sorts by createdAt for stable targets', async () => {
		const olderProject = makeProject({
			id: 'project-older',
			name: 'Billing',
			createdAt: new Date('2024-01-01T00:00:00.000Z'),
		});
		const newerProject = makeProject({
			id: 'project-newer',
			name: 'Billing',
			createdAt: new Date('2024-02-01T00:00:00.000Z'),
		});
		const { exporter } = makeExporter({
			projects: [newerProject, olderProject],
			accessibleProjectIds: [olderProject.id, newerProject.id],
		});
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({
			user,
			projectIds: [newerProject.id, olderProject.id],
			writer,
		});

		expect(entries).toEqual([
			{
				id: olderProject.id,
				name: olderProject.name,
				target: 'projects/billing',
			},
			{
				id: newerProject.id,
				name: newerProject.name,
				target: 'projects/billing-2',
			},
		]);
	});

	it('exports a personal project', async () => {
		const project = makeProject({ id: 'personal-1', name: 'Personal', type: 'personal' });
		const { exporter } = makeExporter({ projects: [project] });
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({ user, projectIds: [project.id], writer });

		expect(entries).toEqual([
			{
				id: project.id,
				name: project.name,
				target: 'projects/personal',
			},
		]);
	});
});
