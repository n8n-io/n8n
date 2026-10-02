import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance, testModules } from '@n8n/backend-test-utils';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import '@/modules/agents/agents-settings.controller';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { FrontendService } from '@/services/frontend.service';

import { createAdmin, createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

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
		publisher.publishCommand.mockClear();
		vi.spyOn(registry, 'refreshModuleSettings').mockResolvedValue(null);
	});

	afterEach(() => vi.restoreAllMocks());

	it('enables Agents by default without a saved setting', async () => {
		const response = await owner.get('/agents/settings').expect(200);
		expect(response.body.data).toEqual({ enabled: true });
	});

	it.each([false, true])(
		'lets an admin save and share a choice (local refresh fails: %s)',
		async (refreshFails) => {
			const refreshError = new Error('Settings refresh failed');
			const logger = Container.get(Logger);
			if (refreshFails) {
				vi.mocked(registry.refreshModuleSettings).mockRejectedValueOnce(refreshError);
			}
			const repository = Container.get(SettingsRepository);
			await repository.upsertByKey('instanceAi.settings', '{"enabled":false}', true, {});
			await repository.upsertByKey('agents.enabled', 'false', true, {});
			const peer = new AgentsSettingsService(
				repository,
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
			);
			await expect(peer.getEnabled()).resolves.toBe(false);

			const response = await admin.put('/agents/settings').send({ enabled: true }).expect(200);
			expect(response.body.data).toEqual({ enabled: true });
			await expect(peer.getEnabled()).resolves.toBe(true);
			expect(registry.refreshModuleSettings).toHaveBeenCalledWith('agents');
			expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-agents-settings' });
			if (refreshFails) {
				expect(logger.error).toHaveBeenCalledWith('Failed to refresh the local Agents setting', {
					error: refreshError,
				});
			}

			await owner.put('/agents/settings').send({ enabled: false }).expect(200);
			await expect(peer.assertEnabled()).rejects.toThrow('Agents are disabled');
			expect((await owner.get('/agents/settings').expect(200)).body.data).toEqual({
				enabled: false,
			});
			expect((await repository.findByKey('instanceAi.settings'))?.value).toBe('{"enabled":false}');
		},
	);

	it('requires an authenticated instance admin and a boolean setting', async () => {
		await Container.get(AgentsSettingsService).setEnabled(false);
		await server.authlessAgent.get('/agents/settings').expect(401);
		await server.authlessAgent.put('/agents/settings').send({ enabled: true }).expect(401);
		await member.get('/agents/settings').expect(403);
		await member.put('/agents/settings').send({ enabled: true }).expect(403);
		await admin.put('/agents/settings').send({ enabled: 'true' }).expect(400);
		await expect(Container.get(AgentsSettingsService).getEnabled()).resolves.toBe(false);
	});
});
