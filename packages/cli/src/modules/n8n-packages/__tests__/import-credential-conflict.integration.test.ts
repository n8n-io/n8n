import type { SerializedCredential } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project, User } from '@n8n/db';
import {
	CredentialsRepository,
	FolderRepository,
	TagRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError, UnprocessableRequestError } from '@n8n/errors';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialTypes } from '@/credential-types';
import {
	affixRoleToSaveCredential,
	saveCredential,
	shareCredentialWithProjects,
} from '@test-integration/db/credentials';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import { importPackageRequest } from './fixtures/import-request';
import {
	buildEntityPackageBuffer,
	buildImportPackageBuffer,
	credentialRequirementsFromWorkflows,
	githubCredentialPayload,
	serializedCredential,
	serializedProject,
	serializedWorkflowWithCredential,
} from './fixtures/package-fixtures';
import type { BlockingIssue, ImportPackageRequest } from '../n8n-packages.types';

const EXPRESSION = '={{ $vars.githubToken }}';
const OTHER_EXPRESSION = '={{ $vars.otherToken }}';

const licenseMocker = new LicenseMocker();
const saveOwnedCredential = affixRoleToSaveCredential('credential:owner');

mockInstance(ActiveWorkflowManager);

async function importPackage(
	params: Pick<ImportPackageRequest, 'user' | 'packageBuffer'> & Partial<ImportPackageRequest>,
) {
	return await Container.get(N8nPackagesService).importPackage(importPackageRequest(params));
}

/** A workflow package with one workflow that uses `credential`, and the credential file. */
async function workflowPackage(
	credential: CredentialsEntity,
	file: Omit<SerializedCredential, 'id' | 'type'> | 'no-file',
): Promise<Buffer> {
	return await buildImportPackageBuffer(
		[
			serializedWorkflowWithCredential({
				id: 'wf-source',
				name: 'Uses credential',
				credentialId: credential.id,
				credentialName: credential.name,
			}),
		],
		file === 'no-file'
			? {}
			: { credentials: [serializedCredential({ id: credential.id, ...file })] },
	);
}

async function blockingIssuesOf(
	promise: Promise<unknown>,
	errorClass: typeof ConflictError | typeof UnprocessableRequestError = ConflictError,
): Promise<BlockingIssue[]> {
	const error = await promise.then(
		() => undefined,
		(e: unknown) => e,
	);
	const issues = (error as ConflictError).meta?.issues as BlockingIssue[];
	expect(error, JSON.stringify(issues)).toBeInstanceOf(errorClass);
	return issues;
}

/** Proves the import wrote nothing and left the credential row as it was. */
async function expectNothingWritten(credential: CredentialsEntity) {
	expect(await Container.get(WorkflowRepository).count()).toBe(0);
	expect(await Container.get(FolderRepository).count()).toBe(0);
	expect(await Container.get(TagRepository).count()).toBe(0);
	const stored = await Container.get(CredentialsRepository).findOneByOrFail({ id: credential.id });
	expect(stored.name).toBe(credential.name);
	expect(stored.data).toBe(credential.data);
}

let owner: User;
let project: Project;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	await initNodeTypes();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({
		features: ['feat:projectRole:admin', 'feat:folders'],
		quotas: { 'quota:maxTeamProjects': 100 },
	});
	mockInstance(CredentialTypes).recognizes.mockReturnValue(true);
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'Folder',
		'TagEntity',
		'Project',
		'ProjectRelation',
		'CredentialsEntity',
		'SharedCredentials',
		'User',
	]);
	owner = await createOwner();
	project = await createTeamProject('Target', owner);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('credentialConflictPolicy', () => {
	it('keep-existing (default) imports a differing match and leaves the credential as it is', async () => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'GitHub', data: { accessToken: 'stored-secret' } }),
			{ project },
		);

		await importPackage({
			user: owner,
			projectId: project.id,
			packageBuffer: await workflowPackage(credential, {
				name: 'Renamed',
				data: { accessToken: EXPRESSION },
			}),
		});

		expect(await Container.get(WorkflowRepository).count()).toBe(1);
		const stored = await Container.get(CredentialsRepository).findOneByOrFail({
			id: credential.id,
		});
		expect(stored.name).toBe('GitHub');
		expect(stored.data).toBe(credential.data);
	});

	it('fail blocks a rename and writes nothing', async () => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'GitHub', data: { accessToken: EXPRESSION } }),
			{ project },
		);

		const issues = await blockingIssuesOf(
			importPackage({
				user: owner,
				projectId: project.id,
				credentialConflictPolicy: 'fail',
				packageBuffer: await workflowPackage(credential, {
					name: 'Renamed',
					data: { accessToken: EXPRESSION },
				}),
			}),
		);

		expect(issues).toEqual([
			{
				type: 'credential-conflict',
				kind: 'differs',
				targetId: credential.id,
				sourceIds: [credential.id],
				name: 'GitHub',
				usedBy: [{ kind: 'workflow', id: 'wf-source' }],
			},
		]);
		await expectNothingWritten(credential);
	});

	it('fail blocks an expression change', async () => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'GitHub', data: { accessToken: 'stored-secret' } }),
			{ project },
		);

		const issues = await blockingIssuesOf(
			importPackage({
				user: owner,
				projectId: project.id,
				credentialConflictPolicy: 'fail',
				packageBuffer: await workflowPackage(credential, {
					name: 'GitHub',
					data: { accessToken: EXPRESSION },
				}),
			}),
		);

		expect(issues).toEqual([
			expect.objectContaining({ type: 'credential-conflict', kind: 'differs' }),
		]);
		await expectNothingWritten(credential);
	});

	it('fail imports an identical package', async () => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({
				name: 'GitHub',
				data: { accessToken: EXPRESSION, clientSecret: 'stored-secret' },
			}),
			{ project },
		);

		const result = await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'fail',
			packageBuffer: await workflowPackage(credential, {
				name: 'GitHub',
				data: { accessToken: EXPRESSION },
			}),
		});

		expect(result.bindings.credentials).toEqual({ [credential.id]: credential.id });
	});

	it('fail imports a match without a credential file', async () => {
		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub' }), {
			project,
		});

		const result = await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'fail',
			packageBuffer: await workflowPackage(credential, 'no-file'),
		});

		expect(result.bindings.credentials).toEqual({ [credential.id]: credential.id });
	});

	it('fail only binds a credential owned by a project outside the import', async () => {
		const otherProject = await createTeamProject('Other', owner);
		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub' }), {
			project: otherProject,
		});
		await shareCredentialWithProjects(credential, [project]);

		const result = await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'fail',
			packageBuffer: await workflowPackage(credential, {
				name: 'Renamed',
				data: { accessToken: EXPRESSION },
			}),
		});

		expect(result.bindings.credentials).toEqual({ [credential.id]: credential.id });
	});

	it('fail only binds a global credential owned outside the import', async () => {
		const credential = await saveCredential(
			githubCredentialPayload({ name: 'Global GitHub', isGlobal: true }),
			{ user: owner, role: 'credential:owner' },
		);

		const result = await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'fail',
			packageBuffer: await workflowPackage(credential, { name: 'Renamed' }),
		});

		expect(result.bindings.credentials).toEqual({ [credential.id]: credential.id });
	});

	it('overwrite only binds a global credential that a project admin cannot update', async () => {
		const member = await createMember();
		await linkUserToProject(member, project, 'project:admin');
		const credential = await saveCredential(
			githubCredentialPayload({ name: 'Global GitHub', isGlobal: true }),
			{ user: owner, role: 'credential:owner' },
		);

		const result = await importPackage({
			user: member,
			projectId: project.id,
			credentialConflictPolicy: 'overwrite',
			packageBuffer: await workflowPackage(credential, {
				name: 'Renamed',
				data: { accessToken: EXPRESSION },
			}),
		});

		expect(result.bindings.credentials).toEqual({ [credential.id]: credential.id });
		const stored = await Container.get(CredentialsRepository).findOneByOrFail({
			id: credential.id,
		});
		expect(stored.name).toBe('Global GitHub');
		expect(stored.data).toBe(credential.data);
	});

	it('fail blocks a global credential owned by the import project', async () => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'Global GitHub', isGlobal: true }),
			{ project },
		);

		const issues = await blockingIssuesOf(
			importPackage({
				user: owner,
				projectId: project.id,
				credentialConflictPolicy: 'fail',
				packageBuffer: await workflowPackage(credential, { name: 'Renamed' }),
			}),
		);

		expect(issues).toEqual([
			expect.objectContaining({
				type: 'credential-conflict',
				kind: 'differs',
				targetId: credential.id,
			}),
		]);
		await expectNothingWritten(credential);
	});

	describe('credential in scope that the importing user cannot update', () => {
		let member: User;
		let credential: CredentialsEntity;

		beforeEach(async () => {
			member = await createMember();
			// Project editors and admins always hold `credential:update`: only a custom role lacks it.
			const role = await createCustomRoleWithScopeSlugs(
				[
					'project:read',
					'project:list',
					'workflow:create',
					'workflow:read',
					'workflow:update',
					'workflow:import',
					'workflow:list',
					'credential:read',
					'credential:list',
				],
				{ roleType: 'project' },
			);
			await linkUserToProject(member, project, role.slug);
			credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub' }), {
				project,
			});
		});

		it('fail blocks it and writes nothing', async () => {
			const issues = await blockingIssuesOf(
				importPackage({
					user: member,
					projectId: project.id,
					credentialConflictPolicy: 'fail',
					packageBuffer: await workflowPackage(credential, {
						name: 'Renamed',
						data: { accessToken: EXPRESSION },
					}),
				}),
				UnprocessableRequestError,
			);

			expect(issues).toEqual([
				{
					type: 'credential-update-forbidden',
					targetId: credential.id,
					sourceIds: [credential.id],
					name: 'GitHub',
					usedBy: [{ kind: 'workflow', id: 'wf-source' }],
				},
			]);
			await expectNothingWritten(credential);
		});

		it('overwrite blocks it also when the package would not change it', async () => {
			const issues = await blockingIssuesOf(
				importPackage({
					user: member,
					projectId: project.id,
					credentialConflictPolicy: 'overwrite',
					packageBuffer: await workflowPackage(credential, { name: 'GitHub' }),
				}),
				UnprocessableRequestError,
			);

			expect(issues).toEqual([
				expect.objectContaining({
					type: 'credential-update-forbidden',
					targetId: credential.id,
				}),
			]);
			await expectNothingWritten(credential);
		});

		it('keep-existing binds it', async () => {
			const result = await importPackage({
				user: member,
				projectId: project.id,
				credentialConflictPolicy: 'keep-existing',
				packageBuffer: await workflowPackage(credential, { name: 'Renamed' }),
			});

			expect(result.bindings.credentials).toEqual({ [credential.id]: credential.id });
		});
	});

	it('fail only binds a managed credential', async () => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'Managed GitHub', isManaged: true }),
			{ project },
		);

		const result = await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'fail',
			packageBuffer: await workflowPackage(credential, { name: 'Renamed' }),
		});

		expect(result.bindings.credentials).toEqual({ [credential.id]: credential.id });
	});

	it('fail only binds a resolvable credential', async () => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'Resolvable GitHub', isResolvable: true }),
			{ project },
		);

		const result = await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'fail',
			packageBuffer: await workflowPackage(credential, { name: 'Renamed' }),
		});

		expect(result.bindings.credentials).toEqual({ [credential.id]: credential.id });
	});

	it('overwrite blocks two package credentials with different payloads for one destination', async () => {
		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub' }), {
			project,
		});

		const issues = await blockingIssuesOf(
			importPackage({
				user: owner,
				projectId: project.id,
				credentialConflictPolicy: 'overwrite',
				bindings: {
					credentials: new Map([
						['source-a', credential.id],
						['source-b', credential.id],
					]),
				},
				packageBuffer: await buildImportPackageBuffer(
					[
						serializedWorkflowWithCredential({
							id: 'wf-a',
							name: 'Uses A',
							credentialId: 'source-a',
							credentialName: 'A',
						}),
						serializedWorkflowWithCredential({
							id: 'wf-b',
							name: 'Uses B',
							credentialId: 'source-b',
							credentialName: 'B',
						}),
					],
					{
						credentials: [
							serializedCredential({
								id: 'source-a',
								name: 'A',
								data: { accessToken: EXPRESSION },
							}),
							serializedCredential({
								id: 'source-b',
								name: 'B',
								data: { accessToken: OTHER_EXPRESSION },
							}),
						],
					},
				),
			}),
		);

		expect(issues).toEqual([
			{
				type: 'credential-conflict',
				kind: 'divergent',
				targetId: credential.id,
				sourceIds: ['source-a', 'source-b'],
				name: 'GitHub',
				usedBy: [
					{ kind: 'workflow', id: 'wf-a' },
					{ kind: 'workflow', id: 'wf-b' },
				],
			},
		]);
		await expectNothingWritten(credential);
	});

	it('fail blocks a credential owned by another project of a project package', async () => {
		const secondProject = await createTeamProject('Second', owner);
		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub' }), {
			project: secondProject,
		});
		await shareCredentialWithProjects(credential, [project]);
		const workflow = serializedWorkflowWithCredential({
			id: 'wf-source',
			name: 'Uses credential',
			credentialId: credential.id,
			credentialName: credential.name,
		});

		const issues = await blockingIssuesOf(
			importPackage({
				user: owner,
				credentialConflictPolicy: 'fail',
				packageBuffer: await buildEntityPackageBuffer({
					projects: [
						{
							target: 'projects/target',
							project: serializedProject({ id: project.id, name: project.name }),
						},
						{
							target: 'projects/second',
							project: serializedProject({ id: secondProject.id, name: secondProject.name }),
						},
					],
					workflows: [{ target: 'projects/target/workflows/wf', workflow }],
					credentials: [
						{
							target: 'projects/second/credentials/github',
							credential: serializedCredential({ id: credential.id, name: 'Renamed' }),
						},
					],
					manifestExtras: {
						requirements: { credentials: credentialRequirementsFromWorkflows([workflow]) },
					},
				}),
			}),
		);

		expect(issues).toEqual([
			expect.objectContaining({
				type: 'credential-conflict',
				kind: 'differs',
				targetId: credential.id,
			}),
		]);
		await expectNothingWritten(credential);
	});
});
