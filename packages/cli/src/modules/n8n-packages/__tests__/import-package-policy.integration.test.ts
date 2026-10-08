/**
 * Pins the `contentImport` and `credentialSave` wiring on the package import path through the real
 * policy decision pipeline. Unit tests mock `PolicyEnforcementService`, so they prove the gates are
 * called with the right arguments but not that a registered check actually runs.
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
import {
	CredentialsRepository,
	FolderRepository,
	TagRepository,
	WorkflowHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import type {
	ContentImportContext,
	CredentialSaveContext,
	PolicyCheckResult,
	PolicyViolation,
	RegisteredPolicyCheck,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialTypes } from '@/credential-types';
import { UnprocessableRequestError } from '@n8n/errors';
import { PolicyDecisionService } from '@/modules/policy-infrastructure/policy-decision.service';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import { importPackageRequest } from './fixtures/import-request';
import {
	buildEntityPackageBuffer,
	buildImportPackageBuffer,
	credentialRequirementsFromWorkflows,
	serializedFolder,
	serializedWorkflow,
	serializedWorkflowWithCredential,
} from './fixtures/package-fixtures';
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

	async onContentImport(context: ContentImportContext): Promise<PolicyCheckResult> {
		seenTransports.push(context.transport);

		if (!('workflow' in context) || !deniedWorkflowNames.has(context.workflow.name)) {
			return { violations: [] };
		}

		return {
			violations: [
				{
					kind: VIOLATION_KIND,
					checkId: this.id,
					message: deniedMessage(context.workflow.name),
					subject: context.workflow.name,
					subjectType: 'workflow',
					scope: 'instance',
				},
			],
		};
	}
}

const CREDENTIAL_CHECK_ID = 'test-package-credential-save-deny';

const credentialDenial = (type: string): PolicyViolation => ({
	kind: 'test-package-credential-save-denied',
	checkId: CREDENTIAL_CHECK_ID,
	message: `Credential type "${type}" is denied`,
	subject: type,
	subjectType: 'credentialType',
});

const deniedCredentialTypes = new Set<string>();
const seenCredentialSaves: CredentialSaveContext[] = [];

@PolicyCheck()
class PackageCredentialSaveDenyCheck implements RegisteredPolicyCheck {
	readonly id = CREDENTIAL_CHECK_ID;

	async onCredentialSave(context: CredentialSaveContext): Promise<PolicyCheckResult> {
		seenCredentialSaves.push(context);

		const { type } = context.credential;
		return await Promise.resolve({
			violations: deniedCredentialTypes.has(type) ? [credentialDenial(type)] : [],
		});
	}
}

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);
mockInstance(CredentialTypes).recognizes.mockReturnValue(true);

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
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(PackageCredentialSaveDenyCheck);

	Container.get(PolicyEnforcementService).setImplementation(Container.get(PolicyDecisionService));
});

beforeEach(() => {
	licenseMocker.reset();
	deniedWorkflowNames.clear();
	seenTransports.length = 0;
	deniedCredentialTypes.clear();
	seenCredentialSaves.length = 0;
});

afterEach(async () => {
	await testDb.truncate([
		'Folder',
		'TagEntity',
		'WorkflowTagMapping',
		'CredentialsEntity',
		'SharedCredentials',
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
	/** Mirrors what a promotions Apply runs: the package is source of truth. */
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

describe('credentialSave on a package import that creates stubs', () => {
	const stubbingWorkflows = [
		serializedWorkflowWithCredential({
			id: 'wf-github',
			name: 'GitHub Workflow',
			credentialId: 'cred-github',
			credentialName: 'Prod GitHub',
			credentialType: 'githubApi',
		}),
		serializedWorkflowWithCredential({
			id: 'wf-slack',
			name: 'Slack Workflow',
			credentialId: 'cred-slack',
			credentialName: 'Prod Slack',
			credentialType: 'slackApi',
		}),
	];

	/** A tag and a folder too: both are written before the stubs, so they show a halfway import. */
	const buildStubbingPackage = async () =>
		await buildEntityPackageBuffer({
			workflows: stubbingWorkflows.map((workflow) => ({
				target: `workflows/${workflow.id}`,
				workflow: { ...workflow, tagIds: ['tag-prod'] },
			})),
			folders: [{ target: 'folders/F1', folder: serializedFolder({ id: 'F1', name: 'Shipped' }) }],
			manifestExtras: {
				requirements: {
					credentials: credentialRequirementsFromWorkflows(stubbingWorkflows),
					tags: [{ id: 'tag-prod', name: 'prod', usedByWorkflows: ['wf-github', 'wf-slack'] }],
				},
			},
		});

	it('refuses the package before anything is written, listing every refused stub', async () => {
		const owner = await createOwner();
		deniedCredentialTypes.add('githubApi');
		deniedCredentialTypes.add('slackApi');

		const error = await importPackage({
			user: owner,
			packageBuffer: await buildStubbingPackage(),
			credentialMissingMode: 'create-stub',
		}).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UnprocessableRequestError);
		const issues = (error as UnprocessableRequestError).meta?.issues;
		expect(issues).toContainEqual({
			type: 'credential-policy-violation',
			sourceId: 'cred-github',
			name: 'Prod GitHub',
			credentialType: 'githubApi',
			usedByWorkflows: ['wf-github'],
			violations: [credentialDenial('githubApi')],
		} satisfies BlockingIssue);
		expect(issues).toContainEqual({
			type: 'credential-policy-violation',
			sourceId: 'cred-slack',
			name: 'Prod Slack',
			credentialType: 'slackApi',
			usedByWorkflows: ['wf-slack'],
			violations: [credentialDenial('slackApi')],
		} satisfies BlockingIssue);

		await expect(Container.get(TagRepository).count()).resolves.toBe(0);
		await expect(Container.get(FolderRepository).count()).resolves.toBe(0);
		await expect(Container.get(CredentialsRepository).count()).resolves.toBe(0);
		await expect(Container.get(WorkflowRepository).count()).resolves.toBe(0);
	});

	it('creates the stubs when the check admits them', async () => {
		const owner = await createOwner();

		const result = await importPackage({
			user: owner,
			packageBuffer: await buildStubbingPackage(),
			credentialMissingMode: 'create-stub',
		});

		expect(result.credentials.stubbed.sort()).toEqual(['cred-github', 'cred-slack']);
		await expect(Container.get(CredentialsRepository).count()).resolves.toBe(2);
		// Proves the refusal case above would have seen these writes.
		await expect(Container.get(TagRepository).count()).resolves.toBe(1);
		await expect(Container.get(FolderRepository).count()).resolves.toBe(1);
		// The plan checks each stub once, and the insert checks it again as a backstop.
		expect(seenCredentialSaves.map(({ credential }) => credential.type).sort()).toEqual([
			'githubApi',
			'githubApi',
			'slackApi',
			'slackApi',
		]);
		expect(seenCredentialSaves).toContainEqual({
			credential: { id: null, type: 'githubApi' },
			storedCredential: null,
			projectId: result.workflows[0].projectId,
		});
	});

	it('never asks the check under must-preexist, which creates no stub', async () => {
		const owner = await createOwner();
		deniedCredentialTypes.add('githubApi');

		const error = await importPackage({
			user: owner,
			packageBuffer: await buildStubbingPackage(),
			credentialMissingMode: 'must-preexist',
		}).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UnprocessableRequestError);
		const issues = (error as UnprocessableRequestError).meta?.issues as BlockingIssue[];
		expect(issues.map(({ type }) => type)).toEqual([
			'credential-unresolved',
			'credential-unresolved',
		]);
		expect(seenCredentialSaves).toEqual([]);
	});
});
