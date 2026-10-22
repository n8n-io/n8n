import type { SerializedCredential } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
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
	VariablesRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	UnprocessableRequestError,
} from '@n8n/errors';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialTypes } from '@/credential-types';
import { CredentialsService } from '@/credentials/credentials.service';
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
	serializedFolder,
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
	expect(await Container.get(VariablesRepository).count()).toBe(0);
	const stored = await Container.get(CredentialsRepository).findOneByOrFail({ id: credential.id });
	expect(stored.name).toBe(credential.name);
	expect(stored.data).toBe(credential.data);
}

async function storedCredential(id: string) {
	const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });
	return { credential, data: await Container.get(CredentialsService).decrypt(credential, true) };
}

/** A project package with one workflow in each of the two projects, both using `credential`. */
async function twoProjectPackage(
	projects: [Project, Project],
	credential: CredentialsEntity,
	file: Omit<SerializedCredential, 'id' | 'type'>,
): Promise<Buffer> {
	const workflows = projects.map((_, index) =>
		serializedWorkflowWithCredential({
			id: `wf-${index}`,
			name: `Uses credential ${index}`,
			credentialId: credential.id,
			credentialName: credential.name,
		}),
	);
	return await buildEntityPackageBuffer({
		projects: projects.map((target, index) => ({
			target: `projects/p${index}`,
			project: serializedProject({ id: target.id, name: target.name }),
		})),
		workflows: workflows.map((workflow, index) => ({
			target: `projects/p${index}/workflows/wf`,
			workflow,
		})),
		credentials: [
			{
				target: 'projects/p0/credentials/github',
				credential: serializedCredential({ id: credential.id, ...file }),
			},
		],
		manifestExtras: {
			requirements: { credentials: credentialRequirementsFromWorkflows(workflows) },
		},
	});
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
	const credentialTypes = mockInstance(CredentialTypes);
	credentialTypes.recognizes.mockReturnValue(true);
	credentialTypes.getParentTypes.mockReturnValue([]);
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
	licenseMocker.reset();
	owner = await createOwner();
	project = await createTeamProject('Target', owner);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('credential:create project scope', () => {
	it('rejects create-stub before any write when the project role lacks credential:create', async () => {
		const member = await createMember();
		const role = await createCustomRoleWithScopeSlugs(
			['workflow:import', 'folder:create', 'folder:update'],
			{ roleType: 'project' },
		);
		await linkUserToProject(member, project, role.slug);
		const workflow = serializedWorkflowWithCredential({
			id: 'wf-source',
			name: 'Uses missing credential',
			credentialId: 'missing-cred',
			credentialName: 'Missing GitHub',
		});

		await expect(
			importPackage({
				user: member,
				projectId: project.id,
				credentialMissingMode: 'create-stub',
				packageBuffer: await buildEntityPackageBuffer({
					workflows: [{ target: 'workflows/wf-source', workflow }],
					// The import writes folders before credentials.
					folders: [{ target: 'folders/F1', folder: serializedFolder({ id: 'F1' }) }],
					manifestExtras: {
						requirements: { credentials: credentialRequirementsFromWorkflows([workflow]) },
					},
				}),
			}),
		).rejects.toThrow("You don't have the permissions to save the credential in this project.");

		expect(await Container.get(FolderRepository).count()).toBe(0);
		expect(await Container.get(CredentialsRepository).count()).toBe(0);
	});
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

		it('overwrite blocks it and writes nothing', async () => {
			const issues = await blockingIssuesOf(
				importPackage({
					user: member,
					projectId: project.id,
					credentialConflictPolicy: 'overwrite',
					packageBuffer: await workflowPackage(credential, {
						name: 'Renamed',
						data: { accessToken: EXPRESSION },
					}),
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

describe('credentialConflictPolicy=overwrite writes', () => {
	it('writes the package name and values, and keeps everything else', async () => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({
				name: 'GitHub',
				isGlobal: true,
				data: {
					accessToken: 'stored-secret',
					server: 'https://api.github.com',
					oauthTokenData: { access_token: 'token' },
				},
			}),
			{ project },
		);
		await Container.get(CredentialsRepository).update(credential.id, { description: 'Team token' });

		const result = await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'overwrite',
			packageBuffer: await workflowPackage(credential, {
				name: 'Renamed',
				data: { user: EXPRESSION },
			}),
		});

		expect(result.credentials).toEqual({
			matched: [],
			stubbed: [],
			seeded: [],
			incomplete: [],
			updated: [credential.id],
		});
		expect(result.bindings.credentials).toEqual({ [credential.id]: credential.id });
		const stored = await storedCredential(credential.id);
		expect(stored.credential.name).toBe('Renamed');
		expect(stored.data).toEqual({
			accessToken: 'stored-secret',
			server: 'https://api.github.com',
			user: EXPRESSION,
			oauthTokenData: { access_token: 'token' },
		});
		expect(stored.credential.isGlobal).toBe(true);
		expect(stored.credential.isResolvable).toBe(false);
		expect(stored.credential.description).toBe('Team token');
		expect(await Container.get(WorkflowRepository).count()).toBe(1);
	});

	it('emits credentials-updated once for each written credential', async () => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'GitHub', data: { accessToken: 'stored-secret' } }),
			{ project },
		);
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const params = {
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'overwrite' as const,
			workflowConflictPolicy: 'new-version' as const,
			packageBuffer: await workflowPackage(credential, {
				name: 'Renamed',
				data: { accessToken: EXPRESSION },
			}),
		};

		await importPackage(params);
		const updatedEvents = () => emit.mock.calls.filter(([name]) => name === 'credentials-updated');
		expect(updatedEvents()).toEqual([
			[
				'credentials-updated',
				expect.objectContaining({
					user: owner,
					credentialId: credential.id,
					credentialName: 'Renamed',
					credentialType: credential.type,
				}),
			],
		]);

		emit.mockClear();
		await importPackage(params);
		expect(updatedEvents()).toEqual([]);
		emit.mockRestore();
	});

	it('replaces a stored plain value with the package expression', async () => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'GitHub', data: { accessToken: 'stored-secret' } }),
			{ project },
		);

		const result = await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'overwrite',
			packageBuffer: await workflowPackage(credential, {
				name: 'GitHub',
				data: { accessToken: EXPRESSION },
			}),
		});

		expect(result.credentials.updated).toEqual([credential.id]);
		expect((await storedCredential(credential.id)).data).toEqual({ accessToken: EXPRESSION });
	});

	it('keeps a stored array', async () => {
		const headers = [{ name: 'X-Key', value: 'stored-secret' }];
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'GitHub', data: { accessToken: 'stored-secret', headers } }),
			{ project },
		);

		await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'overwrite',
			packageBuffer: await workflowPackage(credential, {
				name: 'GitHub',
				data: { accessToken: EXPRESSION, headers: [{ value: OTHER_EXPRESSION }] },
			}),
		});

		expect((await storedCredential(credential.id)).data).toEqual({
			accessToken: EXPRESSION,
			headers,
		});
	});

	it('writes nothing when the same package is imported again', async () => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'GitHub', data: { accessToken: 'stored-secret' } }),
			{ project },
		);
		const params = {
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'overwrite' as const,
			workflowConflictPolicy: 'new-version' as const,
			packageBuffer: await workflowPackage(credential, {
				name: 'Renamed',
				data: { accessToken: EXPRESSION },
			}),
		};
		await importPackage(params);
		const afterFirst = await storedCredential(credential.id);
		const update = vi.spyOn(Container.get(CredentialsService), 'update');

		const result = await importPackage(params);

		expect(result.credentials.updated).toEqual([]);
		expect(result.credentials.matched).toEqual([credential.id]);
		expect(update).not.toHaveBeenCalled();
		const afterSecond = await storedCredential(credential.id);
		expect(afterSecond.credential.updatedAt).toEqual(afterFirst.credential.updatedAt);
		expect(afterSecond.credential.data).toBe(afterFirst.credential.data);
		update.mockRestore();
	});

	it('drops the stored token when the package points a client-credentials grant at another client', async () => {
		const credential = await saveOwnedCredential(
			{
				name: 'OAuth client',
				type: 'oAuth2Api',
				data: {
					grantType: 'clientCredentials',
					clientId: 'old-client',
					clientSecret: 'stored-secret',
					accessTokenUrl: 'https://example.com/token',
					oauthTokenData: { access_token: 'token-of-old-client' },
				},
			},
			{ project },
		);

		await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'overwrite',
			packageBuffer: await buildImportPackageBuffer(
				[
					serializedWorkflowWithCredential({
						id: 'wf-source',
						name: 'Uses credential',
						credentialId: credential.id,
						credentialName: credential.name,
						credentialType: 'oAuth2Api',
					}),
				],
				{
					credentials: [
						serializedCredential({
							id: credential.id,
							name: credential.name,
							type: 'oAuth2Api',
							data: { clientId: EXPRESSION },
						}),
					],
				},
			),
		});

		const { data } = await storedCredential(credential.id);
		expect(data.clientId).toBe(EXPRESSION);
		expect(data.clientSecret).toBe('stored-secret');
		expect(data).not.toHaveProperty('oauthTokenData');
	});

	it('leaves a credential owned outside the import unchanged', async () => {
		const otherProject = await createTeamProject('Other', owner);
		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub' }), {
			project: otherProject,
		});
		await shareCredentialWithProjects(credential, [project]);

		const result = await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'overwrite',
			packageBuffer: await workflowPackage(credential, {
				name: 'Renamed',
				data: { accessToken: EXPRESSION },
			}),
		});

		expect(result.credentials.updated).toEqual([]);
		expect(result.credentials.matched).toEqual([credential.id]);
		const stored = await storedCredential(credential.id);
		expect(stored.credential.name).toBe('GitHub');
		expect(stored.credential.data).toBe(credential.data);
	});

	it('leaves a global credential owned outside the import unchanged, also for its owner', async () => {
		const credential = await saveCredential(
			githubCredentialPayload({ name: 'Global GitHub', isGlobal: true }),
			{ user: owner, role: 'credential:owner' },
		);

		const result = await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'overwrite',
			packageBuffer: await workflowPackage(credential, {
				name: 'Renamed',
				data: { accessToken: EXPRESSION },
			}),
		});

		expect(result.credentials.updated).toEqual([]);
		const stored = await storedCredential(credential.id);
		expect(stored.credential.name).toBe('Global GitHub');
		expect(stored.credential.data).toBe(credential.data);
	});

	it.each([
		['managed', { isManaged: true }],
		['resolvable', { isResolvable: true }],
	])('leaves a %s credential unchanged', async (_label, flags) => {
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'GitHub', ...flags }),
			{ project },
		);

		const result = await importPackage({
			user: owner,
			projectId: project.id,
			credentialConflictPolicy: 'overwrite',
			packageBuffer: await workflowPackage(credential, {
				name: 'Renamed',
				data: { accessToken: EXPRESSION },
			}),
		});

		expect(result.credentials.updated).toEqual([]);
		const stored = await storedCredential(credential.id);
		expect(stored.credential.name).toBe('GitHub');
		expect(stored.credential.data).toBe(credential.data);
	});

	it('writes a credential used in two projects of a project package once', async () => {
		const secondProject = await createTeamProject('Second', owner);
		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub' }), {
			project,
		});
		await shareCredentialWithProjects(credential, [secondProject]);
		const update = vi.spyOn(Container.get(CredentialsService), 'update');

		const result = await importPackage({
			user: owner,
			credentialConflictPolicy: 'overwrite',
			packageBuffer: await twoProjectPackage([project, secondProject], credential, {
				name: 'Renamed',
				data: { accessToken: EXPRESSION },
			}),
		});

		expect(result.credentials).toEqual({
			matched: [],
			stubbed: [],
			seeded: [],
			incomplete: [],
			updated: [credential.id],
		});
		expect(update).toHaveBeenCalledTimes(1);
		const stored = await storedCredential(credential.id);
		expect(stored.credential.name).toBe('Renamed');
		expect(stored.data.accessToken).toBe(EXPRESSION);
		update.mockRestore();
	});

	it('lists as updated two credentials of different projects that bind to one destination', async () => {
		const secondProject = await createTeamProject('Second', owner);
		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub' }), {
			project,
		});
		await shareCredentialWithProjects(credential, [secondProject]);
		const update = vi.spyOn(Container.get(CredentialsService), 'update');
		const sourceIds = ['source-a', 'source-b'];
		const workflows = sourceIds.map((sourceId, index) =>
			serializedWorkflowWithCredential({
				id: `wf-${index}`,
				name: `Uses ${sourceId}`,
				credentialId: sourceId,
				credentialName: 'GitHub',
			}),
		);

		const result = await importPackage({
			user: owner,
			credentialConflictPolicy: 'overwrite',
			bindings: {
				credentials: new Map(sourceIds.map((sourceId) => [sourceId, credential.id])),
			},
			packageBuffer: await buildEntityPackageBuffer({
				projects: [project, secondProject].map((target, index) => ({
					target: `projects/p${index}`,
					project: serializedProject({ id: target.id, name: target.name }),
				})),
				workflows: workflows.map((workflow, index) => ({
					target: `projects/p${index}/workflows/wf`,
					workflow,
				})),
				credentials: sourceIds.map((sourceId, index) => ({
					target: `projects/p${index}/credentials/github`,
					credential: serializedCredential({
						id: sourceId,
						name: 'GitHub',
						data: { accessToken: EXPRESSION },
					}),
				})),
				manifestExtras: {
					requirements: { credentials: credentialRequirementsFromWorkflows(workflows) },
				},
			}),
		});

		expect(result.credentials).toEqual({
			matched: [],
			stubbed: [],
			seeded: [],
			incomplete: [],
			updated: sourceIds,
		});
		expect(update).toHaveBeenCalledTimes(1);
		const stored = await storedCredential(credential.id);
		expect(stored.data.accessToken).toBe(EXPRESSION);
		update.mockRestore();
	});

	describe('API key scopes', () => {
		let credential: CredentialsEntity;

		beforeEach(async () => {
			credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub' }), {
				project,
			});
		});

		it('blocks an API key without credential:update, and writes nothing', async () => {
			await expect(
				importPackage({
					user: owner,
					projectId: project.id,
					apiKeyScopes: ['workflow:import'],
					credentialConflictPolicy: 'overwrite',
					packageBuffer: await workflowPackage(credential, { name: 'Renamed' }),
				}),
			).rejects.toBeInstanceOf(ForbiddenError);
			await expectNothingWritten(credential);
		});

		it('updates with an API key that has credential:update', async () => {
			const result = await importPackage({
				user: owner,
				projectId: project.id,
				apiKeyScopes: ['workflow:import', 'credential:update'],
				credentialConflictPolicy: 'overwrite',
				packageBuffer: await workflowPackage(credential, { name: 'Renamed' }),
			});

			expect(result.credentials.updated).toEqual([credential.id]);
		});

		it('requires no credential:update under fail', async () => {
			const result = await importPackage({
				user: owner,
				projectId: project.id,
				apiKeyScopes: ['workflow:import'],
				credentialConflictPolicy: 'fail',
				packageBuffer: await workflowPackage(credential, { name: credential.name }),
			});

			expect(result.credentials.updated).toEqual([]);
		});
	});

	it('blocks before any write when the prepared update is not valid', async () => {
		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub' }), {
			project,
		});

		// A credential name needs at least 3 characters. The package schema does not check that.
		await expect(
			importPackage({
				user: owner,
				projectId: project.id,
				credentialConflictPolicy: 'overwrite',
				packageBuffer: await workflowPackage(credential, { name: 'ab' }),
			}),
		).rejects.toBeInstanceOf(BadRequestError);
		await expectNothingWritten(credential);
	});

	it('blocks and keeps the stored data when n8n cannot read it', async () => {
		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub' }), {
			project,
		});
		await Container.get(CredentialsRepository).update(credential.id, { data: 'unreadable' });

		await expect(
			importPackage({
				user: owner,
				projectId: project.id,
				credentialConflictPolicy: 'overwrite',
				packageBuffer: await workflowPackage(credential, {
					name: 'GitHub',
					data: { accessToken: EXPRESSION },
				}),
			}),
		).rejects.toBeInstanceOf(UnprocessableRequestError);
		await expectNothingWritten({ ...credential, data: 'unreadable' } as CredentialsEntity);
	});
});
