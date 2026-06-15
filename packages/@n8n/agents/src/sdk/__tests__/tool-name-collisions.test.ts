import { z } from 'zod';

import {
	createDelegateSubAgentTool,
	DELEGATE_SUB_AGENT_TOOL_NAME,
} from '../../runtime/delegate-sub-agent-tool';
import { isSdkOwnedBuiltInTool } from '../../runtime/sdk-owned-tool';
import { createWriteTodosTool, WRITE_TODOS_TOOL_NAME } from '../../runtime/write-todos-tool';
import { Agent } from '../agent';
import { Tool } from '../tool';

function makeCustomTool(name: string) {
	return new Tool(name)
		.description('Custom tool')
		.input(z.object({}))
		.handler(async () => await Promise.resolve({ ok: true }))
		.build();
}

function makeAgent() {
	return new Agent('parent').model('openai', 'gpt-4o-mini').instructions('Test agent.');
}

describe('SDK reserved built-in tool names', () => {
	it.each([DELEGATE_SUB_AGENT_TOOL_NAME, WRITE_TODOS_TOOL_NAME])(
		'rejects a custom static tool named %s',
		(toolName) => {
			expect(() => makeAgent().tool(makeCustomTool(toolName))).toThrow(
				`Tool name "${toolName}" is reserved for SDK built-in tools`,
			);
		},
	);

	it.each([DELEGATE_SUB_AGENT_TOOL_NAME, WRITE_TODOS_TOOL_NAME])(
		'rejects a deferred tool named %s',
		(toolName) => {
			expect(() => makeAgent().deferredTool(makeCustomTool(toolName))).toThrow(
				`Tool name "${toolName}" is reserved for SDK built-in tools`,
			);
		},
	);

	it('allows official SDK built-in tools to be registered', () => {
		const agent = makeAgent().tool(createDelegateSubAgentTool()).tool(createWriteTodosTool());

		expect(agent.declaredTools.map((tool) => tool.name)).toEqual([
			DELEGATE_SUB_AGENT_TOOL_NAME,
			WRITE_TODOS_TOOL_NAME,
		]);
		expect(agent.declaredTools.every((tool) => isSdkOwnedBuiltInTool(tool))).toBe(true);
	});
});
