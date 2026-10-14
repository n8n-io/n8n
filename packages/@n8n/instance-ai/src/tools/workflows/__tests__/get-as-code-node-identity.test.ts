import { parseWorkflowCodeToBuilder, type WorkflowJSON } from '@n8n/workflow-sdk';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../../types';
import { createWorkflowsTool } from '../../workflows.tool';

/**
 * The regression behind INS-970 / INS-1120 / INS-1179 is a round trip, not agent behaviour:
 * `get-as-code` hands the agent TypeScript, the sandbox runs it and calls `toJSON()`, and the
 * result is saved. If the generated code cannot express a node id, every rebuild mints fresh
 * UUIDs and anything pairing a stored snapshot with the live workflow by id breaks.
 *
 * This asserts that round trip over the REAL tool output — deliberately not mocking
 * `@n8n/workflow-sdk` the way `workflows.tool.test.ts` does, because the whole point is that
 * the code the agent receives survives being rebuilt.
 *
 * It is the layer that actually discriminates. An agent-level test cannot: the agent chooses
 * how to edit, and the WorkflowJSON (`.json`) source path copies `nodes` through verbatim, so
 * ids survive there regardless of this fix.
 */
const SAVED_WORKFLOW: WorkflowJSON = {
	id: 'wf-1',
	name: 'Daily Status Digest',
	nodes: [
		{
			id: 'saved-trigger',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: 'saved-status-marker',
			name: 'Status Marker',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [240, 0],
			parameters: { mode: 'manual' },
		},
		{
			id: 'saved-summary',
			name: 'Build Summary',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [480, 0],
			parameters: { mode: 'manual' },
		},
	],
	connections: {
		'Manual Trigger': { main: [[{ node: 'Status Marker', type: 'main', index: 0 }]] },
		'Status Marker': { main: [[{ node: 'Build Summary', type: 'main', index: 0 }]] },
	},
};

function createContext(): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {
			getAsWorkflowJSON: vi.fn().mockResolvedValue(SAVED_WORKFLOW),
		},
		permissions: {},
	} as unknown as InstanceAiContext;
}

/**
 * Rebuild the way the sandbox does: run the source, then serialize. The sandbox
 * compiles real TypeScript, so the import line get-as-code emits is fine there;
 * the SDK parser used here rejects imports, so strip it first.
 */
function rebuild(code: string): WorkflowJSON {
	const body = code.replace(/^import\s[^\n]*\n+/gm, '');
	return parseWorkflowCodeToBuilder(body).toJSON();
}

async function getAsCode(): Promise<string> {
	const tool = createWorkflowsTool(createContext());
	// A versionId keeps this a historical read, which skips the source-file binding refresh
	// and its thread-metadata plumbing — irrelevant to the round trip under test.
	const result = await executeTool<{ code: string; error?: string }>(
		tool,
		{ action: 'get-as-code', workflowId: 'wf-1', versionId: 'v1' },
		{} as never,
	);

	expect(result.error).toBeUndefined();
	return result.code;
}

describe('get-as-code node identity', () => {
	it('should emit every saved node id into the generated code', async () => {
		const code = await getAsCode();

		for (const node of SAVED_WORKFLOW.nodes) {
			expect(code).toContain(`id: '${node.id}'`);
		}
	});

	it('should preserve every node id when the generated code is rebuilt unchanged', async () => {
		const rebuilt = rebuild(await getAsCode());

		expect(Object.fromEntries(rebuilt.nodes.map((node) => [node.name, node.id]))).toEqual({
			'Manual Trigger': 'saved-trigger',
			'Status Marker': 'saved-status-marker',
			'Build Summary': 'saved-summary',
		});
	});

	it('should preserve node ids when a parameter is edited in the generated code', async () => {
		const code = await getAsCode();
		const edited = code.replace("mode: 'manual'", "mode: 'raw'");
		expect(edited).not.toBe(code);

		const rebuilt = rebuild(edited);

		expect(rebuilt.nodes.find((n) => n.name === 'Status Marker')?.id).toBe('saved-status-marker');
	});

	/** The case name-based reconciliation cannot get right: identity has to follow the node. */
	it('should preserve a node id when the node is renamed in the generated code', async () => {
		const code = await getAsCode();
		const edited = code.replace(/'Status Marker'/g, "'Status Renamed'");

		const rebuilt = rebuild(edited);

		expect(rebuilt.nodes.find((n) => n.name === 'Status Renamed')?.id).toBe('saved-status-marker');
		expect(rebuilt.nodes.some((n) => n.name === 'Status Marker')).toBe(false);
	});

	it('should give a node added to the generated code an id of its own', async () => {
		const code = await getAsCode();
		// Add a node that declares no id, the way the agent extends the source: declare it above
		// the builder and hang it off the end of the export chain.
		const declaration =
			"const added = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Added' } });\n\n";
		const withAdded = `${code.replace('const wf = workflow(', `${declaration}const wf = workflow(`).trimEnd()}\n  .to(added)\n`;
		expect(withAdded).toContain("name: 'Added'");

		const rebuilt = rebuild(withAdded);
		const addedNode = rebuilt.nodes.find((node) => node.name === 'Added');
		const savedIds = SAVED_WORKFLOW.nodes.map((node) => node.id);

		expect(addedNode?.id).toBeTruthy();
		// A fresh id of its own, not one taken from a node that already existed.
		expect(savedIds).not.toContain(addedNode?.id);
		// ...and the pre-existing nodes still hold theirs.
		for (const node of SAVED_WORKFLOW.nodes) {
			expect(rebuilt.nodes.find((n) => n.name === node.name)?.id).toBe(node.id);
		}
	});
});
