import type { AgentIntegrationConfig } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentRepository', () => {
	let agents: AgentRepository;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		agents = Container.get(AgentRepository);
	}, 60_000);

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findWithIntegrationType', () => {
		it('returns only agents with a channel of the given type', async () => {
			const project = await createTeamProject();
			const save = async (integrations: AgentIntegrationConfig[]) =>
				await agents.save(
					agents.create({
						id: randomUUID(),
						name: 'Agent',
						projectId: project.id,
						integrations,
						tools: {},
						skills: {},
					}),
				);
			const whatsApp = await save([
				{ type: 'telegram', credentialId: 'cred-1' },
				{ type: 'whatsapp', credentialId: 'cred-2' },
			]);
			await save([{ type: 'telegram', credentialId: 'whatsapp' }]);
			await save([]);

			const result = await agents.findWithIntegrationType('whatsapp');

			expect(result).toEqual([{ id: whatsApp.id, integrations: whatsApp.integrations }]);
		});
	});
});
