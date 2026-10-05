import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import { derivedNodeTypes } from './derived-node-types';
import {
	getWorkflowSourceFileBinding,
	saveWorkflowSourceFileBinding,
} from '../workflows/workflow-file-bindings';
import { createWorkflowsTool } from '../workflows.tool';

interface GetAsCodeResult {
	workflowId: string;
	name: string;
	code: string;
	error?: string;
	filePath?: string;
	nodes?: Array<{ name: string; type: string; line: number; untyped?: string }>;
}

/** A workflow as the node contracts build saves it. */
function makeContractWorkflow(): WorkflowJSON {
	return {
		id: 'wf-managed',
		name: 'Notion done pages report',
		nodes: [
			{
				id: 'n1',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'n2',
				name: 'Get Done Pages',
				type: '@n8n/nodes-base-next.notionDatabasePageGetAll',
				typeVersion: 1,
				position: [224, 0],
				parameters: {
					database: '5b9e2c1d-0a7f-4c3e-9d21-7f6a8b9c0d1e',
					where: {
						match: 'all',
						conditions: [
							{ property: 'Status', type: 'status', condition: { op: 'equals', value: 'Done' } },
						],
					},
					authentication: 'notionApi',
				},
				credentials: { notionApi: { id: 'c1', name: 'Notion account' } },
			},
			{
				id: 'n3',
				name: 'Post Done Page',
				type: '@n8n/nodes-base-next.httpRequestSend',
				typeVersion: 3,
				position: [448, 0],
				parameters: {
					method: 'POST',
					url: 'https://reports.example.com/api/done',
					body: { kind: 'json', json: '={{ ({name:$json.name,url:$json.url}) }}' },
					authentication: 'httpBearerAuth',
				},
			},
		],
		connections: {
			Start: { main: [[{ node: 'Get Done Pages', type: 'main', index: 0 }]] },
			'Get Done Pages': { main: [[{ node: 'Post Done Page', type: 'main', index: 0 }]] },
		},
	};
}

function makeManagedWorkflow(): WorkflowJSON {
	return {
		id: 'wf-managed',
		name: 'Managed credential workflow',
		nodes: [
			{
				id: 'slack-1',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.2,
				position: [0, 0],
				parameters: { channel: '#alerts' },
				credentials: {
					slackApi: { id: null, name: 'Gateway credits', __aiGatewayManaged: true },
				},
			},
		],
		connections: {},
	};
}

function makeContext(workflow: WorkflowJSON, files: Map<string, string>): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.threadId = undefined;
	context.threadMemory = undefined;
	context.logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
	// get-as-code writes the source into the bound workspace file; back it with a map.
	context.workspace = {
		filesystem: {
			readFile: vi.fn(async (path: string) => {
				const content = files.get(path);
				if (content === undefined) throw new Error(`ENOENT ${path}`);
				return await Promise.resolve(content);
			}),
			writeFile: vi.fn(async (path: string, content: string | Buffer) => {
				files.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
				await Promise.resolve();
			}),
		},
	} as unknown as InstanceAiContext['workspace'];
	context.workflowService.getAsWorkflowJSON = vi.fn().mockResolvedValue(workflow);
	context.workflowService.get = vi.fn().mockResolvedValue({
		id: 'wf-managed',
		name: 'Managed credential workflow',
		versionId: 'v-current',
		checksum: 'checksum-current',
		activeVersionId: null,
		isArchived: false,
		createdAt: '2026-08-13T00:00:00.000Z',
		updatedAt: '2026-08-13T00:00:00.000Z',
		nodes: [],
		connections: {},
	});
	return context;
}

describe('workflows get-as-code integration', () => {
	it('returns real TypeScript for a managed credential and refreshes its binding', async () => {
		const files = new Map<string, string>();
		const context = makeContext(makeManagedWorkflow(), files);
		const filePath = 'src/workflows/managed.workflow.ts';
		await saveWorkflowSourceFileBinding(context, {
			filePath,
			workflowId: 'wf-managed',
			workflowVersionId: 'v-stale',
			workflowChecksum: 'checksum-stale',
		});
		const tool = createWorkflowsTool(context);

		const result = await executeTool<GetAsCodeResult>(tool, {
			action: 'get-as-code',
			workflowId: 'wf-managed',
		});

		expect(result.error).toBeUndefined();
		expect(result.code).not.toBe('');
		expect(result.code).toContain("newCredential('Gateway credits')");
		expect(result.code).not.toContain("newCredential('Gateway credits',");
		// The source lands in the file the workflow is already bound to, ready to build.
		expect(files.get(filePath)).toBe(result.code);
		expect(files.get(filePath)).toMatch(/^import \{[^}]+\} from '@n8n\/workflow-sdk';\n/);
		await expect(getWorkflowSourceFileBinding(context, filePath)).resolves.toMatchObject({
			workflowVersionId: 'v-current',
			workflowChecksum: 'checksum-current',
		});
	});

	describe('with node contracts', () => {
		it('returns typed source for a contract workflow and indexes its nodes', async () => {
			const files = new Map<string, string>();
			const context = makeContext(makeContractWorkflow(), files);
			context.nodeContractsEnabled = true;
			const tool = createWorkflowsTool(context);

			const result = await executeTool<GetAsCodeResult>(tool, {
				action: 'get-as-code',
				workflowId: 'wf-managed',
			});

			expect(result.error).toBeUndefined();
			expect(result.code).toMatch(
				/^import \{ workflow, manual \} from '@n8n\/workflow-sdk\/next';\n/,
			);
			expect(result.code).toContain("import { notion } from '@n8n/nodes/notion';");
			expect(result.code).toContain('notion.databasePage.getAll({');
			expect(result.code).toContain('httpRequest.send({');
			expect(result.code).toContain('json: (item) => ({name:item.name,url:item.url}),');
			// The Notion module builds the composed node, so the contract selector value goes there.
			expect(result.code).toContain('authentication: "httpBearerAuth"');
			expect(result.code).not.toContain('notionApi');
			expect(files.get(result.filePath ?? '')).toBe(result.code);
			const lines = result.code.split('\n');
			expect(result.nodes).toHaveLength(3);
			// Each line is the node's call; its name is on that line or the next.
			for (const node of result.nodes ?? []) {
				expect(node.line).toBeGreaterThan(0);
				expect(lines.slice(node.line - 1, node.line + 1).join('\n')).toContain(
					JSON.stringify(node.name),
				);
			}
		});

		it('reads the owned slot of a composed Notion v4 node back as the typed step', async () => {
			const files = new Map<string, string>();
			const workflow = makeContractWorkflow();
			const composed = workflow.nodes.map((node) => {
				if (node.name !== 'Get Done Pages') return node;
				// The legacy selector of Notion v4 has other values than the contract node type.
				const { authentication: _selector, ...parameters } = node.parameters ?? {};
				return {
					...node,
					type: 'n8n-nodes-base.notion',
					typeVersion: 4,
					parameters: { ...parameters, resource: 'databasePage', operation: 'getAll' },
				};
			});
			const context = makeContext({ ...workflow, nodes: composed }, files);
			context.nodeContractsEnabled = true;
			const tool = createWorkflowsTool(context);

			const result = await executeTool<GetAsCodeResult>(tool, {
				action: 'get-as-code',
				workflowId: 'wf-managed',
			});

			expect(result.code).toContain('notion.databasePage.getAll({');
			expect(result.code).not.toContain('n8n-nodes-base.notion');
			expect(result.code).not.toContain('resource');
		});

		it('reads a node of a derived module back as its factory, else keeps node() with a reason', async () => {
			const files = new Map<string, string>();
			const workflow = makeContractWorkflow();
			const mattermost = (name: string, typeVersion: number, id: string) => ({
				id,
				name,
				type: 'n8n-nodes-base.mattermost',
				typeVersion,
				position: [672, 0] as [number, number],
				parameters: {
					resource: 'message',
					operation: 'post',
					channelId: { __rl: true, mode: 'id', value: 'c1' },
					message: '={{ $json.name }}',
				},
			});
			const nodes = [...workflow.nodes, mattermost('Post', 2.3, 'n4'), mattermost('Old', 2, 'n5')];
			const connections = {
				...workflow.connections,
				'Post Done Page': { main: [[{ node: 'Post', type: 'main', index: 0 }]] },
				Post: { main: [[{ node: 'Old', type: 'main', index: 0 }]] },
			};
			const context = makeContext({ ...workflow, nodes, connections }, files);
			context.nodeContractsEnabled = true;
			context.nodeTypesProvider = derivedNodeTypes();
			const tool = createWorkflowsTool(context);

			const result = await executeTool<GetAsCodeResult>(tool, {
				action: 'get-as-code',
				workflowId: 'wf-managed',
			});

			expect(result.code).toContain(
				"import { mattermost } from '@n8n/nodes/n8n-nodes-base/mattermost';",
			);
			expect(result.code).toContain('mattermost.message.post({');
			expect(result.code.match(/__rl/g)).toHaveLength(1);
			expect(result.code).toContain('type: "n8n-nodes-base.mattermost"');
			expect(result.nodes?.find(({ name }) => name === 'Post')).not.toHaveProperty('untyped');
			expect(result.nodes?.find(({ name }) => name === 'Old')?.untyped).toBe(
				'version 2; the derived module types version 2.3',
			);
		});

		it('keeps a contract node with a parameter that its module does not take in node(), with a reason', async () => {
			const files = new Map<string, string>();
			const workflow = makeContractWorkflow();
			const nodes = workflow.nodes.map((node) =>
				node.name === 'Get Done Pages'
					? { ...node, parameters: { ...node.parameters, unfurlLinks: true } }
					: node,
			);
			const context = makeContext({ ...workflow, nodes }, files);
			context.nodeContractsEnabled = true;
			const tool = createWorkflowsTool(context);

			const result = await executeTool<GetAsCodeResult>(tool, {
				action: 'get-as-code',
				workflowId: 'wf-managed',
			});

			expect(result.code).toContain('type: "@n8n/nodes-base-next.notionDatabasePageGetAll"');
			expect(result.code).toContain('unfurlLinks: true');
			expect(result.nodes?.find(({ name }) => name === 'Get Done Pages')?.untyped).toBe(
				'notion.databasePage.getAll does not take "unfurlLinks"',
			);
		});

		it('keeps node settings in the typed source', async () => {
			const files = new Map<string, string>();
			const workflow = makeContractWorkflow();
			const context = makeContext(
				{ ...workflow, nodes: workflow.nodes.map((node) => ({ ...node, retryOnFail: true })) },
				files,
			);
			context.nodeContractsEnabled = true;
			const tool = createWorkflowsTool(context);

			const result = await executeTool<GetAsCodeResult>(tool, {
				action: 'get-as-code',
				workflowId: 'wf-managed',
			});

			expect(result.code).toMatch(/^import \{[^}]+\} from '@n8n\/workflow-sdk\/next';\n/);
			expect(result.code).toContain('notion.databasePage.getAll({');
			expect(result.code.match(/settings: \{\n\s+retryOnFail: true,/g)).toHaveLength(3);
		});

		it('returns SDK code when the typed format cannot express the workflow', async () => {
			const files = new Map<string, string>();
			const workflow = makeContractWorkflow();
			const sticky = {
				id: 'n4',
				name: 'Note',
				type: 'n8n-nodes-base.stickyNote',
				typeVersion: 1,
				position: [0, 200] as [number, number],
				parameters: { content: 'Runs every Monday' },
			};
			const context = makeContext({ ...workflow, nodes: [...workflow.nodes, sticky] }, files);
			context.nodeContractsEnabled = true;
			const tool = createWorkflowsTool(context);

			const result = await executeTool<GetAsCodeResult>(tool, {
				action: 'get-as-code',
				workflowId: 'wf-managed',
			});

			expect(result.error).toBeUndefined();
			expect(result.code).toMatch(/^import \{[^}]+\} from '@n8n\/workflow-sdk';\n/);
		});
	});
});
