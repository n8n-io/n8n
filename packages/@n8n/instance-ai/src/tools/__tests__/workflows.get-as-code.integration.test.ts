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
					slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
				},
			},
		],
		connections: {},
	};
}

function makeContext(workflow: WorkflowJSON): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.threadId = undefined;
	context.threadMemory = undefined;
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
		const context = makeContext(makeManagedWorkflow());
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
		expect(result.code).toContain("newCredential('n8n credits')");
		expect(result.code).not.toContain("newCredential('n8n credits',");
		await expect(getWorkflowSourceFileBinding(context, filePath)).resolves.toMatchObject({
			workflowVersionId: 'v-current',
			workflowChecksum: 'checksum-current',
		});
	});
});
