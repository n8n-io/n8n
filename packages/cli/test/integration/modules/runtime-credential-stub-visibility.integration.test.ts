/**
 * A run-time credential stub is a global credential row with `isRuntime = true` and no
 * `SharedCredentials` owner row. This test calls the code paths that may assume an owner and
 * pins what each one does today: works, throws, or hides the stub.
 */

import { testDb, createTeamProject, linkUserToProject } from '@n8n/backend-test-utils';
import { createWorkflow } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { CredentialsRepository, ProjectRepository, SharedCredentialsRepository } from '@n8n/db';
import { CredentialsFinderService } from '@n8n/backend-services';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks/credentials-permission-checker';
import { RuntimeCredentialStubSeeder } from '@/modules/runtime-credentials/runtime-credential-stub.seeder';
import { runtimeStubId } from '@/modules/runtime-credentials/runtime-credentials.service';

import { createMember, createOwner, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

const RULES = {
	bearerToken: {
		nodeType: '*',
		path: 'headers.authorization',
		credentialType: 'httpHeaderAuth',
		transform: 'field:value',
	},
};
const STUB_ID = runtimeStubId('bearerToken');

process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS = 'true';
process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES = JSON.stringify(RULES);

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials', 'publicApi'],
	enabledFeatures: ['feat:sharing', 'feat:projectRole:admin'],
	modules: ['runtime-credentials'],
});

describe('run-time credential stub: visibility and mutation', () => {
	let owner: User;
	let teamMember: User;
	let outsider: User;
	let teamProject: Project;
	let otherTeamProject: Project;

	let ownerAgent: SuperAgentTest;
	let teamMemberAgent: SuperAgentTest;
	let outsiderAgent: SuperAgentTest;

	let credentialsService: CredentialsService;
	let sharedCredentialsRepository: SharedCredentialsRepository;
	let credentialsFinder: CredentialsFinderService;

	const stubNode = {
		id: 'n1',
		name: 'HTTP',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { httpHeaderAuth: { id: STUB_ID, name: 'Request value: bearerToken' } },
	} as unknown as INode;

	beforeAll(async () => {
		await utils.initCredentialsTypes();
		// The server seeds before the credential types load, and the seeder skips unknown types.
		await Container.get(RuntimeCredentialStubSeeder).seed();

		owner = await createOwner();
		teamMember = await createMember();
		outsider = await createMember();

		teamProject = await createTeamProject('stub team', owner);
		await linkUserToProject(teamMember, teamProject, 'project:editor');
		otherTeamProject = await createTeamProject('stub other team', owner);

		ownerAgent = testServer.authAgentFor(owner);
		teamMemberAgent = testServer.authAgentFor(teamMember);
		outsiderAgent = testServer.authAgentFor(outsider);

		credentialsService = Container.get(CredentialsService);
		sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
		credentialsFinder = Container.get(CredentialsFinderService);
	});

	afterAll(async () => {
		await testDb.truncate(['SharedWorkflow', 'WorkflowEntity']);
	});

	it('has the stub in the shape the seeder promises', async () => {
		const stub = await Container.get(CredentialsRepository).findOneByOrFail({ id: STUB_ID });

		expect(stub).toMatchObject({ isRuntime: true, isGlobal: true, usageScope: 'project' });
		await expect(sharedCredentialsRepository.countBy({ credentialsId: STUB_ID })).resolves.toBe(0);
	});

	describe('service reads', () => {
		it('getMany with includeGlobal lists the stub for every user, with scopes', async () => {
			for (const user of [owner, teamMember, outsider]) {
				const list = await credentialsService.getMany(user, {
					includeGlobal: true,
					includeScopes: true,
				});
				const stub = list.find((c) => c.id === STUB_ID);

				expect(stub).toBeDefined();
				// The default list select carries `isRuntime`, so the editor can label a stub.
				expect((stub as { isRuntime?: boolean }).isRuntime).toBe(true);
				expect(stub).toMatchObject({ isGlobal: true });
			}
		});

		it('getMany without includeGlobal hides the stub from every user but the owner', async () => {
			const idsFor = async (user: User) =>
				(await credentialsService.getMany(user)).map((c) => c.id);

			expect(await idsFor(teamMember)).not.toContain(STUB_ID);
			expect(await idsFor(outsider)).not.toContain(STUB_ID);
			// The owner has global `credential:list`, so the unfiltered query returns every row.
			expect(await idsFor(owner)).toContain(STUB_ID);
		});

		it('maps the stub to no home project and no shares', async () => {
			const list = await credentialsService.getMany(owner, { includeGlobal: true });
			const stub = list.find((c) => c.id === STUB_ID) as unknown as Record<string, unknown>;

			expect(stub.homeProject ?? null).toBeNull();
			expect(stub.sharedWithProjects ?? []).toEqual([]);
		});

		it('getCredentialScopes returns the global scopes for the owner and none for others', async () => {
			const ownerScopes = await credentialsService.getCredentialScopes(owner, STUB_ID);
			const memberScopes = await credentialsService.getCredentialScopes(teamMember, STUB_ID);
			const outsiderScopes = await credentialsService.getCredentialScopes(outsider, STUB_ID);

			expect(ownerScopes).toEqual(expect.arrayContaining(['credential:read', 'credential:update']));
			expect(memberScopes).toEqual([]);
			expect(outsiderScopes).toEqual([]);
		});

		it('findCredentialOwningProject returns null', async () => {
			await expect(
				sharedCredentialsRepository.findCredentialOwningProject(STUB_ID),
			).resolves.toBeFalsy();
		});

		it('the finder returns the stub as a global credential and for read-only lookups', async () => {
			await expect(credentialsFinder.findGlobalCredentialById(STUB_ID)).resolves.toMatchObject({
				id: STUB_ID,
			});
			const forMember = await credentialsFinder.findCredentialForUser(STUB_ID, teamMember, [
				'credential:read',
			]);
			expect(forMember?.id).toBe(STUB_ID);

			const forMemberUpdate = await credentialsFinder.findCredentialForUser(STUB_ID, teamMember, [
				'credential:update',
			]);
			expect(forMemberUpdate).toBeNull();
		});

		it('findAllCredentialsForUser drops the stub even with includeGlobalCredentials', async () => {
			const found = await credentialsFinder.findAllCredentialsForUser(
				teamMember,
				['credential:read'],
				{},
				{ includeGlobalCredentials: true },
			);

			expect(found.map((c) => c.id)).not.toContain(STUB_ID);
		});

		it('findCredentialsForUser includes the stub for read-only scopes', async () => {
			const found = await credentialsFinder.findCredentialsForUser(outsider, ['credential:read']);

			expect(found.map((c) => c.id)).toContain(STUB_ID);
		});
	});

	describe('REST reads', () => {
		it('GET /credentials?includeGlobal=true returns the stub to a member and an outsider', async () => {
			for (const agent of [ownerAgent, teamMemberAgent, outsiderAgent]) {
				const response = await agent
					.get('/credentials')
					.query({ includeGlobal: true, includeScopes: true })
					.expect(200);

				const stub = response.body.data.find((c: { id: string }) => c.id === STUB_ID);
				expect(stub).toMatchObject({ homeProject: null, sharedWithProjects: [] });
				expect(stub).toBeDefined();
			}
		});

		it('GET /credentials/:id returns the stub to the owner only; a member and an outsider get 404', async () => {
			const asOwner = await ownerAgent.get(`/credentials/${STUB_ID}`).expect(200);
			expect(asOwner.body.data).toMatchObject({ id: STUB_ID, isRuntime: true, homeProject: null });

			await teamMemberAgent.get(`/credentials/${STUB_ID}`).expect(404);
			await outsiderAgent.get(`/credentials/${STUB_ID}`).expect(404);
		});

		it('GET /credentials/for-workflow returns the stub for a team member and for an outsider in the own personal project', async () => {
			const outsiderProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(outsider.id);
			const idsOf = (body: { data: Array<{ id: string }> }) => body.data.map((c) => c.id);

			const asMember = await teamMemberAgent
				.get('/credentials/for-workflow')
				.query({ projectId: teamProject.id })
				.expect(200);
			const asOutsider = await outsiderAgent
				.get('/credentials/for-workflow')
				.query({ projectId: outsiderProject.id })
				.expect(200);

			expect(idsOf(asMember.body)).toContain(STUB_ID);
			expect(idsOf(asOutsider.body)).toContain(STUB_ID);
		});
	});

	describe('workflow lookups', () => {
		it('CredentialsPermissionChecker accepts the stub for a workflow in a team project', async () => {
			const workflow = await createWorkflow({ nodes: [stubNode] }, teamProject);

			await expect(
				Container.get(CredentialsPermissionChecker).check(workflow.id, [stubNode], teamMember.id),
			).resolves.toBeDefined();
			await expect(
				Container.get(CredentialsPermissionChecker).check(workflow.id, [stubNode], outsider.id),
			).resolves.toBeDefined();
		});

		it('CredentialsPermissionChecker.checkForUser accepts the stub for every user', async () => {
			for (const user of [owner, teamMember, outsider]) {
				await expect(
					Container.get(CredentialsPermissionChecker).checkForUser(user.id, [stubNode]),
				).resolves.toBeUndefined();
			}
		});
	});

	describe('mutation by users', () => {
		// The owner has `credential:update`, `credential:delete` and `credential:move` in the list
		// scopes, but the finder needs an owner row for these scopes. No call reaches the
		// `isRuntime` guard, so every edit, delete, and move answers "not found".
		it('PATCH answers 404 for the owner and a member and keeps the stub unchanged', async () => {
			await ownerAgent
				.patch(`/credentials/${STUB_ID}`)
				.send({ name: 'renamed by owner' })
				.expect(404);
			await teamMemberAgent
				.patch(`/credentials/${STUB_ID}`)
				.send({ name: 'renamed by member' })
				.expect(404);

			const stub = await Container.get(CredentialsRepository).findOneByOrFail({ id: STUB_ID });
			expect(stub.name).toBe('Request value: bearerToken');
		});

		it('DELETE answers 404 for the owner and a member and keeps the row', async () => {
			await ownerAgent.delete(`/credentials/${STUB_ID}`).expect(404);
			await teamMemberAgent.delete(`/credentials/${STUB_ID}`).expect(404);

			await expect(Container.get(CredentialsRepository).countBy({ id: STUB_ID })).resolves.toBe(1);
		});

		it('PUT share is the one call that reaches the guard: 400 with the locked message', async () => {
			const response = await ownerAgent
				.put(`/credentials/${STUB_ID}/share`)
				.send({ shareWithIds: [teamProject.id] })
				.expect(400);

			expect(response.body.message).toContain('run-time input rules');
			await expect(sharedCredentialsRepository.countBy({ credentialsId: STUB_ID })).resolves.toBe(
				0,
			);
		});

		it('PUT transfer and the transfer preview answer 404 for the owner', async () => {
			await ownerAgent
				.put(`/credentials/${STUB_ID}/transfer`)
				.send({ destinationProjectId: otherTeamProject.id })
				.expect(404);
			await ownerAgent
				.get(`/credentials/${STUB_ID}/transfer-preview`)
				.query({ destinationProjectId: otherTeamProject.id })
				.expect(404);

			await expect(sharedCredentialsRepository.countBy({ credentialsId: STUB_ID })).resolves.toBe(
				0,
			);
		});

		it('the service-level transfer throws and adds no owner row', async () => {
			await expect(
				Container.get(EnterpriseCredentialsService).transferOne(
					owner,
					STUB_ID,
					otherTeamProject.id,
				),
			).rejects.toThrow();
			await expect(sharedCredentialsRepository.countBy({ credentialsId: STUB_ID })).resolves.toBe(
				0,
			);
		});

		it('the project transfer-all path does not touch the stub', async () => {
			const personal = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
				owner.id,
			);

			await credentialsService.transferAll(personal.id, teamProject.id);

			await expect(sharedCredentialsRepository.countBy({ credentialsId: STUB_ID })).resolves.toBe(
				0,
			);
		});
	});

	describe('public API', () => {
		it('GET /credentials lists the stub for an owner with an empty shared list', async () => {
			const apiOwner = await createOwnerWithApiKey();
			const response = await testServer.publicApiAgentFor(apiOwner).get('/credentials').expect(200);

			const stub = response.body.data.find((c: { id: string }) => c.id === STUB_ID);
			expect(stub).toMatchObject({ id: STUB_ID, shared: [] });
		});

		it('DELETE and transfer answer 404 and keep the row', async () => {
			const apiOwner = await createOwnerWithApiKey();
			const agent = testServer.publicApiAgentFor(apiOwner);

			await agent.delete(`/credentials/${STUB_ID}`).expect(404);
			await agent
				.put(`/credentials/${STUB_ID}/transfer`)
				.send({ destinationProjectId: otherTeamProject.id })
				.expect(404);

			await expect(Container.get(CredentialsRepository).countBy({ id: STUB_ID })).resolves.toBe(1);
			await expect(sharedCredentialsRepository.countBy({ credentialsId: STUB_ID })).resolves.toBe(
				0,
			);
		});
	});

	describe('source control export', () => {
		it('does not list the stub among exportable owner sharings', async () => {
			const sharings = await sharedCredentialsRepository.findByCredentialIds(
				[STUB_ID],
				'credential:owner',
			);

			expect(sharings).toEqual([]);
			await expect(
				sharedCredentialsRepository.findOwnerProjectsByCredentialIds([STUB_ID]),
			).resolves.toBeDefined();
		});
	});
});
