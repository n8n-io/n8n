import { getArtifactTabChange } from '../artifact-tab-change';

describe('getArtifactTabChange', () => {
	it('returns the workflow of a successful build', () => {
		expect(
			getArtifactTabChange(
				'build-workflow',
				{},
				{ success: true, workflowId: 'wf-1', workflowName: 'Sync' },
			),
		).toEqual({ type: 'workflow', id: 'wf-1', name: 'Sync' });
		expect(
			getArtifactTabChange('submit-workflow', {}, { success: true, workflowId: 'wf-2' }),
		).toEqual({ type: 'workflow', id: 'wf-2' });
	});

	it('ignores a failed build', () => {
		expect(
			getArtifactTabChange('build-workflow', {}, { success: false, workflowId: 'wf-1' }),
		).toBeUndefined();
	});

	it('returns the workflow of a workflows action that changes it, and ignores reads', () => {
		expect(
			getArtifactTabChange(
				'workflows',
				{ action: 'update', workflowId: 'wf-1' },
				{ success: true },
			),
		).toEqual({ type: 'workflow', id: 'wf-1' });
		expect(
			getArtifactTabChange('workflows', { action: 'get', workflowId: 'wf-1' }, { success: true }),
		).toBeUndefined();
	});

	it('returns the data table that a data-tables action created or worked on', () => {
		expect(
			getArtifactTabChange(
				'data-tables',
				{ action: 'create' },
				{ table: { id: 'dt-1', name: 'Leads', projectId: 'p-1' } },
			),
		).toEqual({ type: 'data-table', id: 'dt-1', name: 'Leads', projectId: 'p-1' });
		expect(
			getArtifactTabChange(
				'data-tables',
				{ action: 'insert-rows', dataTableId: 'dt-1' },
				{ insertedCount: 2 },
			),
		).toEqual({ type: 'data-table', id: 'dt-1' });
		expect(
			getArtifactTabChange(
				'data-tables',
				{ action: 'delete', dataTableId: 'dt-1' },
				{ success: true },
			),
		).toBeUndefined();
	});

	it('returns the agent that build-agent created or updated', () => {
		expect(
			getArtifactTabChange(
				'build-agent',
				{},
				{ ok: true, agentChange: 'updated', agentId: 'agent-1', agentName: 'Helper' },
			),
		).toEqual({ type: 'agent', id: 'agent-1', name: 'Helper' });
		expect(
			getArtifactTabChange(
				'build-agent',
				{},
				{ ok: true, agentChange: 'none', agentId: 'agent-1' },
			),
		).toBeUndefined();
	});

	it('ignores other tools and results that are not objects', () => {
		expect(getArtifactTabChange('executions', {}, { success: true })).toBeUndefined();
		expect(getArtifactTabChange('build-workflow', {}, 'done')).toBeUndefined();
	});
});
