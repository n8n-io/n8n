import type {
	InstanceAiNodesAttachment,
	InstanceAiResourceAttachment,
	InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { Mock } from 'vitest';

import { buildContextResourcesBlock, InstanceAiService } from '../instance-ai.service';

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

describe('buildContextResourcesBlock — nodes attachment', () => {
	it('renders a single loose node without chain/neighbor/group wording', () => {
		const block = buildContextResourcesBlock([nodesAttachment()]);

		expect(block).toContain('HTTP Request');
		expect(block).toContain('wf-1');
		expect(block).not.toContain('chain');
		expect(block).not.toContain('preceded by');
		expect(block).not.toContain('followed by');
		expect(block).not.toContain('canvas group');
	});

	it('renders a chain with input, output, and canvas group', () => {
		const block = buildContextResourcesBlock([
			nodesAttachment({
				sets: [
					{
						nodes: [
							{ id: 'n1', name: 'HTTP Request' },
							{ id: 'n2', name: 'Set' },
							{ id: 'n3', name: 'IF' },
						],
						inputNode: { id: 'n0', name: 'Webhook' },
						outputNode: { id: 'n4', name: 'Slack' },
						canvasGroupId: 'g1',
						canvasGroupName: 'My Group 1',
					},
				],
			}),
		]);

		expect(block).toContain('HTTP Request');
		expect(block).toContain('Set');
		expect(block).toContain('IF');
		expect(block).toContain('Webhook');
		expect(block).toContain('Slack');
		expect(block).toContain('My Group 1');
	});

	it('renders two sets without leaking fields between them', () => {
		const block = buildContextResourcesBlock([
			nodesAttachment({
				sets: [
					{ nodes: [{ id: 'n1', name: 'Loose Node' }] },
					{
						nodes: [
							{ id: 'n2', name: 'Chain A' },
							{ id: 'n3', name: 'Chain B' },
						],
						inputNode: { id: 'n0', name: 'Chain Input' },
					},
				],
			}),
		]);

		expect(block).toContain('Loose Node');
		expect(block).toContain('Chain A');
		expect(block).toContain('Chain B');
		expect(block).toContain('Chain Input');
		// Skip the raw JSON dump line (everything on one line) and inspect only
		// the prose, so the loose set's line isn't found via the JSON blob's
		// unrelated "Chain Input" substring.
		const prose = block.split('\n\n').slice(1).join('\n\n');
		const looseLine = prose.split('\n').find((line) => line.includes('Loose Node'));
		expect(looseLine).not.toContain('Chain Input');
	});

	it('renders a nodes attachment alongside a workflow attachment without clobbering either', () => {
		const workflowAttachment: InstanceAiWorkflowAttachment = {
			type: 'workflow',
			id: 'wf-2',
			name: 'My Workflow',
		};
		const attachments: InstanceAiResourceAttachment[] = [workflowAttachment, nodesAttachment()];

		const block = buildContextResourcesBlock(attachments);

		expect(block).toContain('My Workflow');
		expect(block).toContain('HTTP Request');
	});
});

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
		const nodes = nodesAttachment();

		const result = await service.resolveContextAttachments([workflowAttachment, nodes], user);

		expect(result).toEqual([workflowAttachment, nodes]);
	});
});
