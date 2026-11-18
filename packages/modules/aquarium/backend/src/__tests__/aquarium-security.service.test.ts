import type { WorkflowSharingService } from '@n8n/backend-services';
import type { User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AquariumSecurityService } from '../aquarium-security.service';

const user = mock<User>({ id: 'user-1' });

function storedWorkflow(id: string, nodeType: string) {
	return mock<WorkflowEntity>({
		id,
		activeVersionId: 'v1',
		connections: {},
		nodes: [
			{
				id: 'n1',
				name: 'Node',
				type: nodeType,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
	});
}

describe('AquariumSecurityService', () => {
	let sharing: ReturnType<typeof mock<WorkflowSharingService>>;
	let workflows: ReturnType<typeof mock<WorkflowRepository>>;
	let service: AquariumSecurityService;

	beforeEach(() => {
		sharing = mock<WorkflowSharingService>();
		workflows = mock<WorkflowRepository>();
		service = new AquariumSecurityService(sharing, workflows);
	});

	it('checks only the workflows that the user can read', async () => {
		sharing.getSharedWorkflowIds.mockResolvedValue(['w1', 'w2']);
		workflows.findByIds.mockResolvedValue([]);

		await service.getSecurity(user);

		expect(sharing.getSharedWorkflowIds).toHaveBeenCalledWith(user, { scopes: ['workflow:read'] });
		expect(workflows.findByIds).toHaveBeenCalledWith(['w1', 'w2'], {
			fields: ['nodes', 'connections', 'activeVersionId'],
		});
	});

	it('returns only the workflows with risks', async () => {
		sharing.getSharedWorkflowIds.mockResolvedValue(['risky', 'safe']);
		workflows.findByIds.mockResolvedValue([
			storedWorkflow('risky', 'n8n-nodes-base.executeCommand'),
			storedWorkflow('safe', 'n8n-nodes-base.set'),
		]);

		const security = await service.getSecurity(user);

		expect(security).toEqual({ workflows: [{ workflowId: 'risky', risks: ['shellAccess'] }] });
	});

	it('does not query workflows when the user can read none', async () => {
		sharing.getSharedWorkflowIds.mockResolvedValue([]);

		expect(await service.getSecurity(user)).toEqual({ workflows: [] });
		expect(workflows.findByIds).not.toHaveBeenCalled();
	});
});
