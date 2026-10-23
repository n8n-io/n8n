import type { AuthenticatedRequest } from '@n8n/db';
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
	const controller = new ScimDiscoveryController();
	const req = mock<AuthenticatedRequest>();

	const call = (handler: 'getServiceProviderConfig' | 'getResourceTypes' | 'getSchemas') => {
		const res = { header: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
		controller[handler](req, res as unknown as Response);
		return { header: res.header, body: res.json.mock.calls[0][0] };
	};

	it.each(['getServiceProviderConfig', 'getResourceTypes', 'getSchemas'] as const)(
		'%s responds as application/scim+json',
		(handler) => {
			expect(call(handler).header).toHaveBeenCalledWith('Content-Type', 'application/scim+json');
		},
	);

	it('advertises only the operations it can serve', () => {
		const { body } = call('getServiceProviderConfig');

		// Both are implemented by /scim/v2/Users.
		expect(body.patch.supported).toBe(true);
		expect(body.filter.supported).toBe(true);

		expect(body.bulk.supported).toBe(false);
		expect(body.changePassword.supported).toBe(false);
		expect(body.sort.supported).toBe(false);
		expect(body.etag.supported).toBe(false);
	});

	it('tells providers it authenticates with a bearer token', () => {
		const { body } = call('getServiceProviderConfig');

		expect(body.authenticationSchemes).toEqual([
			expect.objectContaining({ type: 'oauthbearertoken', primary: true }),
		]);
	});

	it('advertises the User resource type, pointing at /Users', () => {
		const { body } = call('getResourceTypes');

		expect(body.totalResults).toBe(1);
		expect(body.Resources).toEqual([expect.objectContaining({ id: 'User', endpoint: '/Users' })]);
	});

	it('advertises the User schema', () => {
		const { body } = call('getSchemas');

		expect(body.totalResults).toBe(1);
		expect(body.Resources).toEqual([
			expect.objectContaining({ id: 'urn:ietf:params:scim:schemas:core:2.0:User' }),
		]);
	});

	// Advertising a resource with no endpoint behind it turns every sync into a
	// 404. Group is added by the PR that implements it.
	it.each(['getResourceTypes', 'getSchemas'] as const)('%s does not mention Group', (handler) => {
		expect(JSON.stringify(call(handler).body)).not.toMatch(/Group/);
	});
});
