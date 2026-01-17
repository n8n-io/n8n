import { ALL_ROLES } from '@n8n/permissions';
import type { Role, Scope } from '@n8n/permissions';

import { createMember } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';
import { Container } from '@n8n/di';
import { SecuritySettingsService } from '@/services/security-settings.service';
import { PROJECT_SCOPE_MAP } from '@n8n/permissions';

const testServer = utils.setupTestServer({
	endpointGroups: ['role'],
});

let memberAgent: SuperAgentTest;

const expectedCategories = ['global', 'project', 'credential', 'workflow'] as const;
let expectedGlobalRoles: Role[];
let expectedCredentialRoles: Role[];
let expectedWorkflowRoles: Role[];

function checkForRole(role: Role, roles: Role[]) {
	const returnedRole = roles.find((r) => r.slug === role.slug);
	expect(returnedRole).toBeDefined();
	role.scopes.sort();
	returnedRole!.scopes.sort();
	returnedRole!.licensed = role.licensed;
	expect(returnedRole).toEqual({
		...role,
		createdAt: expect.any(String),
		updatedAt: expect.any(String),
	});
}

function checkForScopes(roleSlug: string, scopes: Scope[], response: Role[]) {
	const role = response.find((r) => r.slug === roleSlug);
	expect(role).toBeDefined();
	role!.scopes.sort();
	expect(role!.scopes).toEqual(scopes.sort());
}

beforeAll(async () => {
	memberAgent = testServer.authAgentFor(await createMember());

	expectedGlobalRoles = ALL_ROLES.global;
	expectedCredentialRoles = ALL_ROLES.credential;
	expectedWorkflowRoles = ALL_ROLES.workflow;
});

describe('GET /roles/', () => {
	test('should return all role categories', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);

		const data: Record<string, string[]> = resp.body.data;

		const categories = [...Object.keys(data)];
		expect(categories.length).toBe(expectedCategories.length);
		expect(expectedCategories.every((c) => categories.includes(c))).toBe(true);
	});

	test('should return fixed global roles', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);
		expect(Array.isArray(resp.body.data.global)).toBe(true);
		for (const role of expectedGlobalRoles) {
			checkForRole(role, resp.body.data.global);
		}
	});

	describe('Project roles', () => {
		let securitySettingsService: SecuritySettingsService;

		beforeEach(async () => {
			securitySettingsService = Container.get(SecuritySettingsService);
		});

		test('should when no security settings are set - default to adding workflow:publish scope', async () => {
			const resp = await memberAgent.get('/roles/');
			expect(resp.status).toBe(200);
			checkForScopes(
				'project:personalOwner',
				[...PROJECT_SCOPE_MAP['project:personalOwner'], 'workflow:publish'],
				resp.body.data.project,
			);
		});

		test('should match fixed scopes when security settings are all explicitly disabled', async () => {
			await securitySettingsService.setPersonalSpacePublishing(false);
			const resp = await memberAgent.get('/roles/');

			expect(resp.status).toBe(200);
			for (const role of ALL_ROLES.project) {
				checkForRole(role, resp.body.data.project);
			}
		});

		test('should return the list with project:personalOwner - workflow:publish scope when the personal project publish security setting is explicitly enabled', async () => {
			await securitySettingsService.setPersonalSpacePublishing(true);
			const resp = await memberAgent.get('/roles/');

			expect(resp.status).toBe(200);
			checkForScopes(
				'project:personalOwner',
				[...PROJECT_SCOPE_MAP['project:personalOwner'], 'workflow:publish'],
				resp.body.data.project,
			);
		});
	});

	test('should return fixed credential sharing roles', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);
		for (const role of expectedCredentialRoles) {
			checkForRole(role, resp.body.data.credential);
		}
	});

	test('should return fixed workflow sharing roles', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);
		for (const role of expectedWorkflowRoles) {
			checkForRole(role, resp.body.data.workflow);
		}
	});
});
