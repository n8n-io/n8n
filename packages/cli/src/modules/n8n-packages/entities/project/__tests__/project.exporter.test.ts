import type { Project, User } from '@n8n/db';
import type { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import type { FolderFinderService } from '@/services/folder-finder.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { PackageWriter } from '../../../io/package-writer';
import type { FolderExporter } from '../../folder/folder.exporter';
import type { WorkflowExporter } from '../../workflow/workflow.exporter';
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
}: {
	projects?: Project[];
} = {}) {
	const projectService = mock<ProjectService>();

	projectService.findProjectsByIdsForUser.mockImplementation(async (_user, projectIds) => {
		const accessibleProjects = projects.filter((project) => projectIds.includes(project.id));
		return [...accessibleProjects].sort((left, right) => {
			const createdAtDiff = left.createdAt.getTime() - right.createdAt.getTime();
			return createdAtDiff !== 0 ? createdAtDiff : left.id.localeCompare(right.id);
		});
	});

	const folderFinder = mock<FolderFinderService>();
	folderFinder.findFolderIdsInProject.mockResolvedValue([]);

	const workflowFinder = mock<WorkflowFinderService>();
	workflowFinder.findRootWorkflowIdsInProject.mockResolvedValue([]);

	const folderExporter = mock<FolderExporter>();
	const workflowExporter = mock<WorkflowExporter>();

	const exporter = new ProjectExporter(
		projectService,
		new ProjectSerializer(),
		folderFinder,
		workflowFinder,
		folderExporter,
		workflowExporter,
	);
	return {
		exporter,
		projectService,
		folderFinder,
		workflowFinder,
		folderExporter,
		workflowExporter,
	};
}

describe('ProjectExporter', () => {
	it('checks project:export scope for the requested projects', async () => {
		const project = makeProject();
		const { exporter, projectService } = makeExporter({ projects: [project] });
		const writer = new CapturingWriter();

		await exporter.export({ user, projectIds: [project.id], writer });

		expect(projectService.findProjectsByIdsForUser).toHaveBeenCalledWith(
			user,
			[project.id],
			['project:export'],
		);
	});

	it('throws when the user lacks access to a requested project', async () => {
		const project = makeProject();
		const { exporter } = makeExporter({ projects: [] });
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
