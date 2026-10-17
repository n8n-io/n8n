import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';

import { TOOLS_BY_SCOPE } from '../mcp-scopes';
import { resolveRenamedToolCall } from '../mcp.utils';
import { RENAMED_TOOLS } from '../renamed-tools';

const CURRENT_TOOLS = new Set(Object.values(TOOLS_BY_SCOPE).flat());

const toolCall = (name: unknown, args: Record<string, unknown> = { workflowId: 'wf-1' }) => ({
	jsonrpc: '2.0',
	id: 1,
	method: 'tools/call',
	params: { name, arguments: args },
});

describe('RENAMED_TOOLS', () => {
	it('points every former name at a tool the instance still exposes', () => {
		for (const { currentName } of Object.values(RENAMED_TOOLS)) {
			expect(CURRENT_TOOLS).toContain(currentName);
		}
	});

	// A former name that comes back as a real tool must not be rewritten, or the
	// new tool becomes unreachable.
	it('does not map a name the instance exposes again', () => {
		for (const formerName of Object.keys(RENAMED_TOOLS)) {
			expect(CURRENT_TOOLS).not.toContain(formerName);
		}
	});
});

describe('resolveRenamedToolCall', () => {
	it('rewrites a call that uses a former tool name', () => {
		const { body, renamedFrom } = resolveRenamedToolCall(toolCall('get_execution'));

		expect(renamedFrom).toBe('get_execution');
		expect(body).toEqual({
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/call',
			params: { name: 'get_workflow_execution', arguments: { workflowId: 'wf-1' } },
		});
	});

	it('leaves the request untouched when the tool name is current', () => {
		const request = toolCall('get_workflow_execution');

		const { body, renamedFrom } = resolveRenamedToolCall(request);

		expect(body).toBe(request);
		expect(renamedFrom).toBeUndefined();
	});

	it.each([
		['an unknown tool name', toolCall('no_such_tool')],
		['a non-string tool name', toolCall(42)],
		['a method other than tools/call', { jsonrpc: '2.0', id: 1, method: 'tools/list' }],
		['a body that is not a JSON-RPC request', 'not-a-request'],
	])('leaves the request untouched for %s', (_label, request) => {
		const { body, renamedFrom } = resolveRenamedToolCall(request);

		expect(body).toBe(request);
		expect(renamedFrom).toBeUndefined();
	});

	// `search_executions` took `lastId`; `search_workflow_executions` takes an
	// opaque `cursor`. The input schema strips an unknown key rather than
	// rejecting it, so rewriting a paging call would answer the first page
	// again instead of the page the client asked for.
	it('leaves a paging call for a renamed tool that dropped the argument', () => {
		const request = toolCall('search_executions', { workflowId: 'wf-1', lastId: '42' });

		const { body, renamedFrom } = resolveRenamedToolCall(request);

		expect(body).toBe(request);
		expect(renamedFrom).toBeUndefined();
	});

	it('rewrites the same call when it does not page', () => {
		const { body, renamedFrom } = resolveRenamedToolCall(
			toolCall('search_executions', { workflowId: 'wf-1' }),
		);

		expect(renamedFrom).toBe('search_executions');
		expect(body).toMatchObject({ params: { name: 'search_workflow_executions' } });
	});

	it('does not mutate the original request', () => {
		const request = toolCall('get_execution');

		resolveRenamedToolCall(request);

		expect(request.params.name).toBe('get_execution');
	});
});

// The premise of the rewrite, pinned against the real SDK: an unknown tool name
// is rejected before any n8n code runs, so a former name is only reachable if
// the request carries the current one.
describe('a former tool name against the real MCP SDK', () => {
	const buildHandler = (calls: string[]) =>
		createMcpHandler(
			async () => {
				const server = new McpServer({ name: 'n8n MCP Server', version: '1.0.0' });
				server.registerTool('get_workflow_execution', { description: 'test tool' }, async () => {
					calls.push('get_workflow_execution');
					return { content: [{ type: 'text' as const, text: 'ok' }] };
				});
				return server;
			},
			{ legacy: 'stateless' },
		);

	const serve = async (body: unknown) => {
		const calls: string[] = [];
		const response = await buildHandler(calls).fetch(
			new Request('https://n8n.example.com/mcp-server/http', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					accept: 'application/json, text/event-stream',
				},
				body: JSON.stringify(body),
			}),
		);
		return { calls, text: await response.text() };
	};

	it('is rejected when the request is passed through unchanged', async () => {
		const { calls, text } = await serve(toolCall('get_execution'));

		expect(text).toContain('Tool get_execution not found');
		expect(calls).toEqual([]);
	});

	it('reaches the current tool once the request is resolved', async () => {
		const { calls, text } = await serve(resolveRenamedToolCall(toolCall('get_execution')).body);

		expect(text).not.toContain('not found');
		expect(calls).toEqual(['get_workflow_execution']);
	});
});
