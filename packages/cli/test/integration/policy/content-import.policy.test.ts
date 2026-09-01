/**
 * Pins the `contentImport` host wiring through the real policy decision pipeline. Unit tests mock
 * `PolicyEnforcementService`, so they prove the service method is called with the right arguments
 * but not that a registered check actually runs.
 *
 * The two hosts differ on purpose. CLI import enforces: a denied workflow is skipped, and the
 * rest of the batch still lands, so one bad artifact cannot cost an operator a whole restore.
 * Source-control pull is still advisory — it reports and imports everything.
 */
import type { SourceControlledFile } from '@n8n/api-types';
import { getPersonalProject, getWorkflowById, newWorkflow, testDb } from '@n8n/backend-test-utils';
import {
	CredentialsRepository,
	FolderRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	TagRepository,
	UserRepository,
	WorkflowRepository,
	WorkflowTagMappingRepository,
} from '@n8n/db';
import type { Project, User } from '@n8n/db';
import type {
	ContentImportContext,
	PolicyCheckResult,
	RegisteredPolicyCheck,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { nanoid } from 'nanoid';
import { readFile } from 'node:fs/promises';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import type { IWorkflowToImport } from '@/interfaces';
import { PolicyDecisionService } from '@/modules/policy-infrastructure/policy-decision.service';
import { SourceControlContextFactory } from '@/modules/source-control.ee/source-control-context.factory';
import { SourceControlImportService } from '@/modules/source-control.ee/source-control-import.service.ee';
import { SourceControlScopedService } from '@/modules/source-control.ee/source-control-scoped.service';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { ImportService } from '@/services/import.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { createOwner } from '../shared/db/users';

// `readFile` must be mocked at the module level: the source-control service imports it as a
// named binding, which `vi.spyOn` on a namespace import can't intercept under Vitest.
vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs/promises')>();
	const readFile = vi.fn(actual.readFile);
	return { ...actual, readFile, default: { ...actual, readFile } };
});

const CHECK_ID = 'test-content-import-deny';
const VIOLATION_KIND = 'test-content-import-denied';

const deniedMessage = (name: string) => `Workflow "${name}" is denied on import`;

/**
 * The decorator registers the check once per process, so it can't be swapped per test. Each
 * test instead names the workflow it wants denied or blown up, which also keeps the check from
 * touching the workflows other tests need to import cleanly.
 */
const deniedWorkflowNames = new Set<string>();
const throwingWorkflowNames = new Set<string>();

@PolicyCheck()
class ContentImportDenyCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onContentImport({ workflow }: ContentImportContext): Promise<PolicyCheckResult> {
		if (throwingWorkflowNames.has(workflow.name)) {
			throw new Error(`content-import check exploded for "${workflow.name}"`);
		}

		if (!deniedWorkflowNames.has(workflow.name)) {
			return { violations: [] };
		}

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

describe('contentImport policy wiring', () => {
	let importService: ImportService;
	let sourceControlImportService: SourceControlImportService;
	let workflowRepository: WorkflowRepository;
	let owner: User;
	let ownerProject: Project;

	beforeAll(async () => {
		await testDb.init();

		// Without this the "allowed" cases below would still pass with the check never
		// registered, which is exactly the silent allow-all this suite exists to catch.
		expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(ContentImportDenyCheck);

		// `setImplementation` is single-shot; this test file's own container hasn't installed a
		// backend yet, so this is the one place it happens.
		Container.get(PolicyEnforcementService).setImplementation(Container.get(PolicyDecisionService));

		workflowRepository = Container.get(WorkflowRepository);

		// Built directly, mirroring `test/integration/import.service.test.ts`, but with the
		// *real* `PolicyEnforcementService` wired above instead of a mock — everything else
		// unrelated to the policy call stays a stub.
		importService = new ImportService(
			mock(),
			Container.get(CredentialsRepository),
			Container.get(TagRepository),
			mock(),
			mock(),
			mock(),
			mock(),
			Container.get(UserRepository),
			mock(),
			Container.get(PolicyEnforcementService),
			Container.get(SharedWorkflowRepository),
			Container.get(WorkflowRepository),
		);

		// Same idea, mirroring `test/integration/environments/source-control-import.service.test.ts`,
		// again with the real `PolicyEnforcementService` swapped in for the mock.
		sourceControlImportService = new SourceControlImportService(
			mock(),
			mock(),
			mock(),
			Container.get(CredentialsRepository),
			Container.get(ProjectRepository),
			mock(),
			Container.get(TagRepository),
			Container.get(SharedWorkflowRepository),
			Container.get(SharedCredentialsRepository),
			Container.get(UserRepository),
			mock(),
			Container.get(WorkflowRepository),
			Container.get(WorkflowTagMappingRepository),
			mock(),
			mock(),
			mock(),
			Container.get(FolderRepository),
			mock<InstanceSettings>({ n8nFolder: '/some-path' }),
			Container.get(SourceControlContextFactory),
			Container.get(SourceControlScopedService),
			Container.get(WorkflowHistoryService),
			mock(),
			mock(),
			mock(),
			mock(),
			Container.get(PolicyEnforcementService),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
		);

		owner = await createOwner();
		ownerProject = await getPersonalProject(owner);
	});

	beforeEach(() => {
		deniedWorkflowNames.clear();
		throwingWorkflowNames.clear();
	});

	afterEach(async () => {
		await testDb.truncate([
			'WorkflowEntity',
			'SharedWorkflow',
			'WorkflowHistory',
			'WorkflowPublishHistory',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('ImportService.importWorkflows()', () => {
		test('skips the denied workflow and imports the rest of the batch', async () => {
			const clean = newWorkflow({ id: uuid(), name: 'Clean workflow' });
			const flagged = newWorkflow({ id: uuid(), name: 'Denied workflow' });
			deniedWorkflowNames.add(flagged.name);

			const { violations } = await importService.importWorkflows(
				[clean, flagged],
				ownerProject.id,
				owner.id,
				{},
			);

			expect(violations).toStrictEqual([
				{
					workflowId: flagged.id,
					name: flagged.name,
					violations: [
						{
							kind: VIOLATION_KIND,
							checkId: CHECK_ID,
							message: deniedMessage(flagged.name),
							subject: flagged.name,
							subjectType: 'workflow',
							scope: 'instance',
						},
					],
				},
			]);

			await expect(getWorkflowById(clean.id)).resolves.toBeDefined();
			await expect(getWorkflowById(flagged.id)).resolves.toBeNull();
		});

		test('imports normally when no check objects', async () => {
			const workflow = newWorkflow({ id: uuid(), name: 'Unremarkable workflow' });

			const { violations } = await importService.importWorkflows(
				[workflow],
				ownerProject.id,
				owner.id,
				{},
			);

			expect(violations).toStrictEqual([]);
			await expect(getWorkflowById(workflow.id)).resolves.toBeDefined();
		});

		// A check that cannot answer is an infrastructure fault, not a property of one workflow.
		// Skipping per workflow would silently skip every workflow and still report success.
		test('fails the whole import when the registered check throws', async () => {
			const clean = newWorkflow({ id: uuid(), name: 'Clean workflow' });
			const broken = newWorkflow({ id: uuid(), name: 'Broken workflow' });
			throwingWorkflowNames.add(broken.name);

			await expect(
				importService.importWorkflows([clean, broken], ownerProject.id, owner.id, {}),
			).rejects.toThrow();

			await expect(getWorkflowById(clean.id)).resolves.toBeNull();
			await expect(getWorkflowById(broken.id)).resolves.toBeNull();
		});
	});

	describe('SourceControlImportService.importWorkflowFromWorkFolder()', () => {
		const mockFileData = new Map<string, string>();
		const fsReadFile = vi.mocked(readFile);

		const putWorkflowFile = (workflowId: string, workflow: IWorkflowToImport) => {
			const file = `/mock/${workflowId}.json`;
			mockFileData.set(file, JSON.stringify(workflow));
			return file;
		};

		const makeWorkflowImport = (overrides: Partial<IWorkflowToImport> = {}): IWorkflowToImport => ({
			id: overrides.id ?? nanoid(),
			name: overrides.name ?? 'Test Workflow',
			versionId: overrides.versionId ?? nanoid(),
			nodes:
				overrides.nodes ??
				([
					{
						id: 'node-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300] as [number, number],
						parameters: {},
					},
				] as IWorkflowToImport['nodes']),
			connections: overrides.connections ?? {},
			settings: overrides.settings ?? {},
			parentFolderId: overrides.parentFolderId ?? null,
			active: overrides.active ?? false,
			isArchived: overrides.isArchived ?? false,
			activeVersionId: overrides.activeVersionId ?? null,
		});

		beforeEach(() => {
			mockFileData.clear();

			fsReadFile.mockImplementation(async (path) => {
				const pathStr = typeof path === 'string' ? path : path.toString();
				if (!mockFileData.has(pathStr)) {
					throw new Error(`Trying to access invalid file in test: ${pathStr}`);
				}
				return mockFileData.get(pathStr)!;
			});
		});

		test('flags only the denied workflow in the result and leaves the rest of the batch unaffected', async () => {
			const clean = makeWorkflowImport({ name: 'Clean workflow' });
			const flagged = makeWorkflowImport({ name: 'Denied workflow' });
			deniedWorkflowNames.add(flagged.name);

			const cleanFile = putWorkflowFile(clean.id, clean);
			const flaggedFile = putWorkflowFile(flagged.id, flagged);

			const result = await sourceControlImportService.importWorkflowFromWorkFolder(
				[
					mock<SourceControlledFile>({ id: clean.id, file: cleanFile }),
					mock<SourceControlledFile>({ id: flagged.id, file: flaggedFile }),
				],
				owner.id,
			);

			expect(result).toEqual([
				expect.objectContaining({ id: clean.id }),
				expect.objectContaining({
					id: flagged.id,
					contentImportPolicy: {
						violations: [
							{
								kind: VIOLATION_KIND,
								checkId: CHECK_ID,
								message: deniedMessage(flagged.name),
								subject: flagged.name,
								subjectType: 'workflow',
								scope: 'instance',
							},
						],
						checkErrors: [],
					},
				}),
			]);
			expect(result[0]).not.toHaveProperty('contentImportPolicy');

			// The pull completes for every workflow regardless of the violation.
			await expect(workflowRepository.findOne({ where: { id: clean.id } })).resolves.toBeTruthy();
			await expect(workflowRepository.findOne({ where: { id: flagged.id } })).resolves.toBeTruthy();
		});

		test('imports normally when no check objects', async () => {
			const workflow = makeWorkflowImport({ name: 'Unremarkable workflow' });
			const file = putWorkflowFile(workflow.id, workflow);

			const result = await sourceControlImportService.importWorkflowFromWorkFolder(
				[mock<SourceControlledFile>({ id: workflow.id, file })],
				owner.id,
			);

			expect(result).toEqual([expect.objectContaining({ id: workflow.id })]);
			expect(result[0]).not.toHaveProperty('contentImportPolicy');
		});

		test('does not fail the pull when the registered check throws for one workflow', async () => {
			const broken = makeWorkflowImport({ name: 'Broken workflow' });
			throwingWorkflowNames.add(broken.name);
			const file = putWorkflowFile(broken.id, broken);

			const result = await sourceControlImportService.importWorkflowFromWorkFolder(
				[mock<SourceControlledFile>({ id: broken.id, file })],
				owner.id,
			);

			// A check that errors instead of answering surfaces as a `checkError`, not a
			// violation — but either way nothing here fails the pull.
			expect(result).toEqual([
				expect.objectContaining({
					id: broken.id,
					contentImportPolicy: {
						violations: [],
						checkErrors: [{ checkId: CHECK_ID, correlationId: expect.any(String) }],
					},
				}),
			]);
			await expect(workflowRepository.findOne({ where: { id: broken.id } })).resolves.toBeTruthy();
		});
	});
});
