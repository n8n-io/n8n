import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../__tests__/tool-test-utils';
import type {
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
} from '../../types';
import { createAgentsTool } from '../agents.tool';

function makeContext(delegate?: InstanceAiBuilderDelegate): OrchestrationContext {
	const domainContext = mock<InstanceAiContext>();
	domainContext.builderDelegate = delegate;

	const context = mock<OrchestrationContext>();
	context.domainContext = domainContext;
	return context;
}

describe('agents tool', () => {
	it('lists the project agents via the builder delegate', async () => {
		const delegate = mock<InstanceAiBuilderDelegate>();
		const agents = [
			{
				agentId: 'agent-1',
				name: 'Support Agent',
				published: true,
				updatedAt: '2026-07-14T00:00:00.000Z',
			},
			{
				agentId: 'agent-2',
				name: 'Draft Agent',
				published: false,
				updatedAt: '2026-07-10T00:00:00.000Z',
			},
		];
		delegate.listAgents.mockResolvedValue(agents);
		const context = makeContext(delegate);

		const tool = createAgentsTool(context);
		const output = await executeTool(tool, { action: 'list' });

		expect(output).toEqual({ count: 2, agents });
		expect(delegate.listAgents).toHaveBeenCalledTimes(1);
	});

	it('propagates delegate failures', async () => {
		const delegate = mock<InstanceAiBuilderDelegate>();
		delegate.listAgents.mockRejectedValue(
			new Error('You do not have permission to access agents in this project.'),
		);
		const context = makeContext(delegate);

		const tool = createAgentsTool(context);

		await expect(executeTool(tool, { action: 'list' })).rejects.toThrow(
			'You do not have permission to access agents in this project.',
		);
	});
});
