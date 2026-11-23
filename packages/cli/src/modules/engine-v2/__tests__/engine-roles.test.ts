import { UserError } from '@n8n/errors';

import { parseEngineRoles } from '../engine-roles';

describe('parseEngineRoles', () => {
	it.each([
		{ flag: undefined, roles: ['api', 'orchestrator', 'step-worker'] },
		{ flag: 'api', roles: ['api'] },
		{ flag: 'orchestrator', roles: ['orchestrator'] },
		{ flag: 'step-worker', roles: ['step-worker'] },
		{ flag: 'api,orchestrator', roles: ['api', 'orchestrator'] },
		{ flag: ' step-worker , api ', roles: ['api', 'step-worker'] },
		{ flag: 'api,api,', roles: ['api'] },
	])('reads $flag as $roles', ({ flag, roles }) => {
		expect(parseEngineRoles(flag)).toEqual(roles);
	});

	it.each([
		{ flag: 'worker', error: 'Unknown engine role: worker' },
		{ flag: 'api,main,webhook', error: 'Unknown engine roles: main, webhook' },
		{ flag: 'API', error: 'Unknown engine role: API' },
		{ flag: '', error: 'Give at least one engine role' },
		{ flag: ' , ', error: 'Give at least one engine role' },
	])('refuses "$flag" and lists the valid roles', ({ flag, error }) => {
		const parse = () => parseEngineRoles(flag);

		expect(parse).toThrow(UserError);
		expect(parse).toThrow(error);
		expect(parse).toThrow('The valid roles are api, orchestrator, step-worker.');
	});
});
