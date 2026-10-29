import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types';
import {
	CALL_TOOL_TOOL_NAME,
	DynamicToolRegistry,
	GET_TOOLS_TOOL_NAME,
} from '../tools/dynamic-tools';

function makeTool(name: string, description = `${name} description`): BuiltTool {
	return new Tool(name)
		.description(description)
		.input(z.object({ channel: z.string() }))
		.handler(async () => await Promise.resolve({ ok: true }))
		.build();
}

async function runGetTools(registry: DynamicToolRegistry, input: unknown) {
	return await registry.getToolsTool.handler!(input, {} as never);
}

describe('DynamicToolRegistry', () => {
	it('exposes only the two fixed controller tools to the model', () => {
		const registry = new DynamicToolRegistry({
			namespaces: [{ name: 'slack', tools: [makeTool('slack_send'), makeTool('slack_read')] }],
		});

		expect(registry.getControllerTools().map((tool) => tool.name)).toEqual([
			GET_TOOLS_TOOL_NAME,
			CALL_TOOL_TOOL_NAME,
		]);
		expect(registry.getCallableTools().map((tool) => tool.name)).toEqual([
			'slack_send',
			'slack_read',
		]);
	});

	it('resolves call_tool input to the real tool', () => {
		const registry = new DynamicToolRegistry({
			namespaces: [{ name: 'slack', tools: [makeTool('slack_send')] }],
		});

		expect(
			registry.resolveCall({ namespace: 'slack', tool: 'slack_send', arguments: { channel: 'a' } }),
		).toEqual({ ok: true, toolName: 'slack_send', input: { channel: 'a' } });
	});

	it('returns errors for unknown namespaces and tools', () => {
		const registry = new DynamicToolRegistry({
			namespaces: [{ name: 'slack', tools: [makeTool('slack_send')] }],
		});

		const noNamespace = registry.resolveCall({ namespace: 'x', tool: 'slack_send' });
		const noTool = registry.resolveCall({ namespace: 'slack', tool: 'nope' });

		expect(noNamespace.ok).toBe(false);
		expect(noTool).toMatchObject({ ok: false, error: expect.stringContaining('slack_send') });
	});

	it('leaves denied tools out of the catalog and blocks calls to them', () => {
		const registry = new DynamicToolRegistry({
			namespaces: [
				{
					name: 'slack',
					toolPermissions: { slack_delete: 'deny' },
					tools: [makeTool('slack_send'), makeTool('slack_delete')],
				},
			],
		});

		expect(registry.renderCatalog()).not.toContain('slack_delete');
		expect(registry.resolveCall({ namespace: 'slack', tool: 'slack_delete' }).ok).toBe(false);
		expect(registry.getTool('slack_delete')).toBeUndefined();
	});

	it('wraps tools with "ask" permission for approval', () => {
		const registry = new DynamicToolRegistry({
			namespaces: [{ name: 'slack', permission: 'ask', tools: [makeTool('slack_send')] }],
		});

		expect(registry.getTool('slack_send')?.suspendSchema).toBeDefined();
	});

	it('does not make tools of unready namespaces callable', () => {
		const registry = new DynamicToolRegistry({
			namespaces: [{ name: 'gmail', status: 'needsAuth', tools: [makeTool('gmail_send')] }],
		});

		expect(registry.getCallableTools()).toEqual([]);
		expect(registry.resolveCall({ namespace: 'gmail', tool: 'gmail_send' })).toMatchObject({
			ok: false,
			error: expect.stringContaining('sign in'),
		});
		expect(registry.renderCatalog()).toContain('status="needsAuth"');
	});

	it('lists names with descriptions until the budget runs out, then names only', () => {
		const registry = new DynamicToolRegistry({
			catalogDescriptionTokenBudget: 10,
			namespaces: [
				{
					name: 'slack',
					tools: [makeTool('slack_send', 'Send'), makeTool('slack_read', 'Read a long channel')],
				},
			],
		});

		const catalog = registry.renderCatalog();

		expect(catalog).toContain('- slack_send: Send');
		expect(catalog).toContain('- slack_read\n');
		expect(catalog).not.toContain('Read a long channel');
	});

	it('rejects duplicate tool names across namespaces and reserved names', () => {
		expect(
			() =>
				new DynamicToolRegistry({
					namespaces: [
						{ name: 'a', tools: [makeTool('same')] },
						{ name: 'b', tools: [makeTool('same')] },
					],
				}),
		).toThrow('unique');
		expect(
			() =>
				new DynamicToolRegistry({ namespaces: [{ name: 'a', tools: [makeTool('call_tool')] }] }),
		).toThrow('reserved');
	});

	it('returns schemas from get_tools, by name or by query', async () => {
		const registry = new DynamicToolRegistry({
			namespaces: [
				{
					name: 'slack',
					tools: [makeTool('slack_send', 'Send a message'), makeTool('slack_read')],
				},
			],
		});

		const byName = await runGetTools(registry, { namespace: 'slack', tools: ['slack_send', 'x'] });
		const byQuery = await runGetTools(registry, { namespace: 'slack', query: 'message' });

		expect(byName).toMatchObject({
			tools: [{ name: 'slack_send', inputSchema: { type: 'object' } }],
			missing: ['x'],
		});
		expect(byQuery).toMatchObject({ tools: [{ name: 'slack_send' }] });
		expect(registry.describeInputSchema('slack_send')).toContain('channel');
	});
});
