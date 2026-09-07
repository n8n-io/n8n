import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockInstance,
	mockLogger,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { FolderRepository, ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Cipher, InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import assert from 'node:assert';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	MissingWorkflowDependencyPolicy,
	WorkflowVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';
import { ProjectService } from '@/services/project.service.ee';
import { createFolder } from '@test-integration/db/folders';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import { PromotionConfigRepository } from '../database/repositories/promotion-config.repository';
import { PromotionConnectionProjectRepository } from '../database/repositories/promotion-connection-project.repository';
import { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionConfigResolver } from '../promotion-config.resolver';
import { PromotionProvidersService } from '../promotion-providers.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import { PromotionsGitService } from '../promotions-git.service';
import { PromotionsService } from '../promotions.service';

type TestRemote = {
	bareDir: string;
	workingDir: string;
	git: SimpleGit;
};

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);

let providerRepository: PromotionProviderRepository;
let connectionRepository: PromotionConnectionRepository;
let configRepository: PromotionConfigRepository;
let linkRepository: PromotionConnectionProjectRepository;
let projectRepository: ProjectRepository;
let projectService: ProjectService;
let packagesService: N8nPackagesService;
let owner: User;
let testRoot: string;
let service: PromotionsService;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'promotions']);
	await testDb.init();

	providerRepository = Container.get(PromotionProviderRepository);
	connectionRepository = Container.get(PromotionConnectionRepository);
	configRepository = Container.get(PromotionConfigRepository);
	linkRepository = Container.get(PromotionConnectionProjectRepository);
	projectRepository = Container.get(ProjectRepository);
	projectService = Container.get(ProjectService);
	packagesService = Container.get(N8nPackagesService);

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
	// Delete children before parents to satisfy the foreign keys.
	await linkRepository.delete({});
	await configRepository.delete({});
	await connectionRepository.delete({});
	await providerRepository.delete({});
	await testDb.truncate([
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'ProjectRelation',
		'Project',
	]);
	licenseMocker.reset();
	owner = await createOwner();
	testRoot = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-roundtrip-'));

	// The stored payload is written in plaintext, so the identity cipher can read it back.
	const cipher = mock<Cipher>();
	cipher.decryptV2.mockImplementation(async (value) => value);
	cipher.encryptV2.mockImplementation(async (value) => String(value));
	const logger = mockLogger();
	const gitService = new PromotionsGitService(logger);
	service = new PromotionsService(
		new PromotionConfigResolver(
			configRepository,
			connectionRepository,
			linkRepository,
			projectRepository,
		),
		new PromotionProvidersService(providerRepository, connectionRepository, gitService, cipher),
		new PromotionWorkingDirectoryService(
			mock<InstanceSettings>({ n8nFolder: path.join(testRoot, 'instance') }),
		),
		gitService,
		projectRepository,
		projectService,
		packagesService,
		logger,
	);
});

afterEach(async () => {
	// A finished git process can still hold a file for a moment, so retry.
	await rm(testRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

async function createRemote(): Promise<TestRemote> {
	const bareDir = path.join(testRoot, 'remote.git');
	const workingDir = path.join(testRoot, 'remote-working');
	await simpleGit().raw(['init', '--bare', bareDir]);
	await simpleGit().raw(['init', '--initial-branch=main', workingDir]);

	const git = simpleGit(workingDir);
	await git.addConfig('user.name', 'n8n test');
	await git.addConfig('user.email', 'n8n-test@example.com');
	await writeFile(path.join(workingDir, 'README.md'), '# n8n promotions test\n');
	await git.add(['README.md']);
	await git.commit('Initial commit');
	await git.raw(['remote', 'add', 'origin', bareDir]);
	await git.raw(['push', '--set-upstream', 'origin', 'main']);

	return { bareDir, workingDir, git };
}

/**
 * Writes the fixture through the repositories, so the local bare path is not
 * checked by the production remote URL validator.
 */
/** Branches the remote already has, so a clone finds them. */
async function createRemoteBranches(remote: TestRemote, branchNames: string[]) {
	for (const branchName of branchNames) {
		await remote.git.raw(['branch', branchName, 'main']);
	}
	await remote.git.raw(['push', 'origin', '--all']);
}

async function createInstanceConnection(
	remoteUrl: string,
	branches: { apply: string; promote: string } = { apply: 'main', promote: 'main' },
) {
	const provider = await providerRepository.insertProvider({
		name: 'Bot user',
		type: 'git',
		authType: 'token',
		config: { schemaVersion: 1 },
		auth: JSON.stringify({
			schemaVersion: 1,
			username: 'git-user',
			password: 'git-password',
		}),
	});
	const connection = await connectionRepository.insertConnection({
		name: 'Production',
		scope: 'instance',
		providerId: provider.id,
		target: { schemaVersion: 1, remoteUrl },
	});
	await configRepository.insertConfig({
		connectionId: connection.id,
		direction: 'apply',
		name: 'Apply',
		settings: { schemaVersion: 1, branchName: branches.apply },
	});
	await configRepository.insertConfig({
		connectionId: connection.id,
		direction: 'promote',
		name: 'Promote',
		settings: {
			schemaVersion: 1,
			baseBranchName: branches.promote,
			createBranchOnPromotion: false,
		},
	});
	return connection;
}

describe('Promote and Apply', () => {
	it('exports all team projects, commits them, and pushes them to the base branch', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');

		const project = await createTeamProject('Orders', owner);
		const workflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			project,
		);

		const result = await service.promote(connection.id, owner, {
			commitMessage: 'Export orders',
		});

		const inspectionDir = path.join(testRoot, 'promote-inspection');
		await simpleGit().clone(remote.bareDir, inspectionDir, ['--branch', 'main', '--single-branch']);
		const inspectionGit = simpleGit(inspectionDir);
		const remoteHead = (await inspectionGit.revparse(['HEAD'])).trim();
		const pushedCommit = (await inspectionGit.log({ maxCount: 1 })).latest;
		const manifest = packageManifestSchema.parse(
			jsonParse(await readFile(path.join(inspectionDir, 'n8n-export', 'manifest.json'), 'utf-8')),
		);
		const projectEntry = manifest.projects?.find(({ id }) => id === project.id);
		const workflowEntry = manifest.workflows?.find(({ id }) => id === workflow.id);

		assert(projectEntry);
		assert(workflowEntry);
		assert(pushedCommit);
		assert(owner.firstName);
		assert(owner.lastName);
		expect(pushedCommit).toMatchObject({
			hash: remoteHead,
			message: 'Export orders',
			author_name: `${owner.firstName} ${owner.lastName}`,
			author_email: owner.email,
		});
		await expect(readFile(path.join(inspectionDir, 'README.md'), 'utf-8')).resolves.toContain(
			'n8n promotions test',
		);
		await expect(
			readFile(path.join(inspectionDir, 'n8n-export', projectEntry.target, 'project.json')),
		).resolves.toBeDefined();
		await expect(
			readFile(path.join(inspectionDir, 'n8n-export', workflowEntry.target, 'workflow.json')),
		).resolves.toBeDefined();
		expect(result.git).toEqual({ commitSha: remoteHead, branchName: 'main' });
		expect(result.counts.workflows).toBe(1);
	});

	it('applies the package and makes the managed target scope match it', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'apply');

		const sourceProject = await createTeamProject('Orders', owner);
		const sourceWorkflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			sourceProject,
		);
		await packagesService.exportPackageToDirectory(
			{
				user: owner,
				projectIds: [sourceProject.id],
				includeVariableValues: true,
				includeTags: true,
				missingWorkflowDependencyPolicy: MissingWorkflowDependencyPolicy.Fail,
				workflowVersionPolicy: WorkflowVersionPolicy.Latest,
			},
			{ targetDir: path.join(remote.workingDir, 'n8n-export') },
		);
		await remote.git.add(['--all']);
		await remote.git.commit('Export orders');
		await remote.git.push('origin', 'main');
		const remoteHead = (await remote.git.revparse(['HEAD'])).trim();

		await projectService.deleteProject(owner, sourceProject.id);
		const targetProject = await projectService.createTeamProject(
			owner,
			{ name: 'Orders (outdated)' },
			{ id: sourceProject.id },
		);
		const targetOnlyFolder = await createFolder(targetProject, { name: 'Legacy' });
		const targetOnlyWorkflow = await createWorkflow(
			{ name: 'Old order flow', nodes: [], connections: {}, parentFolder: targetOnlyFolder },
			targetProject,
		);
		const removedProject = await createTeamProject('Removed from Git', owner);

		const result = await service.apply(connection.id, owner);

		expect(await projectRepository.findOneBy({ id: removedProject.id })).toBeNull();
		expect(await projectRepository.findOneBy({ id: targetProject.id })).toMatchObject({
			name: 'Orders',
		});
		expect(
			await Container.get(WorkflowRepository).findOneBy({ id: sourceWorkflow.id }),
		).toMatchObject({ name: 'Process order' });
		expect(
			await Container.get(WorkflowRepository).findOneBy({ id: targetOnlyWorkflow.id }),
		).toBeNull();
		expect(await Container.get(FolderRepository).findOneBy({ id: targetOnlyFolder.id })).toBeNull();
		expect(result.counts.projects.deleted).toBe(1);
		expect(result.counts.workflows.deleted).toBe(1);
		expect(result.counts.folders.removed).toBe(1);
		expect(result.git).toEqual({ commitSha: remoteHead, branchName: 'main' });
	});

	it('promotes an archived workflow and archives it on apply instead of removing it', async () => {
		const remote = await createRemote();
		const connection = await createInstanceConnection(remote.bareDir);
		await service.clone(connection.id, 'promote');
		await service.clone(connection.id, 'apply');

		const project = await createTeamProject('Orders', owner);
		const workflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			project,
		);
		const workflowRepository = Container.get(WorkflowRepository);
		await workflowRepository.update(workflow.id, { isArchived: true });

		const promoteResult = await service.promote(connection.id, owner, {
			commitMessage: 'Archive order flow',
		});
		expect(promoteResult.counts.workflows).toBe(1);

		// The target still holds the active copy; the apply must archive it, not delete it.
		await workflowRepository.update(workflow.id, { isArchived: false });

		const firstApply = await service.apply(connection.id, owner);

		expect(await workflowRepository.findOneBy({ id: workflow.id })).toMatchObject({
			isArchived: true,
		});
		expect(firstApply.counts.workflows).toMatchObject({ updated: 1, deleted: 0, archived: 0 });

		// Archived on both sides now; a second apply must still succeed.
		const secondApply = await service.apply(connection.id, owner);

		expect(secondApply.counts.workflows).toMatchObject({ updated: 1, deleted: 0 });
		expect(await workflowRepository.findOneBy({ id: workflow.id })).toMatchObject({
			isArchived: true,
		});
	});

	it('promotes to its base branch and applies from a different branch', async () => {
		const remote = await createRemote();
		await createRemoteBranches(remote, ['staging', 'dev']);
		const connection = await createInstanceConnection(remote.bareDir, {
			apply: 'dev',
			promote: 'staging',
		});
		await service.clone(connection.id, 'promote');
		await service.clone(connection.id, 'apply');

		// Seed `dev` with a package from somewhere else, then take that project away
		// so the Apply has to bring it back.
		const project = await createTeamProject('Orders', owner);
		const workflow = await createWorkflow(
			{ name: 'Process order', nodes: [], connections: {} },
			project,
		);
		const promoteResult = await service.promote(connection.id, owner, {
			commitMessage: 'Promote to staging',
		});
		await remote.git.raw(['fetch', 'origin']);
		await remote.git.raw(['push', 'origin', 'refs/remotes/origin/staging:refs/heads/dev']);
		const devHead = (await remote.git.revparse(['origin/staging'])).trim();
		await Container.get(WorkflowRepository).delete({ id: workflow.id });

		const applyResult = await service.apply(connection.id, owner);

		expect(promoteResult.git.branchName).toBe('staging');
		expect(applyResult.git).toEqual({ commitSha: devHead, branchName: 'dev' });
		expect(await Container.get(WorkflowRepository).findOneBy({ id: workflow.id })).toMatchObject({
			name: 'Process order',
		});

		// `main` never took part, so the packageless branch is untouched.
		const inspectionDir = path.join(testRoot, 'main-inspection');
		await simpleGit().clone(remote.bareDir, inspectionDir, ['--branch', 'main', '--single-branch']);
		await expect(
			readFile(path.join(inspectionDir, 'n8n-export', 'manifest.json')),
		).rejects.toThrow();
	});
});
