import type { SuperAgentTest } from 'supertest';
import {
	ROUTES_REQUIRING_AUTHENTICATION,
	ROUTES_REQUIRING_AUTHORIZATION,
} from './shared/constants';
import * as testDb from './shared/testDb';
import * as utils from './shared/utils';

let authlessAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

beforeAll(async () => {
	const app = await utils.initTestServer({ endpointGroups: ['me', 'auth', 'owner', 'users'] });
	const globalMemberRole = await testDb.getGlobalMemberRole();
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	authlessAgent = utils.createAgent(app);
	authMemberAgent = utils.createAuthAgent(app)(member);
});

afterAll(async () => {
	await testDb.terminate();
});

ROUTES_REQUIRING_AUTHENTICATION.concat(ROUTES_REQUIRING_AUTHORIZATION).forEach((route) => {
	const [method, endpoint] = getMethodAndEndpoint(route);

	test(`${route} should return 401 Unauthorized if no cookie`, async () => {
		const { statusCode } = await authlessAgent[method](endpoint);
		expect(statusCode).toBe(401);
	});
});

ROUTES_REQUIRING_AUTHORIZATION.forEach(async (route) => {
	const [method, endpoint] = getMethodAndEndpoint(route);

	test(`${route} should return 403 Forbidden for member`, async () => {
		const { statusCode } = await authMemberAgent[method](endpoint);
		expect(statusCode).toBe(403);
	});
});

function getMethodAndEndpoint(route: string) {
	return route.split(' ').map((segment, index) => {
		return index % 2 === 0 ? segment.toLowerCase() : segment;
	});
}
