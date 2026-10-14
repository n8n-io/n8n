import {
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	GATEWAY_CONFIRMATION_REQUIRED_PREFIX,
	type InstanceAiPermissions,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { InProcessMcpTool } from '@/modules/mcp/mcp.types';

import {
	N8nMcpLocalServer,
	n8nMcpSessionGrantKey,
	type N8nMcpApprovalGate,
} from '../n8n-mcp/n8n-mcp-local-server';
import { N8N_MCP_BUILD_TOOLS } from '../n8n-mcp/n8n-mcp-tool-permissions';

const OK_RESULT = { content: [{ type: 'text' as const, text: 'ok' }] };

function makeTool(
	name: string,
	call: InProcessMcpTool['call'] = vi.fn(async () => OK_RESULT),
): InProcessMcpTool {
	return {
		name,
		description: `${name} description`,
		annotations: { readOnlyHint: false },
		inputJsonSchema: { type: 'object', properties: { workflowId: { type: 'string' } } },
		call,
	};
}

function makeGate(overrides: Partial<N8nMcpApprovalGate> = {}): N8nMcpApprovalGate {
	return {
		permissions: DEFAULT_INSTANCE_AI_PERMISSIONS,
		sessionApprovedToolKeys: new Set(),
		grantSessionToolApproval: vi.fn(async () => {}),
		...overrides,
	};
}

function withPermission(
	key: keyof InstanceAiPermissions,
	mode: InstanceAiPermissions[keyof InstanceAiPermissions],
): InstanceAiPermissions {
	return { ...DEFAULT_INSTANCE_AI_PERMISSIONS, [key]: mode };
}

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
	return result.content.map((block) => block.text ?? '').join('');
}

describe('N8nMcpLocalServer', () => {
	it('exposes only allowlisted tools, tagged with their own category', () => {
		const server = new N8nMcpLocalServer(
			[makeTool('search_workflows'), makeTool('delete_agent')],
			mock<Logger>(),
		);

		expect(server.getAvailableTools().map((tool) => tool.name)).toEqual(['search_workflows']);
		expect(server.getAvailableTools()[0].annotations?.category).toBe('n8n-mcp');
		expect(server.getToolsByCategory('n8n-mcp')).toHaveLength(1);
		expect(server.getToolsByCategory('browser')).toHaveLength(0);
	});

	it('reports only the native actions whose replacement tool is present', () => {
		const server = new N8nMcpLocalServer(
			[makeTool('list_credentials'), makeTool('search_projects')],
			mock<Logger>(),
		);

		expect(server.getReplacedToolActions()).toEqual([
			{ toolName: 'credentials', action: 'list', replacementToolName: 'list_credentials' },
			{ toolName: 'workspace', action: 'list-projects', replacementToolName: 'search_projects' },
		]);
	});

	it('runs read tools without an approval gate', async () => {
		const tool = makeTool('search_workflows');
		const server = new N8nMcpLocalServer([tool], mock<Logger>());

		const result = await server.callTool({ name: 'search_workflows', arguments: {} });

		expect(result).toEqual(OK_RESULT);
		expect(tool.call).toHaveBeenCalledWith({});
	});

	it('refuses tools that change data until an approval gate is set', async () => {
		const tool = makeTool('publish_workflow');
		const server = new N8nMcpLocalServer([tool], mock<Logger>());

		const result = await server.callTool({
			name: 'publish_workflow',
			arguments: { workflowId: 'wf-1' },
		});

		expect(result.isError).toBe(true);
		expect(tool.call).not.toHaveBeenCalled();
	});

	it('refuses a tool whose permission is blocked', async () => {
		const tool = makeTool('publish_workflow');
		const server = new N8nMcpLocalServer([tool], mock<Logger>());
		server.setApprovalGate(makeGate({ permissions: withPermission('publishWorkflow', 'blocked') }));

		const result = await server.callTool({
			name: 'publish_workflow',
			arguments: { workflowId: 'wf-1' },
		});

		expect(result.isError).toBe(true);
		expect(tool.call).not.toHaveBeenCalled();
	});

	it('runs a tool whose permission is always allow', async () => {
		const tool = makeTool('publish_workflow');
		const server = new N8nMcpLocalServer([tool], mock<Logger>());
		server.setApprovalGate(
			makeGate({ permissions: withPermission('publishWorkflow', 'always_allow') }),
		);

		const result = await server.callTool({
			name: 'publish_workflow',
			arguments: { workflowId: 'wf-1' },
		});

		expect(result).toEqual(OK_RESULT);
		expect(tool.call).toHaveBeenCalledWith({ workflowId: 'wf-1' });
	});

	it('asks for confirmation when the permission requires approval', async () => {
		const tool = makeTool('publish_workflow');
		const server = new N8nMcpLocalServer([tool], mock<Logger>());
		server.setApprovalGate(makeGate());

		const result = await server.callTool({
			name: 'publish_workflow',
			arguments: { workflowId: 'wf-1' },
		});

		expect(result.isError).toBe(true);
		const text = textOf(result);
		expect(text.startsWith(GATEWAY_CONFIRMATION_REQUIRED_PREFIX)).toBe(true);
		expect(JSON.parse(text.slice(GATEWAY_CONFIRMATION_REQUIRED_PREFIX.length))).toEqual({
			toolGroup: 'n8n-mcp',
			resource: 'publish_workflow',
			description: '{"workflowId":"wf-1"}',
			options: ['denyOnce', 'allowOnce', 'allowForSession'],
		});
		expect(tool.call).not.toHaveBeenCalled();
	});

	it('runs once after allowOnce and does not pass the confirmation to the tool', async () => {
		const tool = makeTool('publish_workflow');
		const gate = makeGate();
		const server = new N8nMcpLocalServer([tool], mock<Logger>());
		server.setApprovalGate(gate);

		const result = await server.callTool({
			name: 'publish_workflow',
			arguments: { workflowId: 'wf-1', _confirmation: 'allowOnce' },
		});

		expect(result).toEqual(OK_RESULT);
		expect(tool.call).toHaveBeenCalledWith({ workflowId: 'wf-1' });
		expect(gate.grantSessionToolApproval).not.toHaveBeenCalled();
	});

	it('saves a thread grant after allowForSession', async () => {
		const tool = makeTool('publish_workflow');
		const gate = makeGate();
		const server = new N8nMcpLocalServer([tool], mock<Logger>());
		server.setApprovalGate(gate);

		await server.callTool({
			name: 'publish_workflow',
			arguments: { workflowId: 'wf-1', _confirmation: 'allowForSession' },
		});

		expect(gate.grantSessionToolApproval).toHaveBeenCalledWith(
			n8nMcpSessionGrantKey('publish_workflow'),
		);
		expect(tool.call).toHaveBeenCalledWith({ workflowId: 'wf-1' });
	});

	it('runs without confirmation when the thread already granted the tool', async () => {
		const tool = makeTool('publish_workflow');
		const server = new N8nMcpLocalServer([tool], mock<Logger>());
		server.setApprovalGate(
			makeGate({
				sessionApprovedToolKeys: new Set([n8nMcpSessionGrantKey('publish_workflow')]),
			}),
		);

		const result = await server.callTool({
			name: 'publish_workflow',
			arguments: { workflowId: 'wf-1' },
		});

		expect(result).toEqual(OK_RESULT);
	});

	it('denies the call when the user chose denyOnce', async () => {
		const tool = makeTool('publish_workflow');
		const server = new N8nMcpLocalServer([tool], mock<Logger>());
		server.setApprovalGate(makeGate());

		const result = await server.callTool({
			name: 'publish_workflow',
			arguments: { workflowId: 'wf-1', _confirmation: 'denyOnce' },
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toBe('Access denied by user');
		expect(tool.call).not.toHaveBeenCalled();
	});

	it('reports a request for client input as an error', async () => {
		const tool = makeTool(
			'search_workflows',
			vi.fn(
				async () =>
					({ resultType: 'input_required', inputRequests: {} }) as unknown as Awaited<
						ReturnType<InProcessMcpTool['call']>
					>,
			),
		);
		const server = new N8nMcpLocalServer([tool], mock<Logger>());

		const result = await server.callTool({ name: 'search_workflows', arguments: {} });

		expect(result.isError).toBe(true);
	});

	it('reports a thrown error as an error result', async () => {
		const tool = makeTool(
			'search_workflows',
			vi.fn(async () => {
				throw new Error('database unavailable');
			}),
		);
		const server = new N8nMcpLocalServer([tool], mock<Logger>());

		const result = await server.callTool({ name: 'search_workflows', arguments: {} });

		expect(result).toEqual({
			content: [{ type: 'text', text: 'database unavailable' }],
			isError: true,
		});
	});

	it('builds workflows only when every build tool is present', () => {
		const buildTools = N8N_MCP_BUILD_TOOLS.map((name) => makeTool(name));

		expect(new N8nMcpLocalServer(buildTools, mock<Logger>()).canBuildWorkflows()).toBe(true);
		expect(new N8nMcpLocalServer(buildTools.slice(1), mock<Logger>()).canBuildWorkflows()).toBe(
			false,
		);
	});

	it('reports the workflow that a write tool created', async () => {
		const tool = makeTool(
			'create_workflow_from_code',
			vi.fn(async () => ({ ...OK_RESULT, structuredContent: { workflowId: 'wf-new' } })),
		);
		const onArtifactChanged = vi.fn();
		const server = new N8nMcpLocalServer([tool], mock<Logger>());
		server.setApprovalGate(
			makeGate({
				permissions: withPermission('createWorkflow', 'always_allow'),
				onArtifactChanged,
			}),
		);

		await server.callTool({ name: 'create_workflow_from_code', arguments: { code: '' } });

		expect(onArtifactChanged).toHaveBeenCalledWith({ type: 'workflow', id: 'wf-new' });
	});

	it('does not report an artifact when the write tool fails', async () => {
		const tool = makeTool(
			'publish_workflow',
			vi.fn(async () => ({ ...OK_RESULT, isError: true })),
		);
		const onArtifactChanged = vi.fn();
		const server = new N8nMcpLocalServer([tool], mock<Logger>());
		server.setApprovalGate(
			makeGate({
				permissions: withPermission('publishWorkflow', 'always_allow'),
				onArtifactChanged,
			}),
		);

		await server.callTool({ name: 'publish_workflow', arguments: { workflowId: 'wf-1' } });

		expect(onArtifactChanged).not.toHaveBeenCalled();
	});
});
