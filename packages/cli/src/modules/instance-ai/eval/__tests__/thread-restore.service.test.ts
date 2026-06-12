import type { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { EvalThreadRestoreService } from '../thread-restore.service';

function makeNode(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: 'node-1',
		name: 'Slack',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.2,
		position: [100, 200],
		parameters: { channel: '#cosmic-otter-alerts' },
		...overrides,
	};
}

describe('EvalThreadRestoreService', () => {
	const workflowRepo = mock<WorkflowRepository>();
	const sharedWorkflowRepo = mock<SharedWorkflowRepository>();
	const service = new EvalThreadRestoreService(workflowRepo, sharedWorkflowRepo);

	beforeEach(() => {
		jest.clearAllMocks();
		workflowRepo.create.mockImplementation((entity) => entity as never);
		workflowRepo.existsBy.mockResolvedValue(false);
	});

	it('recreates the workflow pinned to its seeded id and grants project ownership', async () => {
		await service.restoreWorkflows(
			[{ id: 'wf-original', name: 'Daily digest', nodes: [makeNode()], connections: {} }],
			'project-1',
		);

		expect(workflowRepo.save).toHaveBeenCalledTimes(1);
		const saved = workflowRepo.create.mock.calls[0][0];
		expect(saved).toMatchObject({
			id: 'wf-original',
			name: 'Daily digest',
			active: false,
		});
		expect(saved.versionId).toEqual(expect.any(String));
		expect(sharedWorkflowRepo.makeOwner).toHaveBeenCalledWith(['wf-original'], 'project-1');
	});

	it('strips pre-attached node credentials so they cannot bypass the credential pin', async () => {
		const node = makeNode({
			credentials: { slackApi: { id: 'cred-from-source-instance', name: 'Slack' } },
		});

		await service.restoreWorkflows(
			[{ id: 'wf-1', name: 'wf', nodes: [node], connections: {} }],
			'project-1',
		);

		const saved = workflowRepo.create.mock.calls[0][0];
		expect(saved.nodes).toHaveLength(1);
		expect(saved.nodes?.[0]).not.toHaveProperty('credentials');
		expect(saved.nodes?.[0]).toMatchObject({ name: 'Slack', parameters: expect.any(Object) });
	});

	it('does not re-grant ownership when the workflow already exists (idempotent upsert)', async () => {
		workflowRepo.existsBy.mockResolvedValue(true);

		await service.restoreWorkflows(
			[{ id: 'wf-1', name: 'wf', nodes: [makeNode()], connections: {} }],
			'project-1',
		);

		expect(workflowRepo.save).toHaveBeenCalledTimes(1);
		expect(sharedWorkflowRepo.makeOwner).not.toHaveBeenCalled();
	});

	it('rejects a structurally invalid node without writing anything', async () => {
		await expect(
			service.restoreWorkflows(
				[{ id: 'wf-1', name: 'wf', nodes: [{ name: 'no type' }], connections: {} }],
				'project-1',
			),
		).rejects.toThrow(BadRequestError);
		expect(workflowRepo.save).not.toHaveBeenCalled();
	});
});
