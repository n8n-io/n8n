import type {
	InstanceAiNodesAttachment,
	InstanceAiResourceAttachment,
	InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { Mock } from 'vitest';

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
		canvasNodeContextFlagGate: { isEnabled: Mock };
		resolveContextAttachments: (
			attachments: InstanceAiResourceAttachment[] | undefined,
			user: User,
		) => Promise<InstanceAiResourceAttachment[]>;
	};

	function createService(isEnabled: Mock): GatedService {
		const service = Object.create(InstanceAiService.prototype) as GatedService;
		service.canvasNodeContextFlagGate = { isEnabled };
		return service;
	}

	const user = { id: 'user-1' } as User;

	it('includes the nodes attachment when the flag is on', async () => {
		const service = createService(vi.fn().mockResolvedValue(true));

		const result = await service.resolveContextAttachments([nodesAttachment()], user);

		expect(result).toEqual([nodesAttachment()]);
	});

	it('drops the nodes attachment when the flag is off, without throwing', async () => {
		const service = createService(vi.fn().mockResolvedValue(false));

		const result = await service.resolveContextAttachments([nodesAttachment()], user);

		expect(result).toEqual([]);
	});

	it('never asks the gate when there are no nodes attachments', async () => {
		const isEnabled = vi.fn().mockResolvedValue(true);
		const service = createService(isEnabled);
		const workflowAttachment: InstanceAiWorkflowAttachment = { type: 'workflow', id: 'wf-1' };

		const result = await service.resolveContextAttachments([workflowAttachment], user);

		expect(result).toEqual([workflowAttachment]);
		expect(isEnabled).not.toHaveBeenCalled();
	});

	it('keeps a workflow attachment alongside an enabled nodes attachment', async () => {
		const service = createService(vi.fn().mockResolvedValue(true));
		const workflowAttachment: InstanceAiWorkflowAttachment = { type: 'workflow', id: 'wf-1' };

		const result = await service.resolveContextAttachments(
			[workflowAttachment, nodesAttachment()],
			user,
		);

		expect(result).toEqual([workflowAttachment, nodesAttachment()]);
	});
});
