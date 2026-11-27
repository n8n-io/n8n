import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../__tests__/tool-test-utils';
import { readPendingApproval, routeApproval } from '../../approval-review/pending-approval';
import type { InstanceAiAgentArchiveService } from '../../types';
import { createArchiveAgentTool } from '../archive-agent.tool';

function setup() {
	const service = mock<InstanceAiAgentArchiveService>();
	service.preview.mockResolvedValue({ name: 'Support Agent' });
	service.archive.mockResolvedValue({ name: 'Support Agent' });
	const tool = createArchiveAgentTool(service);
	return { service, tool };
}

const input = { agentId: 'agent-1' };

describe('archive_agent', () => {
	it('names the target in a destructive confirmation that always requires approval', async () => {
		const { service, tool } = setup();
		const suspend = vi.fn();
		await executeTool(tool, input, { suspend });

		expect(service.preview).toHaveBeenCalledExactlyOnceWith(input.agentId);
		expect(service.archive).not.toHaveBeenCalled();
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				resourceName: 'Support Agent',
				severity: 'destructive',
				approvalDetails: { action: 'archive-agent', name: 'Support Agent', id: 'agent-1' },
			}),
		);
		const approval = readPendingApproval(tool, input, suspend.mock.calls[0][0]);
		expect(approval?.approvalDetails).toMatchObject({ action: 'archive-agent' });
		if (!approval) throw new Error('Expected an approval request');
		expect(routeApproval(approval)).toBe('always-ask');
	});

	it('does not suspend or mutate when target validation fails', async () => {
		const { service, tool } = setup();
		service.preview.mockRejectedValue(new Error('Agent not found'));
		const suspend = vi.fn();
		await expect(executeTool(tool, input, { suspend })).rejects.toThrow('Agent not found');
		expect(suspend).not.toHaveBeenCalled();
		expect(service.archive).not.toHaveBeenCalled();
	});

	it('does not mutate on denial', async () => {
		const { service, tool } = setup();
		await expect(
			executeTool(tool, input, { resumeData: { approved: false } }),
		).resolves.toMatchObject({
			success: false,
			denied: true,
		});
		expect(service.archive).not.toHaveBeenCalled();
	});

	it('archives the confirmed Agent on approval', async () => {
		const { service, tool } = setup();
		await expect(executeTool(tool, input, { resumeData: { approved: true } })).resolves.toEqual({
			success: true,
			agentId: 'agent-1',
			name: 'Support Agent',
		});
		expect(service.archive).toHaveBeenCalledExactlyOnceWith(input.agentId);
	});
});
