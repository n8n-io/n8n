import type { BuiltTool } from '@n8n/agents';
import { sharedCardRule, type InstanceAiConfirmRequest } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import { createCredentialsTool } from '../credentials.tool';
import { createDataTablesTool } from '../data-tables.tool';
import { createExecutionsTool } from '../executions.tool';
import { DOMAIN_TOOL_IDS } from '../tool-ids';
import { createWorkflowsTool } from '../workflows.tool';
import { createWorkspaceTool } from '../workspace.tool';

/**
 * `sharedCardRule` (@n8n/api-types) decides which cards a teammate answers in a shared
 * Assistant chat, from the tool name, the tool input and the card. It keeps its own copy of
 * those names and fields. These tests run the first call of each real tool action until it
 * suspends, so a change to a tool name, an input field or the fields of a card fails here.
 */

const PROJECT_ID = 'project-1';

/** A resource that every lookup of a service returns, so that each tool can name it. */
const RESOURCE = { id: 'res-1', name: 'Invoices', versionId: 'v-1', columns: [], data: [] };

/** A service where every method resolves the same resource. The tools only read names. */
function lookupService(): unknown {
	const methods = new Map<PropertyKey, unknown>();
	return new Proxy(
		{},
		{
			get: (_target, key) => {
				if (key === 'then') return undefined;
				if (!methods.has(key)) methods.set(key, vi.fn().mockResolvedValue(RESOURCE));
				return methods.get(key);
			},
		},
	);
}

function createContext(): InstanceAiContext {
	return {
		userId: 'user-1',
		projectId: PROJECT_ID,
		workflowService: lookupService(),
		executionService: lookupService(),
		credentialService: lookupService(),
		nodeService: lookupService(),
		dataTableService: lookupService(),
		workspaceService: lookupService(),
		logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
		// The default modes ask for approval before every action below.
		permissions: {},
	} as unknown as InstanceAiContext;
}

const TOOLS: Record<string, (context: InstanceAiContext) => BuiltTool> = {
	[DOMAIN_TOOL_IDS.WORKFLOWS]: (context) => createWorkflowsTool(context, 'full'),
	[DOMAIN_TOOL_IDS.EXECUTIONS]: (context) => createExecutionsTool(context),
	[DOMAIN_TOOL_IDS.CREDENTIALS]: (context) => createCredentialsTool(context),
	[DOMAIN_TOOL_IDS.DATA_TABLES]: (context) => createDataTablesTool(context),
	[DOMAIN_TOOL_IDS.WORKSPACE]: (context) => createWorkspaceTool(context),
};

/** The card of the first call of a real tool, as the checkpoint stores it (as JSON). */
async function firstCard(toolId: string, input: Record<string, unknown>) {
	const tool = TOOLS[toolId](createContext());
	const suspend = vi.fn().mockResolvedValue({ suspended: true });
	await executeTool(tool, input, { suspend, resumeData: undefined });
	expect(suspend).toHaveBeenCalledTimes(1);
	const suspendPayload = jsonParse<unknown>(JSON.stringify(suspend.mock.calls[0][0]));
	return { toolName: tool.name, input, suspendPayload };
}

const approve: InstanceAiConfirmRequest = { kind: 'approval', approved: true };

const onWorkflow = (scope: string) => ({
	scopes: [scope],
	target: { type: 'workflow', id: 'wf-1' },
});
const onTable = (scope: string) => ({ scopes: [scope], target: { type: 'dataTable', id: 'dt-1' } });
const onProject = (scope: string) => ({
	scopes: [scope],
	target: { type: 'project', id: PROJECT_ID },
});

const ALL_ROWS = { type: 'and', filters: [] };
const SOME_ROWS = { type: 'and', filters: [{ columnName: 'a', condition: 'eq', value: 1 }] };

describe('teammate card rules for the real Assistant tools', () => {
	it.each([
		[
			DOMAIN_TOOL_IDS.WORKFLOWS,
			{ action: 'delete', workflowId: 'wf-1' },
			onWorkflow('workflow:delete'),
		],
		[
			DOMAIN_TOOL_IDS.WORKFLOWS,
			{ action: 'unarchive', workflowId: 'wf-1' },
			onWorkflow('workflow:delete'),
		],
		[
			DOMAIN_TOOL_IDS.WORKFLOWS,
			{ action: 'unpublish', workflowId: 'wf-1' },
			onWorkflow('workflow:unpublish'),
		],
		[
			DOMAIN_TOOL_IDS.WORKFLOWS,
			{ action: 'restore-version', workflowId: 'wf-1', versionId: 'v-1' },
			onWorkflow('workflow:update'),
		],
		[
			DOMAIN_TOOL_IDS.WORKFLOWS,
			{ action: 'update-version', workflowId: 'wf-1', versionId: 'v-1', name: 'Release' },
			onWorkflow('workflow:update'),
		],
		[
			DOMAIN_TOOL_IDS.EXECUTIONS,
			{ action: 'run', workflowId: 'wf-1' },
			onWorkflow('workflow:execute'),
		],
		[
			DOMAIN_TOOL_IDS.EXECUTIONS,
			{ action: 'run-step', workflowId: 'wf-1', nodeName: 'Fetch' },
			onWorkflow('workflow:execute'),
		],
		[
			DOMAIN_TOOL_IDS.CREDENTIALS,
			{ action: 'delete', credentialId: 'cred-1' },
			{ scopes: ['credential:delete'], target: { type: 'credential', id: 'cred-1' } },
		],
		[
			DOMAIN_TOOL_IDS.DATA_TABLES,
			{ action: 'delete', dataTableId: 'dt-1' },
			onTable('dataTable:delete'),
		],
		[
			DOMAIN_TOOL_IDS.DATA_TABLES,
			{ action: 'add-column', dataTableId: 'dt-1', name: 'b', type: 'string' },
			onTable('dataTable:update'),
		],
		[
			DOMAIN_TOOL_IDS.DATA_TABLES,
			{ action: 'delete-column', dataTableId: 'dt-1', columnId: 'c-1' },
			onTable('dataTable:update'),
		],
		[
			DOMAIN_TOOL_IDS.DATA_TABLES,
			{ action: 'rename-column', dataTableId: 'dt-1', columnId: 'c-1', newName: 'x' },
			onTable('dataTable:update'),
		],
		[
			DOMAIN_TOOL_IDS.DATA_TABLES,
			{ action: 'insert-rows', dataTableId: 'dt-1', rows: [{ a: 1 }] },
			onTable('dataTable:writeRow'),
		],
		[
			DOMAIN_TOOL_IDS.DATA_TABLES,
			{ action: 'update-rows', dataTableId: 'dt-1', filter: ALL_ROWS, data: { a: 1 } },
			onTable('dataTable:writeRow'),
		],
		[
			DOMAIN_TOOL_IDS.DATA_TABLES,
			{ action: 'delete-rows', dataTableId: 'dt-1', filter: SOME_ROWS },
			onTable('dataTable:writeRow'),
		],
		[
			DOMAIN_TOOL_IDS.DATA_TABLES,
			{ action: 'create', name: 'Leads', columns: [{ name: 'a', type: 'string' }] },
			onProject('dataTable:create'),
		],
		[
			DOMAIN_TOOL_IDS.WORKSPACE,
			{ action: 'create-folder', name: 'Reports', projectId: PROJECT_ID },
			onProject('folder:create'),
		],
		[
			DOMAIN_TOOL_IDS.WORKSPACE,
			{ action: 'delete-folder', folderId: 'f-1', projectId: PROJECT_ID },
			onProject('folder:delete'),
		],
	])('lets a teammate answer %s %o with the listed scopes', async (toolId, input, rule) => {
		const card = await firstCard(toolId, input);

		expect(sharedCardRule(card, approve, PROJECT_ID)).toEqual(rule);
	});

	// Publishing also publishes the sub-workflows that the workflow calls when the answer arrives.
	it('keeps the publish card for the owner', async () => {
		const card = await firstCard(DOMAIN_TOOL_IDS.WORKFLOWS, {
			action: 'publish',
			workflowId: 'wf-1',
		});

		expect(sharedCardRule(card, approve, PROJECT_ID)).toBeUndefined();
	});

	it('keeps a folder card of another project for the owner', async () => {
		const card = await firstCard(DOMAIN_TOOL_IDS.WORKSPACE, {
			action: 'create-folder',
			name: 'Reports',
			projectId: 'project-2',
		});

		expect(sharedCardRule(card, approve, PROJECT_ID)).toBeUndefined();
	});
});
