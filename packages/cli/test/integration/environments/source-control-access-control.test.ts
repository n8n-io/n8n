// Access-control coverage for Source Control read endpoints. Runs the real auth +
// RBAC stack and scoped-service context resolution; only git-touching methods are stubbed.
import { mockInstance, createTeamProject } from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import { Telemetry } from '@/telemetry';

import { createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

const PRIVATE_CONNECTION_MARKER = 'ghp_private_connection_marker';
const REPO_URL_WITH_PRIVATE_DETAIL = `https://x-access-token:${PRIVATE_CONNECTION_MARKER}@github.com/acme/private-repo.git`;

let owner: User;
let member: User;
let projectAdminMember: User;

let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authProjectAdminAgent: SuperAgentTest;

mockInstance(Telemetry);

const testServer = utils.setupTestServer({
	endpointGroups: ['sourceControl', 'license', 'auth'],
	enabledFeatures: ['feat:sourceControl', 'feat:sharing'],
});

beforeAll(async () => {
	owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	member = await createUser({ role: GLOBAL_MEMBER_ROLE });
	projectAdminMember = await createUser({ role: GLOBAL_MEMBER_ROLE });

	// Project admin gains project-level sourceControl:push — the non-global path into get-status
	await createTeamProject('Access Control Team Project', projectAdminMember);

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	authProjectAdminAgent = testServer.authAgentFor(projectAdminMember);

	const preferences = Container.get(SourceControlPreferencesService);
	await preferences.setPreferences({
		connected: true,
		repositoryUrl: REPO_URL_WITH_PRIVATE_DETAIL,
		branchName: 'main',
		branchColor: '#ff6d5a',
		branchReadOnly: false,
		keyGeneratorType: 'rsa',
	});

	// Stub only the git-touching service methods; authorization runs for real.
	const sourceControlService = Container.get(SourceControlService);
	sourceControlService.getStatus = (async (user, options) => {
		if (options.direction === 'pull' && !hasGlobalScope(user, 'sourceControl:pull')) {
			throw new ForbiddenError('You do not have permission to pull from source control');
		}

		return [];
	}) as SourceControlService['getStatus'];
	sourceControlService.getBranches = (async () => ({
		branches: ['main', 'release'],
		currentBranch: 'main',
	})) as SourceControlService['getBranches'];
	// Allow the real context-based authorization in getRemoteFileEntity to run.
	sourceControlService.sanityCheck = (async () => {}) as SourceControlService['sanityCheck'];
});

describe('Source Control read endpoints — access control', () => {
	describe('GET /source-control/preferences', () => {
		it('does not return privileged connection fields to a member without the manage scope', async () => {
			const res = await authMemberAgent.get('/source-control/preferences').expect(200);

			expect(res.body.data).toEqual({ branchReadOnly: false });
			expect(res.body.data.repositoryUrl).toBeUndefined();
			expect(res.body.data.httpsUsername).toBeUndefined();
			expect(res.body.data.httpsPassword).toBeUndefined();
			expect(JSON.stringify(res.body)).not.toContain(PRIVATE_CONNECTION_MARKER);
		});

		it('does not return privileged connection fields to a project-admin member', async () => {
			const res = await authProjectAdminAgent.get('/source-control/preferences').expect(200);

			expect(res.body.data).toMatchObject({
				connected: true,
				branchName: 'main',
				branchColor: '#ff6d5a',
				branchReadOnly: false,
			});
			expect(res.body.data.repositoryUrl).toBeUndefined();
			expect(res.body.data.httpsUsername).toBeUndefined();
			expect(res.body.data.httpsPassword).toBeUndefined();
			expect(JSON.stringify(res.body)).not.toContain(PRIVATE_CONNECTION_MARKER);
		});

		it('still returns safe branch metadata to a project-admin member', async () => {
			const res = await authProjectAdminAgent.get('/source-control/preferences').expect(200);

			expect(res.body.data).toHaveProperty('branchName', 'main');
			expect(res.body.data).toHaveProperty('branchColor', '#ff6d5a');
			expect(res.body.data).toHaveProperty('connected', true);
		});

		it('returns the full repository URL to a manager', async () => {
			const res = await authOwnerAgent.get('/source-control/preferences').expect(200);

			expect(res.body.data.repositoryUrl).toBe(REPO_URL_WITH_PRIVATE_DETAIL);
		});
	});

	describe('GET /source-control/get-branches', () => {
		it('is forbidden for a member without the manage scope', async () => {
			await authMemberAgent.get('/source-control/get-branches').expect(403);
		});

		it('is forbidden for a project-admin member without the manage scope', async () => {
			await authProjectAdminAgent.get('/source-control/get-branches').expect(403);
		});

		it('is allowed for a manager', async () => {
			const res = await authOwnerAgent.get('/source-control/get-branches').expect(200);
			expect(res.body.data.branches).toContain('main');
		});
	});

	describe('GET /source-control/get-status', () => {
		const queryCombinations = [
			{ direction: 'push', preferLocalVersion: 'true', verbose: 'true' },
			{ direction: 'push', preferLocalVersion: 'true', verbose: 'false' },
			{ direction: 'pull', preferLocalVersion: 'true', verbose: 'true' },
		];

		it.each(queryCombinations)(
			'is forbidden for a member without source control access (%o)',
			async (query) => {
				await authMemberAgent.get('/source-control/get-status').query(query).expect(403);
			},
		);

		it('is allowed for a project-admin member (project-level push)', async () => {
			await authProjectAdminAgent
				.get('/source-control/get-status')
				.query({ direction: 'push', preferLocalVersion: 'true', verbose: 'false' })
				.expect(200);
		});

		it('is forbidden for a project-admin member requesting pull status', async () => {
			await authProjectAdminAgent
				.get('/source-control/get-status')
				.query({ direction: 'pull', preferLocalVersion: 'true', verbose: 'false' })
				.expect(403);
		});

		it('is allowed for a manager', async () => {
			await authOwnerAgent
				.get('/source-control/get-status')
				.query({ direction: 'push', preferLocalVersion: 'true', verbose: 'false' })
				.expect(200);
		});
	});

	describe('GET /source-control/status', () => {
		it('is forbidden for a member without source control access', async () => {
			await authMemberAgent.get('/source-control/status').expect(403);
		});

		it('is allowed for a manager', async () => {
			await authOwnerAgent.get('/source-control/status').expect(200);
		});
	});

	describe('GET /source-control/remote-content/:type/:id', () => {
		it('is forbidden for a member without access to the requested workflow', async () => {
			await authMemberAgent
				.get('/source-control/remote-content/workflow/some-foreign-workflow-id')
				.expect(403);
		});
	});
});
