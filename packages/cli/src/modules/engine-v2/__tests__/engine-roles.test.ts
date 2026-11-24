import { UserError } from '@n8n/errors';

import { parseEngineRoles } from '../engine-roles';

describe('parseEngineRoles', () => {
	it.each([
		{ flag: undefined, env: '', roles: ['api', 'orchestrator', 'step-worker'] },
		{ flag: 'api', env: '', roles: ['api'] },
		{ flag: 'orchestrator', env: '', roles: ['orchestrator'] },
		{ flag: 'step-worker', env: '', roles: ['step-worker'] },
		{ flag: 'api,orchestrator', env: '', roles: ['api', 'orchestrator'] },
		{ flag: ' step-worker , api ', env: '', roles: ['api', 'step-worker'] },
		{ flag: 'api,api,', env: '', roles: ['api'] },
		{ flag: undefined, env: 'step-worker', roles: ['step-worker'] },
		{ flag: undefined, env: 'orchestrator, api', roles: ['api', 'orchestrator'] },
		{ flag: 'orchestrator', env: 'api', roles: ['orchestrator'] },
		{ flag: 'orchestrator', env: 'worker', roles: ['orchestrator'] },
	])('reads --roles=$flag and N8N_ENGINE_ROLES=$env as $roles', ({ flag, env, roles }) => {
		expect(parseEngineRoles(flag, env)).toEqual(roles);
	});

	it.each([
		{ flag: 'worker', env: '', error: 'Unknown engine role in --roles: worker' },
		{ flag: 'api,main,webhook', env: '', error: 'Unknown engine roles in --roles: main, webhook' },
		{ flag: 'API', env: '', error: 'Unknown engine role in --roles: API' },
		{ flag: '', env: '', error: 'Give at least one engine role in --roles' },
		{ flag: ' , ', env: 'api', error: 'Give at least one engine role in --roles' },
		{ flag: undefined, env: 'worker', error: 'Unknown engine role in N8N_ENGINE_ROLES: worker' },
		{
			flag: undefined,
			env: ',',
			error: 'Give at least one engine role in N8N_ENGINE_ROLES. Got ",".',
		},
	])(
		'refuses --roles=$flag with N8N_ENGINE_ROLES=$env and lists the valid roles',
		({ flag, env, error }) => {
			const parse = () => parseEngineRoles(flag, env);

			expect(parse).toThrow(UserError);
			expect(parse).toThrow(error);
			expect(parse).toThrow('The valid roles are api, orchestrator, step-worker.');
		},
	);
});
