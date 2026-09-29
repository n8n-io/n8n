import type { WorkflowPublishedVersionRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowScheduledJobOwner } from '../workflow-scheduled-job-owner';

const WORKFLOW_ID = 'wf-1';
const NODE_ID = 'node-1';

describe('WorkflowScheduledJobOwner', () => {
	const publishedVersions = mock<WorkflowPublishedVersionRepository>();

	const makeOwner = () => new WorkflowScheduledJobOwner(publishedVersions);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('names a trigger node as an owner member and the workflow as an owner', () => {
		const owner = makeOwner();

		expect(owner.member(WORKFLOW_ID, NODE_ID)).toEqual({
			ownerType: 'workflow',
			ownerId: WORKFLOW_ID,
			ownerMemberId: NODE_ID,
		});
		expect(owner.ref(WORKFLOW_ID)).toEqual({ ownerType: 'workflow', ownerId: WORKFLOW_ID });
	});

	describe('findExisting', () => {
		it('reports only the workflows that still have a published version', async () => {
			// No published version, no owner.
			publishedVersions.findPublishedWorkflowIds.mockResolvedValue(new Set([WORKFLOW_ID]));

			const existing = await makeOwner().findExisting([WORKFLOW_ID, 'wf-unpublished']);

			expect(publishedVersions.findPublishedWorkflowIds).toHaveBeenCalledWith([
				WORKFLOW_ID,
				'wf-unpublished',
			]);
			expect(existing).toEqual(new Set([WORKFLOW_ID]));
		});

		it('propagates a lookup failure instead of reporting the workflows gone', async () => {
			publishedVersions.findPublishedWorkflowIds.mockRejectedValue(new Error('db down'));

			await expect(makeOwner().findExisting([WORKFLOW_ID])).rejects.toThrow('db down');
		});
	});
});
