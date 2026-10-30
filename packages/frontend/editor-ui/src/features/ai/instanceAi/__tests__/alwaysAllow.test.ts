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

	describe('split execution tools', () => {
		it('maps run_workflow and run_workflow_step to the same keys as the former tool', () => {
			expect(buildAlwaysAllowKey('run_workflow', { workflowId: 'wf-1' })).toBe(
				'executions:run:wf-1',
			);
			expect(buildAlwaysAllowKey('run_workflow', {})).toBeNull();
			expect(
				buildAlwaysAllowKey('run_workflow_step', {
					workflowId: 'wf-1',
					nodeName: 'HTTP Request',
				}),
			).toBe('executions:run-step:wf-1:HTTP Request');
			expect(buildAlwaysAllowKey('run_workflow_step', { workflowId: 'wf-1' })).toBeNull();
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

	it('uses the same action grant key for split data table tools', () => {
		expect(buildAlwaysAllowKey('insert_data_table_rows', {})).toBe('data-tables:insert-rows');
		expect(buildAlwaysAllowKey('delete_data_table', {})).toBe('data-tables:delete');
		expect(buildAlwaysAllowKey('rename_data_table_column', {})).toBe('data-tables:rename-column');
	});

	it('falls back to the tool and the action for other tools', () => {
		expect(buildAlwaysAllowKey('skills', { action: 'create' })).toBe('skills:create');
	});

	it.each(['delete', 'unarchive', 'publish', 'unpublish', 'restore-version', 'update-version'])(
		'matches the backend per-workflow grant for the workflows %s action',
		(action) => {
			expect(
				buildAlwaysAllowKey('workflow_builder_workflows', { action, workflowId: 'wf-1' }),
			).toBe(`workflows:${action}:wf-1`);
		},
	);

	it.each([
		['archive_workflow', 'delete'],
		['unarchive_workflow', 'unarchive'],
		['publish_workflow', 'publish'],
		['unpublish_workflow', 'unpublish'],
		['restore_workflow_version', 'restore-version'],
		['update_workflow_version', 'update-version'],
	])('matches the backend per-workflow grant for the %s tool', (toolName, action) => {
		expect(buildAlwaysAllowKey(toolName, { workflowId: 'wf-1' })).toBe(`workflows:${action}:wf-1`);
		expect(buildAlwaysAllowKey(toolName, {}, 'wf-2')).toBe(`workflows:${action}:wf-2`);
	});

	it('stores no key for a workflow tool call without a workflow', () => {
		expect(buildAlwaysAllowKey('archive_workflow', {})).toBeNull();
	});

	it('takes the workflow from the confirmation when the arguments have none', () => {
		expect(buildAlwaysAllowKey('workflow_builder_workflows', { action: 'publish' }, 'wf-2')).toBe(
			'workflows:publish:wf-2',
		);
	});

	it('stores no key for a workflow action without a workflow', () => {
		expect(buildAlwaysAllowKey('workflow_builder_workflows', { action: 'publish' })).toBeNull();
	});

	it('matches the backend grant for a workspace action', () => {
		expect(buildAlwaysAllowKey('workspace', { action: 'tag-workflow' })).toBe(
			'workspace:tag-workflow',
		);
	});

	it('matches the backend per-workflow grant for a test execution cleanup', () => {
		expect(
			buildAlwaysAllowKey('workspace', { action: 'cleanup-test-executions', workflowId: 'wf-1' }),
		).toBe('workspace:cleanup-test-executions:wf-1');
	});

	it('stores no key for a test execution cleanup without a workflow', () => {
		expect(buildAlwaysAllowKey('workspace', { action: 'cleanup-test-executions' })).toBeNull();
	});

	it('gives split workspace tools the same grant keys as the former tool', () => {
		expect(buildAlwaysAllowKey('tag_workflow', {})).toBe('workspace:tag-workflow');
		expect(buildAlwaysAllowKey('move_workflow_to_folder', {})).toBe(
			'workspace:move-workflow-to-folder',
		);
		expect(buildAlwaysAllowKey('cleanup_test_executions', { workflowId: 'wf-1' })).toBe(
			'workspace:cleanup-test-executions:wf-1',
		);
		expect(buildAlwaysAllowKey('cleanup_test_executions', {})).toBeNull();
	});

	it.each([
		['create_folder', 'create-folder'],
		['delete_folder', 'delete-folder'],
		['move_workflow_to_folder', 'move-workflow-to-folder'],
	])('gives %s the same grant key as workspace(action=%s)', (toolName, action) => {
		const legacyKey = buildAlwaysAllowKey('workspace', { action });
		expect(legacyKey).toBe(`workspace:${action}`);
		expect(buildAlwaysAllowKey(toolName, {})).toBe(legacyKey);
	});
});
