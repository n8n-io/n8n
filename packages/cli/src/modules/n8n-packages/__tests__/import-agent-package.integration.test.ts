import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { ProjectRepository, WorkflowHistoryRepository, WorkflowRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import {
	looseAgentsFixture,
	projectAgentsFixture,
	writeAgentPackageFixture,
	type AgentPackageFixture,
} from './fixtures/agent-package-fixtures';
import { importPackageRequest } from './fixtures/import-request';
import { streamToBuffer } from './utils/tar-support';
import { AgentSelectionExporter } from '../entities/agent/agent-selection.exporter';
import { CapturingWriter } from '../io/__tests__/utils/capturing-writer';
import { DirectoryPackageWriter } from '../io/directory/directory-package-writer';
import { TarPackageWriter } from '../io/tar/tar-package-writer';
import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportSelection } from '../n8n-packages.types';

const licenseMocker = new LicenseMocker();
mockInstance(ActiveWorkflowManager);

const entryPoints = ['archive', 'archive selection', 'directory', 'directory selection'] as const;
type EntryPoint = (typeof entryPoints)[number];

describe('Agent package import boundary', () => {
	let service: N8nPackagesService;
	let owner: User;
	let sourceDir: string;

	beforeAll(async () => {
		await testModules.loadModules(['n8n-packages']);
		await testDb.init();
		service = Container.get(N8nPackagesService);
		licenseMocker.mockLicenseState(Container.get(LicenseState));
		licenseMocker.setDefaults({
			features: ['feat:projectRole:admin', 'feat:folders'],
			quotas: { 'quota:maxTeamProjects': 100 },
		});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate([
			'WorkflowHistory',
			'WorkflowEntity',
			'SharedWorkflow',
			'ProjectRelation',
			'Project',
		]);
		licenseMocker.reset();
		owner = await createOwner();
		sourceDir = await mkdtemp(path.join(tmpdir(), 'n8n-agent-import-'));
	});

	afterEach(async () => {
		await rm(sourceDir, { recursive: true, force: true });
	});

	async function importFixture(
		entryPoint: EntryPoint,
		fixture: AgentPackageFixture,
		selection: ImportSelection,
	) {
		const writer = new TarPackageWriter();
		await writeAgentPackageFixture(writer, fixture);
		await writeAgentPackageFixture(new DirectoryPackageWriter(sourceDir), fixture);
		const request = importPackageRequest({
			user: owner,
			packageBuffer: await streamToBuffer(writer.finalize()),
			projectConflictPolicy: 'overwrite',
			workflowConflictPolicy: 'new-version',
			workflowIdPolicy: 'source',
			overwriteDeletionPolicy: 'hard-delete',
		});
		switch (entryPoint) {
			case 'archive':
				return await service.importPackage(request);
			case 'archive selection':
				return await service.importPackageSelection(request, selection);
			case 'directory':
				return await service.importPackageFromDirectory(request, { sourceDir });
			case 'directory selection':
				return await service.importPackageSelectionFromDirectory(request, { sourceDir }, selection);
		}
	}

	async function destinationRecords() {
		return {
			projects: await Container.get(ProjectRepository).find({ order: { id: 'ASC' } }),
			workflows: await Container.get(WorkflowRepository).find({ order: { id: 'ASC' } }),
			history: await Container.get(WorkflowHistoryRepository).find({ order: { versionId: 'ASC' } }),
		};
	}

	it.each(entryPoints)(
		'rejects an Agent-containing project through %s before changes',
		async (entryPoint) => {
			const project = await createTeamProject('Existing project', owner);
			const workflow = await createWorkflow(
				{ id: 'workflow_source', name: 'Existing workflow', nodes: [], connections: {} },
				project,
			);
			const targetOnly = await createWorkflow(
				{ name: 'Keep this workflow', nodes: [], connections: {} },
				project,
			);
			const fixture = projectAgentsFixture();
			fixture.manifest.projects = [
				{ id: project.id, name: 'Operations', target: 'projects/operations' },
			];
			fixture.files['projects/operations/project.json'] = { id: project.id, name: 'Operations' };
			delete fixture.manifest.requirements;
			const before = await destinationRecords();

			const result = importFixture(entryPoint, fixture, {
				selectedProjectId: project.id,
				selectedWorkflowIds: [workflow.id],
				deletedWorkflowIds: [targetOnly.id],
			});

			await expect(result).rejects.toThrow(BadRequestError);
			await expect(result).rejects.toThrow(
				'Importing packages that contain Agents is not supported yet.',
			);
			expect(await destinationRecords()).toEqual(before);
		},
	);

	it.each(['directory', 'directory selection'] as const)(
		'rejects loose Agents through %s before the empty result',
		async (entryPoint) => {
			await expect(
				importFixture(entryPoint, looseAgentsFixture(), {
					selectedProjectId: 'unused',
					selectedWorkflowIds: [],
				}),
			).rejects.toThrow('Importing packages that contain Agents is not supported yet.');
		},
	);

	it('guards Agent selection before loading Agent tables when the module is disabled', async () => {
		expect(Container.get(ModuleRegistry).isActive('agents')).toBe(false);
		const exporter = Container.get(AgentSelectionExporter);
		await expect(
			exporter.export({ user: owner, writer: new CapturingWriter(), agentIds: ['selected-agent'] }),
		).rejects.toThrow('agents module is disabled');
		const project = await createTeamProject('Available project', owner);
		const workflow = await createWorkflow({ name: 'Available workflow', nodes: [] }, project);
		for (const selection of [
			{},
			{ projectIds: [project.id] },
			{ projectIds: [project.id], projectWorkflowIds: [] },
		]) {
			const result = await exporter.export({
				user: owner,
				writer: new CapturingWriter(),
				...selection,
			});
			expect(result.agentEntries).toEqual([]);
		}
		const result = await service.exportPackageToWriter(
			{ user: owner, projectIds: [project.id] },
			new CapturingWriter(),
		);
		expect(result.manifest.workflows?.map(({ id }) => id)).toEqual([workflow.id]);
		expect(result.manifest.agents).toBeUndefined();
	});

	it('imports a workflow package with an empty Agent collection while Agents are disabled', async () => {
		const fixture = projectAgentsFixture();
		fixture.manifest.agents = [];
		delete fixture.manifest.requirements;
		for (const filePath of Object.keys(fixture.files)) {
			if (filePath.includes('/agents/')) delete fixture.files[filePath];
		}
		expect(Container.get(ModuleRegistry).isActive('agents')).toBe(false);

		const result = await importFixture('archive', fixture, {
			selectedProjectId: 'project_source',
			selectedWorkflowIds: ['workflow_source'],
		});

		expect(result.workflows).toMatchObject([
			{ sourceWorkflowId: 'workflow_source', name: 'Lookup', status: 'created' },
		]);
		expect(
			await Container.get(WorkflowRepository).findOneBy({ id: 'workflow_source' }),
		).toMatchObject({ name: 'Lookup' });
	});
});
