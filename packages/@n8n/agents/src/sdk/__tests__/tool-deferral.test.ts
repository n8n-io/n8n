import { z } from 'zod';

import type { AgentRuntimeConfig } from '../../runtime/loop/agent-runtime';
import { CALL_TOOL_TOOL_NAME, FIND_TOOLS_TOOL_NAME } from '../../runtime/tools/tool-catalog';
import { Agent } from '../agent';
import { Tool } from '../tool';

function makeTool(name: string) {
	return new Tool(name)
		.description('Test tool')
		.input(z.object({}))
		.handler(async () => await Promise.resolve({ ok: true }))
		.build();
}

function makeAgent() {
	return new Agent('deferral').model('openai', 'gpt-4o-mini').instructions('Test agent.');
}

async function build(agent: Agent): Promise<AgentRuntimeConfig> {
	return await (agent as unknown as { build(): Promise<AgentRuntimeConfig> }).build();
}

describe('Agent tool deferral', () => {
	it('forwards toolDeferral and deferred tool namespaces to the runtime config', async () => {
		const agent = makeAgent()
			.toolDeferral({ mode: 'catalog' })
			.deferredTool(makeTool('lookup'), { namespace: 'crm' });

		const config = await build(agent);

		expect(config.toolDeferral).toEqual({ mode: 'catalog' });
		expect(config.deferredToolNamespaces).toEqual({ lookup: 'crm' });
		expect(agent.snapshot.toolDeferral).toEqual({ mode: 'catalog' });
	});

	it('reports no toolDeferral in the snapshot by default', () => {
		expect(makeAgent().snapshot.toolDeferral).toBeNull();
	});

	it.each([FIND_TOOLS_TOOL_NAME, CALL_TOOL_TOOL_NAME])(
		'rejects a static tool named %s when deferred tools exist',
		async (toolName) => {
			const agent = makeAgent()
				.toolDeferral({ mode: 'catalog' })
				.tool(makeTool(toolName))
				.deferredTool(makeTool('lookup'));

			await expect(build(agent)).rejects.toThrow(
				`reserved for the tool catalog: ${toolName}`,
			);
		},
	);
});
