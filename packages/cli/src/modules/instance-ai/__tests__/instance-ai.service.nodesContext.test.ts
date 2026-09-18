import type { InstanceAiNodesAttachment, InstanceAiWorkflowAttachment } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { Mock } from 'vitest';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

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

describe('InstanceAiService — resource attachment capability gating', () => {
	type GatedService = {
		canvasNodeContextFlagGate: { isEnabled: Mock };
		assertResourceAttachmentCapabilities: (
			attachments: Array<InstanceAiNodesAttachment | InstanceAiWorkflowAttachment> | undefined,
			user: User,
		) => Promise<void>;
	};

	function createService(isEnabled: Mock): GatedService {
		const service = Object.create(InstanceAiService.prototype) as GatedService;
		service.canvasNodeContextFlagGate = { isEnabled };
		return service;
	}

	const user = { id: 'user-1' } as User;

	it('accepts a nodes attachment when the flag is on', async () => {
		const service = createService(vi.fn().mockResolvedValue(true));

		await expect(
			service.assertResourceAttachmentCapabilities([nodesAttachment()], user),
		).resolves.toBeUndefined();
	});

	it('rejects a nodes attachment when the flag is off', async () => {
		const service = createService(vi.fn().mockResolvedValue(false));

		await expect(
			service.assertResourceAttachmentCapabilities([nodesAttachment()], user),
		).rejects.toBeInstanceOf(BadRequestError);
	});

	it('never asks the gate when there are no nodes attachments', async () => {
		const isEnabled = vi.fn().mockResolvedValue(true);
		const service = createService(isEnabled);
		const workflowAttachment: InstanceAiWorkflowAttachment = { type: 'workflow', id: 'wf-1' };

		await expect(
			service.assertResourceAttachmentCapabilities([workflowAttachment], user),
		).resolves.toBeUndefined();
		expect(isEnabled).not.toHaveBeenCalled();
	});

	it('accepts a workflow attachment alongside an enabled nodes attachment', async () => {
		const service = createService(vi.fn().mockResolvedValue(true));
		const workflowAttachment: InstanceAiWorkflowAttachment = { type: 'workflow', id: 'wf-1' };

		await expect(
			service.assertResourceAttachmentCapabilities([workflowAttachment, nodesAttachment()], user),
		).resolves.toBeUndefined();
	});
});
