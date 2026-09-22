import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import { CREDENTIAL_TYPES_KIND } from '@/modules/type-availability-policies/constants';
import { TypeAvailabilityPolicyService } from '@/modules/type-availability-policies/type-availability-policy.service';
import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

let owner: User;
let projectAdmin: User;
let projectEditor: User;
let project: Project;

const projectRoute = (projectId: string) =>
	`/projects/${projectId}/credential-type-policies/project`;

beforeAll(async () => {
	owner = await createOwner();
	projectAdmin = await createMember();
	projectEditor = await createMember();

	project = await createTeamProject('Credential policy project', projectAdmin);
	await linkUserToProject(projectEditor, project, 'project:editor');
});

afterEach(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
	]);
});

describe('credential type availability policy project controller RBAC', () => {
	test('PUT rejects a project editor with 403', async () => {
		const response = await testServer
			.authAgentFor(projectEditor)
			.put(projectRoute(project.id))
			.send({ rules: [], defaultAction: 'allow', version: 0 });

		expect(response.statusCode).toBe(403);
	});

	test('an unauthenticated caller is rejected before the scope check even runs', async () => {
		const response = await testServer.authlessAgent.get(projectRoute(project.id));

		expect(response.statusCode).toBe(401);
	});

	test('the admin of the project is not rejected by the scope check', async () => {
		const response = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));

		expect(response.statusCode).toBe(200);
	});
});

describe('credential type availability policy project controller license gating', () => {
	afterEach(() => {
		testServer.license.enable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
	});

	test('rejects a project admin with 403 when the license feature is disabled', async () => {
		testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);

		const response = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));

		expect(response.statusCode).toBe(403);
	});
});

describe('credential type availability policy project controller admin happy path', () => {
	test('PUT persists and fires an audit event carrying the credential-types kind', async () => {
		const eventService = Container.get(EventService);
		const emitSpy = vi.spyOn(eventService, 'emit');

		const response = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({
				rules: [{ id: 'r1', action: 'allow', selector: { kind: 'name', value: 'slackApi' } }],
				defaultAction: 'allow',
				version: 0,
			});

		expect(response.statusCode).toBe(200);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-scope-updated',
			expect.objectContaining({
				updatedBy: projectAdmin.id,
				projectId: project.id,
				kind: 'credential-types',
			}),
		);
	});
});

/**
 * A project can tighten an instance policy, never loosen it. The composition itself is proven
 * generically elsewhere; this proves the plumbing carries `credential-types` through both new
 * routes to that same, unmodified composition.
 */
describe('credential type availability policy: instance deny beats a project allow', () => {
	test('a project admin allowing a credential type the instance blocks does not unblock it', async () => {
		const instancePut = await testServer
			.authAgentFor(owner)
			.put('/credential-type-policies/instance')
			.send({
				rules: [
					{ id: 'instance-deny', action: 'deny', selector: { kind: 'name', value: 'slackApi' } },
				],
				defaultAction: 'allow',
				version: 0,
			});
		expect(instancePut.statusCode).toBe(200);

		const projectPut = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({
				rules: [
					{ id: 'project-allow', action: 'allow', selector: { kind: 'name', value: 'slackApi' } },
				],
				defaultAction: 'allow',
				version: 0,
			});
		expect(projectPut.statusCode).toBe(200);

		const verdict = await Container.get(TypeAvailabilityPolicyService).evaluateComposedType(
			CREDENTIAL_TYPES_KIND,
			project.id,
			'slackApi',
		);

		expect(verdict).toMatchObject({
			action: 'deny',
			scope: 'instance',
			matchedRuleId: 'instance-deny',
		});
	});
});
