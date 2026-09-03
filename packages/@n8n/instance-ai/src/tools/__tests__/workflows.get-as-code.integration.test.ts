import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
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
		const tool = createWorkflowsTool(context, 'full');

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
});
