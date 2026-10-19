import { groupRequirementUsage } from '../requirement-source';

describe('groupRequirementUsage', () => {
	it('keeps distinct consumers in encounter order within each requirement', () => {
		const grouped = groupRequirementUsage(
			[
				{ resourceId: '2', workflowId: 'shared' },
				{ resourceId: '1', workflowId: 'other' },
				{ resourceId: '2', agentId: 'shared', projectId: 'project-1' },
				{ resourceId: '2', workflowId: 'shared' },
				{ resourceId: '2', agentId: 'shared', projectId: 'project-1' },
				{ resourceId: '2', workflowId: 'other' },
			],
			({ resourceId }) => resourceId,
		);

		expect([...grouped]).toEqual([
			[
				'2',
				{
					usedBy: [
						{ kind: 'workflow', id: 'shared' },
						{ kind: 'agent', id: 'shared' },
						{ kind: 'workflow', id: 'other' },
					],
				},
			],
			['1', { usedBy: [{ kind: 'workflow', id: 'other' }] }],
		]);
	});
});
