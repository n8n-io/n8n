import type { Project, User } from '@n8n/db';
import type { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import type { FolderFinderService } from '@/services/folder-finder.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { PackageWriter } from '../../../io/package-writer';
import type { FolderExporter } from '../../folder/folder.exporter';
import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
} from '../../package-export.errors';
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
	projectService.findExistingProjectIds.mockResolvedValue(new Set());

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

		await exporter.export({
			user,
			projectIds: [project.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

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

		await expect(
			exporter.export({
				user,
				projectIds: [project.id],
				writer,
				includeTags: true,
				workflowVersionPolicy: 'latest',
			}),
		).rejects.toThrow('1 project(s) not found or not accessible. Export aborted.');
	});

	it('throws PackageEntityNotFoundError when the missing project does not exist at all', async () => {
		const { exporter, projectService } = makeExporter({ projects: [] });
		projectService.findExistingProjectIds.mockResolvedValue(new Set());
		const writer = new CapturingWriter();

		await expect(
			exporter.export({
				user,
				projectIds: ['missing'],
				writer,
				includeTags: true,
				workflowVersionPolicy: 'latest',
			}),
		).rejects.toBeInstanceOf(PackageEntityNotFoundError);
	});

	it('throws PackageEntityAccessDeniedError when the missing project exists but is inaccessible', async () => {
		const { exporter, projectService } = makeExporter({ projects: [] });
		projectService.findExistingProjectIds.mockResolvedValue(new Set(['denied-1']));
		const writer = new CapturingWriter();

		await expect(
			exporter.export({
				user,
				projectIds: ['denied-1'],
				writer,
				includeTags: true,
				workflowVersionPolicy: 'latest',
			}),
		).rejects.toBeInstanceOf(PackageEntityAccessDeniedError);
	});

	it('exports an empty team project with project.json only', async () => {
		const project = makeProject();
		const { exporter } = makeExporter({ projects: [project] });
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({
			user,
			projectIds: [project.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

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
			includeTags: true,
			workflowVersionPolicy: 'latest',
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

	describe('workflowIds selection', () => {
		const emptyRequirements = {
			credentials: [],
			dataTables: [],
			variables: [],
			tags: [],
			nodeTypes: [],
		};

		it('forwards the selection to the folder and root workflow exporters', async () => {
			const project = makeProject();
			const { exporter, folderFinder, workflowFinder, folderExporter, workflowExporter } =
				makeExporter({ projects: [project] });
			folderFinder.findFolderIdsInProject.mockResolvedValue(['f1']);
			workflowFinder.findRootWorkflowIdsInProject.mockResolvedValue(['w-root', 'w-root-2']);
			folderExporter.export.mockResolvedValue({
				entries: [{ id: 'f1', name: 'F1', target: 'projects/billing/folders/f1' }],
				workflowEntries: [
					{ id: 'w-in-f1', name: 'In F1', target: 'projects/billing/folders/f1/workflows/x' },
				],
				requirements: emptyRequirements,
			});
			workflowExporter.export.mockResolvedValue({
				entries: [{ id: 'w-root', name: 'Root', target: 'projects/billing/workflows/root' }],
				requirements: emptyRequirements,
			});

			const result = await exporter.export({
				user,
				projectIds: [project.id],
				workflowIds: ['w-root', 'w-in-f1'],
				writer: new CapturingWriter(),
				includeTags: true,
				workflowVersionPolicy: 'latest',
			});

			const selected = new Set(['w-root', 'w-in-f1']);
			expect(folderExporter.export).toHaveBeenCalledWith(
				expect.objectContaining({ folderIds: ['f1'], selectedWorkflowIds: selected }),
			);
			expect(workflowExporter.export).toHaveBeenCalledWith(
				expect.objectContaining({
					workflowIds: ['w-root', 'w-root-2'],
					selectedWorkflowIds: selected,
				}),
			);
			expect(result.workflowEntries.map((e) => e.id).sort()).toEqual(['w-in-f1', 'w-root']);
		});

		it('throws PackageEntityNotFoundError when a selected workflow is not in the projects', async () => {
			const project = makeProject();
			const { exporter, workflowFinder, workflowExporter } = makeExporter({
				projects: [project],
			});
			workflowFinder.findRootWorkflowIdsInProject.mockResolvedValue(['w1']);
			workflowExporter.export.mockResolvedValue({
				entries: [{ id: 'w1', name: 'W1', target: 'projects/billing/workflows/w1' }],
				requirements: emptyRequirements,
			});

			await expect(
				exporter.export({
					user,
					projectIds: [project.id],
					workflowIds: ['w1', 'w-elsewhere'],
					writer: new CapturingWriter(),
					includeTags: true,
					workflowVersionPolicy: 'latest',
				}),
			).rejects.toMatchObject({
				constructor: PackageEntityNotFoundError,
				message: '1 workflow(s) not found in the requested project(s). Export aborted.',
				description: 'Missing workflow IDs: w-elsewhere',
			});
		});

		it('writes the project shell only for an empty selection', async () => {
			const project = makeProject();
			const { exporter, workflowFinder, workflowExporter } = makeExporter({
				projects: [project],
			});
			workflowFinder.findRootWorkflowIdsInProject.mockResolvedValue(['w1']);
			workflowExporter.export.mockResolvedValue({ entries: [], requirements: emptyRequirements });
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				projectIds: [project.id],
				workflowIds: [],
				writer,
				includeTags: true,
				workflowVersionPolicy: 'latest',
			});

			expect(workflowExporter.export).toHaveBeenCalledWith(
				expect.objectContaining({ selectedWorkflowIds: new Set() }),
			);
			expect(result.entries).toEqual([
				{ id: project.id, name: 'billing', target: 'projects/billing' },
			]);
			expect(result.workflowEntries).toEqual([]);
			expect(writer.files.map((f) => f.path)).toEqual(['projects/billing/project.json']);
		});
	});

	it('exports a personal project', async () => {
		const project = makeProject({ id: 'personal-1', name: 'Personal', type: 'personal' });
		const { exporter } = makeExporter({ projects: [project] });
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({
			user,
			projectIds: [project.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		expect(entries).toEqual([
			{
				id: project.id,
				name: project.name,
				target: 'projects/personal',
			},
		]);
	});
});
