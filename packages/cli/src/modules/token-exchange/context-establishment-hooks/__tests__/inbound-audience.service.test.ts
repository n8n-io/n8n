import type { INode, Workflow } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type {
	ProtectedResource,
	ProtectedResourceRegistry,
} from '@/services/protected-resource.registry';

import { InboundAudienceService } from '../inbound-audience.service';

describe('InboundAudienceService', () => {
	let registry: Mocked<ProtectedResourceRegistry>;
	let service: InboundAudienceService;

	const workflow = mock<Workflow>({ id: 'wf-1' });
	const triggerNode = mock<INode>({ name: 'Webhook' });

	beforeEach(() => {
		registry = {
			getByWorkflowNode: vi.fn(),
		} as unknown as Mocked<ProtectedResourceRegistry>;
		service = new InboundAudienceService(registry);
	});

	it('returns the resolved resource audiences when a resource is found', async () => {
		const resource = mock<ProtectedResource>({
			getAudiences: () => [
				'https://n8n.example.com/webhook/abc',
				'https://n8n.example.com/webhook/abc?method=GET',
			],
		});
		registry.getByWorkflowNode.mockResolvedValue(resource);

		const result = await service.getExpectedAudiences(workflow, triggerNode);

		expect(result).toEqual({
			audiences: [
				'https://n8n.example.com/webhook/abc',
				'https://n8n.example.com/webhook/abc?method=GET',
			],
		});
		expect(registry.getByWorkflowNode).toHaveBeenCalledWith(workflow, triggerNode);
	});

	it('fails closed with resource_not_found when no resource resolves', async () => {
		registry.getByWorkflowNode.mockResolvedValue(undefined);

		const result = await service.getExpectedAudiences(workflow, triggerNode);

		expect(result).toEqual({ reason: 'resource_not_found' });
	});
});
