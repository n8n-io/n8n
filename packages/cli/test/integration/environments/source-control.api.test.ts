import type { SourceControlledFile } from '@n8n/api-types';
import { createTeamProject, mockInstance } from '@n8n/backend-test-utils';
import { GLOBAL_ADMIN_ROLE, GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlStatusService } from '@/modules/source-control.ee/source-control-status.service.ee';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import { Telemetry } from '@/telemetry';

import { createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

let authOwnerAgent: SuperAgentTest;
let authAdminAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authProjectAdminAgent: SuperAgentTest;
let owner: User;
let admin: User;
let member: User;
let projectAdmin: User;

mockInstance(Telemetry);

const testServer = utils.setupTestServer({
	endpointGroups: ['sourceControl', 'license', 'auth'],
	enabledFeatures: ['feat:sourceControl', 'feat:sharing'],
});

let sourceControlPreferencesService: SourceControlPreferencesService;

describe('Source Control API', () => {
	beforeAll(async () => {
		[owner, admin, member, projectAdmin] = await Promise.all([
			createUser({ role: GLOBAL_OWNER_ROLE }),
			createUser({ role: GLOBAL_ADMIN_ROLE }),
			createUser({ role: GLOBAL_MEMBER_ROLE }),
			createUser({ role: GLOBAL_MEMBER_ROLE }),
		]);

		await createTeamProject('Source Control API Test Project', projectAdmin);

		authOwnerAgent = testServer.authAgentFor(owner);
		authAdminAgent = testServer.authAgentFor(admin);
		authMemberAgent = testServer.authAgentFor(member);
		authProjectAdminAgent = testServer.authAgentFor(projectAdmin);

		sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
		await sourceControlPreferencesService.setPreferences({
			connected: true,
			repositoryUrl: 'git@github.com:n8n-io/source-control-test.git',
			branchName: 'main',
			branchColor: '#ff6d5a',
			branchReadOnly: false,
			keyGeneratorType: 'rsa',
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('GET /source-control/preferences', () => {
		test.each([
			['owner', () => authOwnerAgent],
			['admin', () => authAdminAgent],
		])('should return full Source Control preferences to global %s', async (_role, getAgent) => {
			const res = await getAgent().get('/source-control/preferences').expect(200);
			const data = res.body.data ?? res.body;

			expect(data).toMatchObject({
				repositoryUrl: 'git@github.com:n8n-io/source-control-test.git',
				branchName: 'main',
				branchColor: '#ff6d5a',
				branchReadOnly: false,
				connected: true,
			});
			expect(data.publicKey).toEqual(expect.stringMatching(/^ssh-/));
		});

		test('should return only branch read-only state to members without source-control access', async () => {
			const res = await authMemberAgent.get('/source-control/preferences').expect(200);
			const data = res.body.data ?? res.body;

			expect(data).toEqual({ branchReadOnly: false });
		});

		test('should return safe branch metadata to project admins', async () => {
			const res = await authProjectAdminAgent.get('/source-control/preferences').expect(200);
			const data = res.body.data ?? res.body;

			expect(data).toEqual({
				connected: true,
				branchName: 'main',
				branchColor: '#ff6d5a',
				branchReadOnly: false,
			});
			expect(data.repositoryUrl).toBeUndefined();
			expect(data.publicKey).toBeUndefined();
		});
	});

	describe('POST /source-control/preferences', () => {
		test('should reject members', async () => {
			await authMemberAgent
				.post('/source-control/preferences')
				.send({ repositoryUrl: 'git@github.com:n8n-io/test.git' })
				.expect(403);
		});
	});

	describe('PATCH /source-control/preferences', () => {
		test('should reject members', async () => {
			await authMemberAgent
				.patch('/source-control/preferences')
				.send({ branchReadOnly: true })
				.expect(403);
		});
	});

	describe('POST /source-control/disconnect', () => {
		test('should reject members', async () => {
			await authMemberAgent
				.post('/source-control/disconnect')
				.send({ keepKeyPair: true })
				.expect(403);
		});
	});

	describe('GET /source-control/get-branches', () => {
		test('should reject members', async () => {
			await authMemberAgent.get('/source-control/get-branches').expect(403);
		});
	});

	describe('GET /source-control/reset-workfolder', () => {
		test('should reject members', async () => {
			await authMemberAgent.get('/source-control/reset-workfolder').expect(403);
		});
	});

	describe('POST /source-control/generate-key-pair', () => {
		test('should return new rsa key', async () => {
			const res = await authOwnerAgent.post('/source-control/generate-key-pair').send().expect(200);

			expect(res.body.data).toHaveProperty('publicKey');
			expect(res.body.data).toHaveProperty('keyGeneratorType');
			expect(res.body.data.keyGeneratorType).toBe('rsa');
			expect(res.body.data.publicKey).toContain('ssh-rsa');
		});

		test('should reject members', async () => {
			await authMemberAgent
				.post('/source-control/generate-key-pair')
				.send({ keyGeneratorType: 'rsa' })
				.expect(403);
		});
	});

	describe('POST /source-control/pull-workfolder', () => {
		test.each([
			['member', () => authMemberAgent],
			['project admin', () => authProjectAdminAgent],
		])('should reject %s', async (_role, getAgent) => {
			await getAgent().post('/source-control/pull-workfolder').send({ force: true }).expect(403);
		});

		test.each([
			['owner', () => authOwnerAgent],
			['admin', () => authAdminAgent],
		])('should allow global %s', async (_role, getAgent) => {
			const statusResult: SourceControlledFile[] = [
				{
					id: 'workflow-1',
					name: 'Workflow 1',
					type: 'workflow',
					status: 'modified',
					location: 'local',
					conflict: false,
					file: '/Users/michael/.n8n/git/workflows/workflow-1.json',
					updatedAt: '2023-07-14T11:24:41.000Z',
				},
			];
			const pullWorkfolderSpy = vi
				.spyOn(Container.get(SourceControlService), 'pullWorkfolder')
				.mockResolvedValue({ statusCode: 200, statusResult });

			const res = await getAgent()
				.post('/source-control/pull-workfolder')
				.send({ force: true })
				.expect(200);
			const data = res.body.data ?? res.body;

			expect(data).toEqual(statusResult);
			expect(pullWorkfolderSpy).toHaveBeenCalled();
		});
	});

	describe('GET /source-control/get-status', () => {
		test('should return repo sync status', async () => {
			vi.spyOn(Container.get(SourceControlService), 'getStatus').mockResolvedValue([
				{
					id: 'haQetoXq9GxHSkft',
					name: 'My workflow 6 edit',
					type: 'workflow',
					status: 'modified',
					location: 'local',
					conflict: true,
					file: '/Users/michael/.n8n/git/workflows/haQetoXq9GxHSkft.json',
					updatedAt: '2023-07-14T11:24:41.000Z',
				},
			] as SourceControlledFile[]);

			await authOwnerAgent
				.get('/source-control/get-status')
				.query({ direction: 'push', preferLocalVersion: 'true', verbose: 'false' })
				.expect(200)
				.expect((res) => {
					const data: SourceControlledFile[] = res.body.data;
					expect(data.length).toBe(1);
					expect(data[0].id).toBe('haQetoXq9GxHSkft');
				});
		});

		describe('access control', () => {
			beforeEach(() => {
				vi.spyOn(Container.get(SourceControlService), 'sanityCheck').mockResolvedValue();
			});

			test.each([
				['member', () => authMemberAgent],
				['project admin', () => authProjectAdminAgent],
			])('should reject pull status for %s', async (_role, getAgent) => {
				await getAgent()
					.get('/source-control/get-status')
					.query({ direction: 'pull', preferLocalVersion: 'false', verbose: 'false' })
					.expect(403);
			});

			test('should reject push status for members without source-control access', async () => {
				await authMemberAgent
					.get('/source-control/get-status')
					.query({ direction: 'push', preferLocalVersion: 'true', verbose: 'false' })
					.expect(403);
			});

			test('should allow push status for project admins', async () => {
				const statusResult: SourceControlledFile[] = [
					{
						id: 'workflow-1',
						name: 'Workflow 1',
						type: 'workflow',
						status: 'modified',
						location: 'local',
						conflict: false,
						file: '/Users/michael/.n8n/git/workflows/workflow-1.json',
						updatedAt: '2023-07-14T11:24:41.000Z',
					},
				];
				const getStatusSpy = vi
					.spyOn(Container.get(SourceControlStatusService), 'getStatus')
					.mockResolvedValue(statusResult);

				await authProjectAdminAgent
					.get('/source-control/get-status')
					.query({ direction: 'push', preferLocalVersion: 'true', verbose: 'false' })
					.expect(200)
					.expect((res) => {
						expect(res.body.data).toEqual(statusResult);
					});
				expect(getStatusSpy).toHaveBeenCalledWith(
					expect.objectContaining({ id: projectAdmin.id }),
					expect.objectContaining({
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					}),
				);
			});
		});
	});
});
