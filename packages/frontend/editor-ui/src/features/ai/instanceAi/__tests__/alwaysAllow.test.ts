import { CHANGE_DATA_TABLES_TOOL_NAME, buildDataTablesSessionGrantKey } from '@n8n/api-types';

import { buildAlwaysAllowKeys } from '../alwaysAllow';

describe('buildAlwaysAllowKeys', () => {
	it('never offers Always allow for publishing an agent, which asks every time', () => {
		expect(buildAlwaysAllowKeys('agent_builder_publish_agent', {})).toEqual([]);
		expect(buildAlwaysAllowKeys('agent_builder_publish_agent', { versionId: 'v-1' })).toEqual([]);
	});

	describe('workflow runs', () => {
		it('scopes a run to its workflow', () => {
			expect(
				buildAlwaysAllowKeys('workflow_builder_executions', { action: 'run', workflowId: 'wf-1' }),
			).toEqual(['executions:run:wf-1']);
		});

		it('takes the workflow of the confirmation when the run has none', () => {
			expect(
				buildAlwaysAllowKeys('workflow_builder_executions', { action: 'run' }, 'wf-2'),
			).toEqual(['executions:run:wf-2']);
		});

		it('refuses a key for a run without a workflow', () => {
			expect(buildAlwaysAllowKeys('workflow_builder_executions', { action: 'run' })).toEqual([]);
			expect(
				buildAlwaysAllowKeys('workflow_builder_executions', { action: 'run', workflowId: '' }),
			).toEqual([]);
		});

		it('scopes a step run to its workflow and node', () => {
			expect(
				buildAlwaysAllowKeys('workflow_builder_executions', {
					action: 'run-step',
					workflowId: 'wf-1',
					nodeName: 'HTTP Request',
				}),
			).toEqual(['executions:run-step:wf-1:HTTP Request']);
		});

		it('refuses a key for a step run without a workflow or a node', () => {
			expect(
				buildAlwaysAllowKeys('workflow_builder_executions', {
					action: 'run-step',
					nodeName: 'HTTP Request',
				}),
			).toEqual([]);
			expect(
				buildAlwaysAllowKeys('workflow_builder_executions', {
					action: 'run-step',
					workflowId: 'wf-1',
				}),
			).toEqual([]);
		});
	});

	describe('split execution tools', () => {
		it('maps run_workflow and run_workflow_step to the same keys as the former tool', () => {
			expect(buildAlwaysAllowKeys('run_workflow', { workflowId: 'wf-1' })).toEqual([
				'executions:run:wf-1',
			]);
			expect(buildAlwaysAllowKeys('run_workflow', {})).toEqual([]);
			expect(
				buildAlwaysAllowKeys('run_workflow_step', {
					workflowId: 'wf-1',
					nodeName: 'HTTP Request',
				}),
			).toEqual(['executions:run-step:wf-1:HTTP Request']);
			expect(buildAlwaysAllowKeys('run_workflow_step', { workflowId: 'wf-1' })).toEqual([]);
		});
	});

	describe('workflow edits', () => {
		it('scopes an update and a build to the workflow', () => {
			expect(
				buildAlwaysAllowKeys('workflow_builder_workflows', {
					action: 'update',
					workflowId: 'wf-1',
				}),
			).toEqual(['workflows:update:wf-1']);
			expect(buildAlwaysAllowKeys('workflow_builder_build_workflow', {}, 'wf-3')).toEqual([
				'workflows:update:wf-3',
			]);
		});

		it('refuses a key for an edit without a workflow', () => {
			expect(buildAlwaysAllowKeys('workflow_builder_workflows', { action: 'update' })).toEqual([]);
			expect(buildAlwaysAllowKeys('workflow_builder_build_workflow', {})).toEqual([]);
		});

		it('reads a legacy tool name as its current name', () => {
			expect(buildAlwaysAllowKeys('workflows', { action: 'update', workflowId: 'wf-1' })).toEqual([
				'workflows:update:wf-1',
			]);
		});
	});

	describe('node execution', () => {
		it('scopes an execution to the node type, resource and operation', () => {
			expect(
				buildAlwaysAllowKeys('workflow_builder_nodes', {
					action: 'execute',
					type: 'n8n-nodes-base.slack',
					config: { parameters: { resource: 'message', operation: 'post' } },
				}),
			).toEqual(['nodes:execute:n8n-nodes-base.slack:message:post']);
		});

		it('refuses a key for an execution without a node type', () => {
			expect(buildAlwaysAllowKeys('workflow_builder_nodes', { action: 'execute' })).toEqual([]);
		});
	});

	it('scopes data table actions to the action', () => {
		expect(buildAlwaysAllowKeys('data_tables', { action: 'insert-rows' })).toEqual([
			'data-tables:insert-rows',
		]);
	});

	it('uses the same action grant key for split data table tools', () => {
		expect(buildAlwaysAllowKeys('insert_data_table_rows', {})).toEqual(['data-tables:insert-rows']);
		expect(buildAlwaysAllowKeys('delete_data_table', {})).toEqual(['data-tables:delete']);
		expect(buildAlwaysAllowKeys('rename_data_table_column', {})).toEqual([
			'data-tables:rename-column',
		]);
	});

	it('falls back to the tool and the action for other tools', () => {
		expect(buildAlwaysAllowKeys('skills', { action: 'create' })).toEqual(['skills:create']);
	});

	it('does not offer a session grant for skill source imports', () => {
		expect(buildAlwaysAllowKeys('skills', { action: 'import-from-source' })).toEqual([]);
	});

	it.each(['unarchive', 'publish', 'restore-version', 'update-version'])(
		'matches the backend per-workflow grant for the workflows %s action',
		(action) => {
			expect(
				buildAlwaysAllowKeys('workflow_builder_workflows', { action, workflowId: 'wf-1' }),
			).toEqual([`workflows:${action}:wf-1`]);
		},
	);

	it.each([
		['unarchive_workflow', 'unarchive'],
		['publish_workflow', 'publish'],
		['restore_workflow_version', 'restore-version'],
		['update_workflow_version', 'update-version'],
	])('matches the backend per-workflow grant for the %s tool', (toolName, action) => {
		expect(buildAlwaysAllowKeys(toolName, { workflowId: 'wf-1' })).toEqual([
			`workflows:${action}:wf-1`,
		]);
		expect(buildAlwaysAllowKeys(toolName, {}, 'wf-2')).toEqual([`workflows:${action}:wf-2`]);
	});

	it.each([
		['archive_workflow', 'delete'],
		['unpublish_workflow', 'unpublish'],
	])('matches the backend grant for every workflow for the %s tool', (toolName, action) => {
		expect(buildAlwaysAllowKeys(toolName, { workflowId: 'wf-1' })).toEqual([`workflows:${action}`]);
		expect(
			buildAlwaysAllowKeys('workflow_builder_workflows', { action, workflowId: 'wf-2' }),
		).toEqual([`workflows:${action}`]);
	});

	it('stores no key for a workflow tool call without a workflow', () => {
		expect(buildAlwaysAllowKeys('archive_workflow', {})).toEqual([]);
	});

	it('takes the workflow from the confirmation when the arguments have none', () => {
		expect(
			buildAlwaysAllowKeys('workflow_builder_workflows', { action: 'publish' }, 'wf-2'),
		).toEqual(['workflows:publish:wf-2']);
	});

	it('stores no key for a workflow action without a workflow', () => {
		expect(buildAlwaysAllowKeys('workflow_builder_workflows', { action: 'publish' })).toEqual([]);
	});

	it('matches the backend grant for a workspace action', () => {
		expect(buildAlwaysAllowKeys('workspace', { action: 'tag-workflow' })).toEqual([
			'workspace:tag-workflow',
		]);
	});

	it('matches the backend per-workflow grant for a test execution cleanup', () => {
		expect(
			buildAlwaysAllowKeys('workspace', { action: 'cleanup-test-executions', workflowId: 'wf-1' }),
		).toEqual(['workspace:cleanup-test-executions:wf-1']);
	});

	it('stores no key for a test execution cleanup without a workflow', () => {
		expect(buildAlwaysAllowKeys('workspace', { action: 'cleanup-test-executions' })).toEqual([]);
	});

	it('gives split workspace tools the same grant keys as the former tool', () => {
		expect(buildAlwaysAllowKeys('tag_workflow', {})).toEqual(['workspace:tag-workflow']);
		expect(buildAlwaysAllowKeys('move_workflow_to_folder', {})).toEqual([
			'workspace:move-workflow-to-folder',
		]);
		expect(buildAlwaysAllowKeys('cleanup_test_executions', { workflowId: 'wf-1' })).toEqual([
			'workspace:cleanup-test-executions:wf-1',
		]);
		expect(buildAlwaysAllowKeys('cleanup_test_executions', {})).toEqual([]);
	});

	it.each([
		['create_folder', 'create-folder'],
		['delete_folder', 'delete-folder'],
		['move_workflow_to_folder', 'move-workflow-to-folder'],
	])('gives %s the same grant key as workspace(action=%s)', (toolName, action) => {
		const legacyKey = buildAlwaysAllowKeys('workspace', { action });
		expect(legacyKey).toEqual([`workspace:${action}`]);
		expect(buildAlwaysAllowKeys(toolName, {})).toEqual(legacyKey);
	});

	describe('batch data table changes', () => {
		it('gives one key for each distinct action that is not destructive', () => {
			expect(
				buildAlwaysAllowKeys(CHANGE_DATA_TABLES_TOOL_NAME, {
					changes: [
						{ action: 'create', name: 'Leads' },
						{ action: 'insert-rows', table: 'Leads' },
						{ action: 'delete-rows', table: 'Leads' },
						{ action: 'insert-rows', table: 'Orders' },
						{ action: 'rename-column', table: 'Orders' },
					],
				}).sort(),
			).toEqual(
				[
					buildDataTablesSessionGrantKey('create'),
					buildDataTablesSessionGrantKey('insert-rows'),
					buildDataTablesSessionGrantKey('rename-column'),
				].sort(),
			);
		});

		it('gives no key when every change is destructive', () => {
			expect(
				buildAlwaysAllowKeys(CHANGE_DATA_TABLES_TOOL_NAME, {
					changes: [
						{ action: 'delete', table: 'Leads' },
						{ action: 'delete-column', table: 'Orders' },
						{ action: 'delete-rows', table: 'Orders' },
					],
				}),
			).toEqual([]);
		});

		it('gives no key for a batch without readable changes', () => {
			expect(buildAlwaysAllowKeys(CHANGE_DATA_TABLES_TOOL_NAME, {})).toEqual([]);
			expect(
				buildAlwaysAllowKeys(CHANGE_DATA_TABLES_TOOL_NAME, { changes: [{ action: 'unknown' }] }),
			).toEqual([]);
		});
	});
});
