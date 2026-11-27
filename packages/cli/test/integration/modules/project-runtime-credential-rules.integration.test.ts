/**
 * REST contract of GET /rest/projects/:projectId/runtime-credential-rules, and `ruleAlias` on
 * the credentials list and get responses.
 */

import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { RuntimeCredentialStubSeeder } from '@/modules/runtime-credentials/runtime-credential-stub.seeder';
import { runtimeStubId } from '@/modules/runtime-credentials/runtime-credentials.service';

import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS = 'true';
process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES = JSON.stringify({
	env_token: {
		nodeType: '*',
		path: 'headers.x-env',
		credentialType: 'httpHeaderAuth',
		transform: 'field:value',
	},
});

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: [
		'feat:sharing',
		'feat:projectRole:admin',
		LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES,
	],
	modules: ['runtime-credentials', 'type-availability-policies'],
});

const projectRules = (projectId: string) => `/projects/${projectId}/runtime-credential-rules`;
const projectPolicy = (projectId: string) =>
	`/projects/${projectId}/request-fed-credential-type-policies/project`;

describe('project runtime credential rules REST', () => {
	let owner: User;
	let projectAdmin: User;
	let projectEditor: User;
	let project: Project;
	let ownerAgent: SuperAgentTest;
	let adminAgent: SuperAgentTest;
	let editorAgent: SuperAgentTest;
	let outsiderAgent: SuperAgentTest;

	beforeAll(async () => {
		await utils.initCredentialsTypes();
		// The server seeds before the credential types load, and the seeder skips unknown types.
		await Container.get(RuntimeCredentialStubSeeder).seed();

		owner = await createOwner();
		projectAdmin = await createMember();
		projectEditor = await createMember();
		project = await createTeamProject('rules project', projectAdmin);
		await linkUserToProject(projectEditor, project, 'project:editor');

		ownerAgent = testServer.authAgentFor(owner);
		adminAgent = testServer.authAgentFor(projectAdmin);
		editorAgent = testServer.authAgentFor(projectEditor);
		outsiderAgent = testServer.authAgentFor(await createMember());
	});

	afterAll(() => {
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
		delete process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES;
	});

	afterEach(async () => {
		await testDb.truncate([
			'TypeAvailabilityPolicyAttachment',
			'TypeAvailabilityPolicyScope',
			'TypeAvailabilityPolicy',
		]);
	});

	it('answers 401 without a session', async () => {
		await testServer.authlessAgent.get(projectRules(project.id)).expect(401);
	});

	it('lets a project admin who is not a global admin read the rules', async () => {
		const { body } = await adminAgent.get(projectRules(project.id)).expect(200);

		expect(body.data.rules).toEqual([
			{
				alias: 'env_token',
				path: 'headers.x-env',
				credentialType: 'httpHeaderAuth',
				access: 'allowed',
				blockedBy: null,
			},
		]);
	});

	it('lets an instance owner read the rules', async () => {
		await ownerAgent.get(projectRules(project.id)).expect(200);
	});

	it('refuses a project editor and a user outside the project', async () => {
		await editorAgent.get(projectRules(project.id)).expect(403);
		await outsiderAgent.get(projectRules(project.id)).expect(403);
	});

	it('refuses the admin of another project', async () => {
		const other = await createTeamProject('admin of another project', projectEditor);

		await testServer.authAgentFor(projectEditor).get(projectRules(other.id)).expect(200);
		await testServer.authAgentFor(projectEditor).get(projectRules(project.id)).expect(403);
	});

	it('refuses the read when the license feature is off', async () => {
		testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
		try {
			await ownerAgent.get(projectRules(project.id)).expect(403);
		} finally {
			testServer.license.enable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
		}
	});

	it('answers 404 for an unknown project', async () => {
		await ownerAgent.get(projectRules('does-not-exist')).expect(404);
	});

	it('reflects a project policy that blocks the credential type', async () => {
		await adminAgent
			.put(projectPolicy(project.id))
			.send({
				rules: [{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'httpHeaderAuth' } }],
				defaultAction: 'allow',
				version: 0,
			})
			.expect(200);

		const { body } = await adminAgent.get(projectRules(project.id)).expect(200);

		expect(body.data.rules[0]).toMatchObject({ access: 'blocked', blockedBy: 'project' });

		const other = await createTeamProject('other rules project', projectAdmin);
		const { body: otherBody } = await adminAgent.get(projectRules(other.id)).expect(200);
		expect(otherBody.data.rules[0]).toMatchObject({ access: 'allowed', blockedBy: null });
	});

	it('adds ruleAlias to a stub on the credentials list and get responses', async () => {
		const { body: list } = await ownerAgent.get('/credentials').expect(200);
		const stub = list.data.find((c: { id: string }) => c.id === runtimeStubId('env_token'));
		expect(stub).toMatchObject({ isRuntime: true, ruleAlias: 'env_token' });

		const { body: one } = await ownerAgent
			.get(`/credentials/${runtimeStubId('env_token')}`)
			.expect(200);
		expect(one.data).toMatchObject({ isRuntime: true, ruleAlias: 'env_token' });
	});
});
