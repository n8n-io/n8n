import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { AgentsService } from '@/modules/agents/agents.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createOwner } from '../../../../../test/integration/shared/db/users';

import { EvalThreadRestoreService } from '../thread-restore.service';

beforeAll(async () => {
	await testModules.loadModules(['agents']);
	await testDb.init();
});

afterEach(async () => {
	await Container.get(AgentRepository).delete({});
});

afterAll(async () => {
	await testDb.terminate();
});

describe('EvalThreadRestoreService.restoreAgents with custom tools', () => {
	it('restores custom tool bodies on the agent row', async () => {
		const owner = await createOwner();
		const project = await createTeamProject();
		const agentId = 'agOpsTools000001';
		const tools = {
			lookup_order: {
				code: 'export default new Tool("lookup_order");',
				descriptor: {
					name: 'lookup_order',
					description: 'Look up an order',
					systemInstruction: null,
					inputSchema: { type: 'object' as const },
					outputSchema: null,
					hasSuspend: false,
					hasResume: false,
					hasToMessage: false,
					requireApproval: false,
					providerOptions: null,
				},
			},
		};

		await Container.get(EvalThreadRestoreService).restoreAgents(
			[
				{
					id: agentId,
					config: {
						name: 'Order helper',
						model: 'anthropic/claude-sonnet-4-5',
						instructions: 'Answer order questions.',
						tools: [{ type: 'custom', id: 'lookup_order' }],
					},
					tools,
				},
			],
			project.id,
			owner,
		);

		const agent = await Container.get(AgentsService).findById(agentId, project.id);
		expect(agent?.tools).toEqual(tools);
		expect(agent?.schema?.tools).toEqual([{ type: 'custom', id: 'lookup_order' }]);
	});
});
