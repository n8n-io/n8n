/**
 * Pins the `contentImport` wiring on the package import path through the real policy decision
 * pipeline. Unit tests mock `PolicyEnforcementService`, so they prove the gate is called with
 * the right arguments but not that a registered check actually runs.
 *
 * A refusal takes down the whole package on both transports, unlike a source-control pull, which
 * skips the blocked workflow and lets the rest land.
 */
import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { WorkflowHistoryRepository, WorkflowRepository } from '@n8n/db';
import type {
	ContentImportContext,
	PolicyCheckResult,
	RegisteredPolicyCheck,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { PolicyDecisionService } from '@/modules/policy-infrastructure/policy-decision.service';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import { importPackageRequest } from './fixtures/import-request';
import { buildImportPackageBuffer, serializedWorkflow } from './fixtures/package-fixtures';
import type { BlockingIssue, ImportPackageRequest, ImportRequest } from '../n8n-packages.types';

const CHECK_ID = 'test-package-content-import-deny';
const VIOLATION_KIND = 'test-package-content-import-denied';

const deniedMessage = (name: string) => `Workflow "${name}" is denied on import`;

/** The decorator registers once per process, so each test names the workflow it wants denied. */
const deniedWorkflowNames = new Set<string>();
const seenTransports: string[] = [];

@PolicyCheck()
class PackageContentImportDenyCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onContentImport({ workflow, transport }: ContentImportContext): Promise<PolicyCheckResult> {
		seenTransports.push(transport);

		if (!deniedWorkflowNames.has(workflow.name)) return { violations: [] };

		return {
			violations: [
				{
					kind: VIOLATION_KIND,
					checkId: this.id,
					message: deniedMessage(workflow.name),
					subject: workflow.name,
					subjectType: 'workflow',
					scope: 'instance',
				},
			],
		};
	}
}

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);

async function importPackage(
	params: Pick<ImportPackageRequest, 'user' | 'packageBuffer'> & Partial<ImportPackageRequest>,
) {
	return await Container.get(N8nPackagesService).importPackage(
		importPackageRequest({ variableParentPolicy: 'project', ...params }),
	);
}

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	await initNodeTypes();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({
		features: ['feat:projectRole:admin', 'feat:folders'],
		quotas: { 'quota:maxTeamProjects': 100 },
	});

	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(PackageContentImportDenyCheck);

	Container.get(PolicyEnforcementService).setImplementation(Container.get(PolicyDecisionService));
});

beforeEach(() => {
	deniedWorkflowNames.clear();
	seenTransports.length = 0;
});

afterEach(async () => {
	await testDb.truncate([
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
		'ProjectRelation',
		'Project',
	]);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('contentImport on a direct package import', () => {
	it('refuses the package before anything is written', async () => {
		const owner = await createOwner();
		deniedWorkflowNames.add('Denied Workflow');

		const packageBuffer = await buildImportPackageBuffer([
			serializedWorkflow({ id: 'wf-clean', name: 'Clean Workflow' }),
			serializedWorkflow({ id: 'wf-denied', name: 'Denied Workflow' }),
		]);

		const error = await importPackage({ user: owner, packageBuffer }).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UnprocessableRequestError);
		expect((error as UnprocessableRequestError).meta?.issues).toContainEqual({
			type: 'policy-violation',
			sourceWorkflowId: 'wf-denied',
			name: 'Denied Workflow',
			violations: [
				{
					kind: VIOLATION_KIND,
					checkId: CHECK_ID,
					message: deniedMessage('Denied Workflow'),
					subject: 'Denied Workflow',
					subjectType: 'workflow',
					scope: 'instance',
				},
			],
		} satisfies BlockingIssue);

		// The whole package is refused, not just the denied workflow.
		await expect(Container.get(WorkflowRepository).count()).resolves.toBe(0);
	});

	// The registry short-circuit (nothing registered for `contentImport`) cannot be covered here:
	// `@PolicyCheck` registers per process, so this file always has one. See the gate's unit test.
	it('imports the workflow when the check admits it', async () => {
		const owner = await createOwner();

		const result = await importPackage({
			user: owner,
			packageBuffer: await buildImportPackageBuffer([
				serializedWorkflow({ id: 'wf-1', name: 'Unremarkable Workflow' }),
			]),
		});

		// Proves the check ran and allowed it, rather than never running at all.
		expect(seenTransports).toEqual(['package']);
		expect(result.workflows).toHaveLength(1);
		await expect(Container.get(WorkflowRepository).count()).resolves.toBe(1);
	});
});

describe('contentImport on a git pull', () => {
	/** Mirrors what a git-connections pull runs: the working copy is source of truth. */
	const pullPolicy: Omit<ImportRequest, 'user'> = {
		projectConflictPolicy: 'overwrite',
		workflowConflictPolicy: 'new-version',
		workflowIdPolicy: 'source',
		workflowPublishingPolicy: 'match-source',
		missingNodeTypeMode: 'fail',
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'create-stub',
		folderConflictPolicy: 'overwrite',
		overwriteDeletionPolicy: 'hard-delete',
		dataTableMatchingMode: 'by-id',
		dataTableMissingMode: 'create',
		dataTableSchemaConflictPolicy: 'fail',
		variableMissingMode: 'create-with-value',
		variableConflictPolicy: 'overwrite',
		tagMissingMode: 'create',
		tagConflictPolicy: 'rename',
	};

	let sourceDir: string;

	beforeEach(async () => {
		sourceDir = await mkdtemp(path.join(tmpdir(), 'n8n-package-policy-'));
	});

	afterEach(async () => {
		await rm(sourceDir, { recursive: true, force: true });
	});

	it('refuses the whole pull and writes nothing', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Pulled Project', owner);
		const workflow = await createWorkflow(
			{ name: 'Pulled Workflow', nodes: [], connections: {} },
			project,
		);

		const service = Container.get(N8nPackagesService);
		await service.exportPackageToDirectory(
			{ user: owner, projectIds: [project.id] },
			{ targetDir: sourceDir },
		);

		// Only now, so the export itself is not admitted.
		deniedWorkflowNames.add('Pulled Workflow');
		seenTransports.length = 0;

		const error = await service
			.importPackageFromDirectory({ user: owner, ...pullPolicy }, { sourceDir })
			.catch((e: unknown) => e);

		expect(seenTransports).toEqual(['git-connection']);
		expect(error).toBeInstanceOf(UnprocessableRequestError);

		// "Writes nothing" means the target is untouched, not empty: the pull would have
		// rewritten this workflow, so its row must still carry the version it had before.
		const workflowRepository = Container.get(WorkflowRepository);
		await expect(workflowRepository.count()).resolves.toBe(1);
		await expect(workflowRepository.findOneBy({ id: workflow.id })).resolves.toMatchObject({
			name: workflow.name,
			versionId: workflow.versionId,
			activeVersionId: workflow.activeVersionId,
		});
		await expect(Container.get(WorkflowHistoryRepository).count()).resolves.toBe(0);

		expect((error as UnprocessableRequestError).meta?.issues).toContainEqual({
			type: 'policy-violation',
			sourceWorkflowId: workflow.id,
			name: 'Pulled Workflow',
			violations: [
				{
					kind: VIOLATION_KIND,
					checkId: CHECK_ID,
					message: deniedMessage('Pulled Workflow'),
					subject: 'Pulled Workflow',
					subjectType: 'workflow',
					scope: 'instance',
				},
			],
		} satisfies BlockingIssue);
	});
});
