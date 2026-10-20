import { SCIM_N8N_USER_SCHEMA } from '@n8n/api-types';
import type { AuthenticatedRequest, Role, RoleRepository } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { ScimDiscoveryController } from '../scim-discovery.controller';

// `scim-route` resolves its middleware from the container at module scope, so
// importing the controller would otherwise need a fully wired container. The
// route options do not affect the response bodies under test. `vi.mock` is
// hoisted above the import above.
vi.mock('../scim-route', () => ({ scimRoute: {} }));

/**
 * An identity provider reads these to decide what to push. Anything advertised
 * here must already exist, or the provider sends requests that 404.
 */
describe('ScimDiscoveryController', () => {
	const roleRepository = mock<RoleRepository>();
	roleRepository.find.mockResolvedValue([
		{ slug: 'global:owner', roleType: 'global' },
		{ slug: 'global:member', roleType: 'global' },
		{ slug: 'global:admin', roleType: 'global' },
		{ slug: 'global:custom-auditor', roleType: 'global' },
	] as Role[]);
	const controller = new ScimDiscoveryController(roleRepository);
	const req = mock<AuthenticatedRequest>();

	const call = async (handler: 'getServiceProviderConfig' | 'getResourceTypes' | 'getSchemas') => {
		const res = { header: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
		await controller[handler](req, res as unknown as Response);
		return { header: res.header, body: res.json.mock.calls[0][0] };
	};

	it.each(['getServiceProviderConfig', 'getResourceTypes', 'getSchemas'] as const)(
		'%s responds as application/scim+json',
		async (handler) => {
			expect((await call(handler)).header).toHaveBeenCalledWith(
				'Content-Type',
				'application/scim+json',
			);
		},
	);

	it('advertises only the operations it can serve', async () => {
		const { body } = await call('getServiceProviderConfig');

		// Both are implemented by /scim/v2/Users.
		expect(body.patch.supported).toBe(true);
		expect(body.filter.supported).toBe(true);

		expect(body.bulk.supported).toBe(false);
		expect(body.changePassword.supported).toBe(false);
		expect(body.sort.supported).toBe(false);
		expect(body.etag.supported).toBe(false);
	});

	it('tells providers it authenticates with a bearer token', async () => {
		const { body } = await call('getServiceProviderConfig');

		expect(body.authenticationSchemes).toEqual([
			expect.objectContaining({ type: 'oauthbearertoken', primary: true }),
		]);
	});

	it('advertises the User resource type, pointing at /Users, with the n8n extension', async () => {
		const { body } = await call('getResourceTypes');

		expect(body.totalResults).toBe(1);
		expect(body.Resources).toEqual([
			expect.objectContaining({
				id: 'User',
				endpoint: '/Users',
				schemaExtensions: [{ schema: SCIM_N8N_USER_SCHEMA, required: false }],
			}),
		]);
	});

	it('advertises the User schema and the n8n extension schema', async () => {
		const { body } = await call('getSchemas');

		expect(body.totalResults).toBe(2);
		expect(body.Resources.map((resource: { id: string }) => resource.id)).toEqual([
			'urn:ietf:params:scim:schemas:core:2.0:User',
			SCIM_N8N_USER_SCHEMA,
		]);
	});

	// RFC 7643 section 7: each schema resource names its own schema.
	it('marks every schema resource with the Schema schema', async () => {
		const { body } = await call('getSchemas');

		for (const resource of body.Resources) {
			expect(resource.schemas).toEqual(['urn:ietf:params:scim:schemas:core:2.0:Schema']);
		}
	});

	// A provider that discovers the schema offers a list instead of a text
	// field. The owner role is never assignable, so it is not in the list.
	it('lists the assignable instance roles as canonical values, without the owner', async () => {
		const { body } = await call('getSchemas');
		const expected = ['global:admin', 'global:custom-auditor', 'global:member'];

		const [user, extension] = body.Resources;
		const roles = user.attributes.find((a: { name: string }) => a.name === 'roles');
		expect(roles.multiValued).toBe(true);
		expect(
			roles.subAttributes.find((a: { name: string }) => a.name === 'value').canonicalValues,
		).toEqual(expected);

		const instanceRole = extension.attributes.find(
			(a: { name: string }) => a.name === 'instanceRole',
		);
		expect(instanceRole).toMatchObject({
			type: 'string',
			multiValued: false,
			canonicalValues: expected,
		});
	});

	// Advertising a resource with no endpoint behind it turns every sync into a
	// 404. Group is added by the PR that implements it.
	it.each(['getResourceTypes', 'getSchemas'] as const)(
		'%s does not mention Group',
		async (handler) => {
			expect(JSON.stringify((await call(handler)).body)).not.toMatch(/Group/);
		},
	);
});
