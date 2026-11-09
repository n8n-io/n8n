import { z } from 'zod';

import { filterLlmMessages, isRuntimeToolCatalog } from '../../../sdk/message';
import { Tool } from '../../../sdk/tool';
import type { AgentRuntimeConfig } from '../../../types/runtime/agent-runtime';
import type { BuiltTool } from '../../../types';
import { AgentMessageList } from '../../model/message-list';
import { ToolCatalog } from '../../tools/tool-catalog';
import { RuntimeContextBuilder } from '../runtime-context';

function makeTool(name: string): BuiltTool {
	return new Tool(name)
		.description(`Run ${name}`)
		.input(z.object({ id: z.string() }))
		.handler(async () => await Promise.resolve({ ok: true }))
		.build();
}

const runtime = { model: 'openai/gpt-4.1', instructions: 'Base.' } as AgentRuntimeConfig;

function builder(names: string[]) {
	const toolCatalog = names.length > 0 ? new ToolCatalog(names.map(makeTool)) : undefined;
	return new RuntimeContextBuilder(runtime, toolCatalog);
}

function texts(list: AgentMessageList): string[] {
	return filterLlmMessages(list.messages().filter(isRuntimeToolCatalog)).map((message) =>
		JSON.stringify(message.content),
	);
}

describe('tool catalog context message', () => {
	it('adds the names in a <context> block as a user message, before the input', () => {
		const list = new AgentMessageList();
		builder(['get_cell']).synchronizeToolCatalog(list);
		list.addInput([{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }]);

		const [first, second] = filterLlmMessages([...list.messages()]);
		expect(first.role).toBe('user');
		expect(JSON.stringify(first.content)).toContain(
			'<context>\\n# Tool catalog\\n- tools: get_cell',
		);
		expect(JSON.stringify(second.content)).toContain('Hi');
	});

	it('adds nothing while the list stays the same', () => {
		const list = new AgentMessageList();
		builder(['get_cell']).synchronizeToolCatalog(list);
		builder(['get_cell']).synchronizeToolCatalog(list);
		expect(texts(list)).toHaveLength(1);
	});

	it('sends a reminder when the list changes, and when it goes away', () => {
		const list = new AgentMessageList();
		builder(['get_cell']).synchronizeToolCatalog(list);
		builder(['get_cell', 'send_message']).synchronizeToolCatalog(list);
		builder([]).synchronizeToolCatalog(list);

		const [, changed, removed] = texts(list);
		expect(changed).toContain('<system-reminder>');
		expect(changed).toContain('get_cell, send_message');
		expect(removed).toContain('No longer applies');
	});

	it('adds nothing when there was never a tool catalog', () => {
		const list = new AgentMessageList();
		builder([]).synchronizeToolCatalog(list);
		expect(list.messages()).toHaveLength(0);
	});
});
