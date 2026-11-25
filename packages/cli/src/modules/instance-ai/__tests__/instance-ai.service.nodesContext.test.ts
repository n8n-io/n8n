import type {
	InstanceAiAgentAttachment,
	InstanceAiElementAttachment,
	InstanceAiFileAttachment,
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

describe('InstanceAiService — resolveContextAttachments', () => {
	type ContextService = {
		resolveContextAttachments: (
			attachments: Array<InstanceAiResourceAttachment | InstanceAiFileAttachment> | undefined,
		) => InstanceAiResourceAttachment[];
	};

	function createService(): ContextService {
		return Object.create(InstanceAiService.prototype) as ContextService;
	}

	it('keeps the nodes attachment', () => {
		const service = createService();

		const result = service.resolveContextAttachments([nodesAttachment()]);

		expect(result).toEqual([nodesAttachment()]);
	});

	it('keeps the resource attachments by kind and drops files', () => {
		const service = createService();
		const workflowAttachment: InstanceAiWorkflowAttachment = { type: 'workflow', id: 'wf-1' };
		const agentAttachment: InstanceAiAgentAttachment = {
			type: 'agent',
			id: 'agent-1',
			projectId: 'project-1',
		};
		const elementAttachment: InstanceAiElementAttachment = {
			type: 'element',
			appId: 'app-1',
			tagName: 'button',
		};
		const fileAttachment: InstanceAiFileAttachment = {
			type: 'file',
			data: 'aGk=',
			mimeType: 'text/plain',
			fileName: 'a.txt',
		};

		const result = service.resolveContextAttachments([
			elementAttachment,
			nodesAttachment(),
			fileAttachment,
			agentAttachment,
			workflowAttachment,
		]);

		expect(result).toEqual([
			workflowAttachment,
			agentAttachment,
			nodesAttachment(),
			elementAttachment,
		]);
	});

	it('returns no attachments without any', () => {
		expect(createService().resolveContextAttachments(undefined)).toEqual([]);
	});
});
