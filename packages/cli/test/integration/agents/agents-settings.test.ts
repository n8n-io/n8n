import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import '@/modules/agents/agents-settings.controller';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { FrontendService } from '@/services/frontend.service';

import { createAdmin, createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

describe('Agents instance settings', () => {
	const registry = Container.get(ModuleRegistry);
	mockInstance(FrontendService);
	const publisher = mockInstance(Publisher);
	const server = setupTestServer({ endpointGroups: ['module-settings'] });
	let owner: SuperAgentTest;
	let admin: SuperAgentTest;
	let member: SuperAgentTest;

	beforeAll(async () => {
		owner = server.authAgentFor(await createOwner());
		admin = server.authAgentFor(await createAdmin());
		member = server.authAgentFor(await createMember());
	});

	beforeEach(async () => {
		await Container.get(SettingsRepository).delete({ key: 'agents.enabled' });
		vi.spyOn(registry, 'refreshModuleSettings').mockResolvedValue(null);
		vi.spyOn(Container.get(LicenseState), 'getValue').mockReturnValue('Enterprise');
	});

	afterEach(() => vi.restoreAllMocks());

	it.each([
		['Enterprise', false],
		['Cloud Enterprise', false],
		['Community', true],
		['Business', true],
		['Pro', true],
	] as const)('uses the %s default without a saved setting', async (plan, enabled) => {
		vi.mocked(Container.get(LicenseState).getValue).mockReturnValue(plan);
		const response = await owner.get('/agents/settings').expect(200);
		expect(response.body.data).toEqual({ enabled });
	});

	it('lets an admin save a choice and shares it with other service instances', async () => {
		const repository = Container.get(SettingsRepository);
		await repository.upsertByKey('instanceAi.settings', '{"enabled":false}', true, {});
		const peer = new AgentsSettingsService(repository, Container.get(LicenseState));
		await expect(peer.getEnabled()).resolves.toBe(false);

		await admin.put('/agents/settings').send({ enabled: true }).expect(200);
		await expect(peer.getEnabled()).resolves.toBe(true);
		expect(registry.refreshModuleSettings).toHaveBeenCalledWith('agents');
		expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-agents-settings' });

		await owner.put('/agents/settings').send({ enabled: false }).expect(200);
		vi.mocked(Container.get(LicenseState).getValue).mockReturnValue('Community');
		await expect(peer.assertEnabled()).rejects.toThrow('Agents are disabled');
		expect((await owner.get('/agents/settings').expect(200)).body.data).toEqual({ enabled: false });
		expect((await repository.findByKey('instanceAi.settings'))?.value).toBe('{"enabled":false}');
	});

	it('requires an authenticated instance admin and a boolean setting', async () => {
		await server.authlessAgent.get('/agents/settings').expect(401);
		await server.authlessAgent.put('/agents/settings').send({ enabled: true }).expect(401);
		await member.get('/agents/settings').expect(403);
		await member.put('/agents/settings').send({ enabled: true }).expect(403);
		await admin.put('/agents/settings').send({ enabled: 'true' }).expect(400);
		await expect(Container.get(AgentsSettingsService).getEnabled()).resolves.toBe(false);
	});
});
