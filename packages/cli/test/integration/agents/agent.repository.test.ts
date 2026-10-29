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
	describe('saveOnlineRubric', () => {
		it('saves the rubric and reads it back from the agent', async () => {
			const project = await createTeamProject();
			const agent = await agents.save(
				agents.create({
					id: randomUUID(),
					name: 'Rubric agent',
					projectId: project.id,
					tools: {},
					skills: {},
					integrations: [],
				}),
			);
			const rubric = { checks: [], generatedAt: new Date().toISOString() };
			expect(await agents.saveOnlineRubric(agent.id, project.id, rubric)).toBe(true);
			expect((await agents.findByIdAndProjectId(agent.id, project.id))?.onlineRubric).toEqual(
				rubric,
			);
		});

		it('does not save a rubric through a different project', async () => {
			const project = await createTeamProject();
			const other = await createTeamProject();
			const agent = await agents.save(
				agents.create({
					id: randomUUID(),
					name: 'Rubric agent',
					projectId: project.id,
					tools: {},
					skills: {},
					integrations: [],
				}),
			);
			expect(
				await agents.saveOnlineRubric(agent.id, other.id, {
					checks: [],
					generatedAt: new Date().toISOString(),
				}),
			).toBe(false);
			expect((await agents.findByIdAndProjectId(agent.id, project.id))?.onlineRubric).toBeNull();
		});
	});
});
