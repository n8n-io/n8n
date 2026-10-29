import { testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { SkillUsageProxy } from '../../services/skill-usage-proxy.service';

// Only the skills module loads, so the agents module never registers its `SkillUsage`:
// the real gates and proxy are off, with nothing stubbed.
beforeAll(async () => {
	await testModules.loadModules(['skills']);
});

describe('Skills without the agents module', () => {
	const server = setupTestServer({ endpointGroups: ['ai'] });

	it('leaves the proxy unregistered', () => {
		expect(Container.get(SkillUsageProxy).isRegistered).toBe(false);
	});

	it('hides the skills API, also before it reads the request', async () => {
		const owner = server.authAgentFor(await createOwner());

		await owner.get('/skills').expect(404);
		await owner
			.post('/skills')
			.send({ scope: 'instance', skill: { name: 'n' } })
			.expect(404);
		await owner.post('/skills').send({ scope: 'nope' }).expect(404);
		await owner.get('/skills?take=-1').expect(404);
	});
});
