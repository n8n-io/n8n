import type {
	InstanceAiAgentAttachment,
	InstanceAiNodesAttachment,
	InstanceAiResourceAttachment,
	InstanceAiWorkflowAttachment,
} from '@n8n/api-types';

import { InstanceAiService } from '../instance-ai.service';

function nodesAttachment(
	overrides: Partial<InstanceAiNodesAttachment> = {},
): InstanceAiNodesAttachment {
	return {
		type: 'nodes',
		workflowId: 'wf-1',
		sets: [{ nodes: [{ id: 'n1', name: 'HTTP Request' }] }],
		...overrides,
	};
}

describe('InstanceAiService — resolveContextAttachments gating', () => {
	type GatedService = {
		resolveContextAttachments: (
			attachments: InstanceAiResourceAttachment[] | undefined,
			nodeContextEnabled: boolean,
		) => InstanceAiResourceAttachment[];
	};

	function createService(): GatedService {
		return Object.create(InstanceAiService.prototype) as GatedService;
	}

	it('includes the nodes attachment when the flag is on', () => {
		const service = createService();

		const result = service.resolveContextAttachments([nodesAttachment()], true);

		expect(result).toEqual([nodesAttachment()]);
	});

	it('drops the nodes attachment when the flag is off, without throwing', () => {
		const service = createService();

		const result = service.resolveContextAttachments([nodesAttachment()], false);

		expect(result).toEqual([]);
	});

	it('keeps workflow and agent attachments when node context is off', () => {
		const service = createService();
		const workflowAttachment: InstanceAiWorkflowAttachment = { type: 'workflow', id: 'wf-1' };
		const agentAttachment: InstanceAiAgentAttachment = {
			type: 'agent',
			id: 'agent-1',
			projectId: 'project-1',
		};

		const result = service.resolveContextAttachments([workflowAttachment, agentAttachment], false);

		expect(result).toEqual([workflowAttachment, agentAttachment]);
	});

	it('keeps a workflow attachment alongside an enabled nodes attachment', () => {
		const service = createService();
		const workflowAttachment: InstanceAiWorkflowAttachment = { type: 'workflow', id: 'wf-1' };

		const result = service.resolveContextAttachments([workflowAttachment, nodesAttachment()], true);

		expect(result).toEqual([workflowAttachment, nodesAttachment()]);
	});
});
