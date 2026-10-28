import { buildAlwaysAllowKey } from '../alwaysAllow';

describe('buildAlwaysAllowKey', () => {
	describe('workflow runs', () => {
		it('scopes a run to its workflow', () => {
			expect(
				buildAlwaysAllowKey('workflow_builder_executions', { action: 'run', workflowId: 'wf-1' }),
			).toBe('executions:run:wf-1');
		});

		it('takes the workflow of the confirmation when the run has none', () => {
			expect(buildAlwaysAllowKey('workflow_builder_executions', { action: 'run' }, 'wf-2')).toBe(
				'executions:run:wf-2',
			);
		});

		it('refuses a key for a run without a workflow', () => {
			expect(buildAlwaysAllowKey('workflow_builder_executions', { action: 'run' })).toBeNull();
			expect(
				buildAlwaysAllowKey('workflow_builder_executions', { action: 'run', workflowId: '' }),
			).toBeNull();
		});

		it('scopes a step run to its workflow and node', () => {
			expect(
				buildAlwaysAllowKey('workflow_builder_executions', {
					action: 'run-step',
					workflowId: 'wf-1',
					nodeName: 'HTTP Request',
				}),
			).toBe('executions:run-step:wf-1:HTTP Request');
		});

		it('refuses a key for a step run without a workflow or a node', () => {
			expect(
				buildAlwaysAllowKey('workflow_builder_executions', {
					action: 'run-step',
					nodeName: 'HTTP Request',
				}),
			).toBeNull();
			expect(
				buildAlwaysAllowKey('workflow_builder_executions', {
					action: 'run-step',
					workflowId: 'wf-1',
				}),
			).toBeNull();
		});
	});

	describe('workflow edits', () => {
		it('scopes an update and a build to the workflow', () => {
			expect(
				buildAlwaysAllowKey('workflow_builder_workflows', { action: 'update', workflowId: 'wf-1' }),
			).toBe('workflows:update:wf-1');
			expect(buildAlwaysAllowKey('workflow_builder_build_workflow', {}, 'wf-3')).toBe(
				'workflows:update:wf-3',
			);
		});

		it('refuses a key for an edit without a workflow', () => {
			expect(buildAlwaysAllowKey('workflow_builder_workflows', { action: 'update' })).toBeNull();
			expect(buildAlwaysAllowKey('workflow_builder_build_workflow', {})).toBeNull();
		});

		it('reads a legacy tool name as its current name', () => {
			expect(buildAlwaysAllowKey('workflows', { action: 'update', workflowId: 'wf-1' })).toBe(
				'workflows:update:wf-1',
			);
		});
	});

	describe('node execution', () => {
		it('scopes an execution to the node type, resource and operation', () => {
			expect(
				buildAlwaysAllowKey('workflow_builder_nodes', {
					action: 'execute',
					type: 'n8n-nodes-base.slack',
					config: { parameters: { resource: 'message', operation: 'post' } },
				}),
			).toBe('nodes:execute:n8n-nodes-base.slack:message:post');
		});

		it('refuses a key for an execution without a node type', () => {
			expect(buildAlwaysAllowKey('workflow_builder_nodes', { action: 'execute' })).toBeNull();
		});
	});

	it('scopes data table actions to the action', () => {
		expect(buildAlwaysAllowKey('data_tables', { action: 'insert-rows' })).toBe(
			'data-tables:insert-rows',
		);
	});

	it('falls back to the tool and the action for other tools', () => {
		expect(buildAlwaysAllowKey('workflow_builder_workflows', { action: 'publish' })).toBe(
			'workflow_builder_workflows:publish',
		);
	});
});
