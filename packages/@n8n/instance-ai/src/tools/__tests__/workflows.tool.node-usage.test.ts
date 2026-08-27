import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import { createWorkflowsTool } from '../workflows.tool';

vi.mock('../workflows/setup-workflow.service', () => ({
	analyzeWorkflow: vi.fn().mockResolvedValue([]),
	applyCredentialHints: vi.fn(),
	applyNodeCredentials: vi.fn().mockResolvedValue({ failed: [] }),
	applyNodeParameters: vi.fn().mockResolvedValue({ failed: [] }),
	applyNodeChanges: vi.fn().mockResolvedValue({ applied: [], failed: [] }),
	buildCompletedReport: vi.fn().mockReturnValue([]),
}));

const emptyList = { workflows: [], total: 0, totalInScope: 0 };

function createContext(
	overrides: { nodeUsage?: unknown; list?: unknown } = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {
			list: overrides.list ?? vi.fn().mockResolvedValue(emptyList),
			...('nodeUsage' in overrides ? { nodeUsage: overrides.nodeUsage } : {}),
		},
		permissions: {},
	} as unknown as InstanceAiContext;
}

function inputSchema(tool: unknown): { safeParse: (input: unknown) => { success: boolean } } {
	return (tool as { inputSchema: { safeParse: (input: unknown) => { success: boolean } } })
		.inputSchema;
}

describe('workflows(node-usage)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// The action is only worth offering where an index can answer it; advertising
	// it against an adapter that cannot would trade a slow answer for an error.
	it('is not offered when the service cannot answer it', () => {
		const tool = createWorkflowsTool(createContext(), 'full');

		expect(inputSchema(tool).safeParse({ action: 'node-usage' }).success).toBe(false);
	});

	it('is offered when the service can answer it', () => {
		const nodeUsage = vi
			.fn()
			.mockResolvedValue({ usage: [], workflowsScanned: 0, totalInScope: 0 });
		const tool = createWorkflowsTool(createContext({ nodeUsage }), 'full');

		expect(inputSchema(tool).safeParse({ action: 'node-usage' }).success).toBe(true);
	});

	it('returns the histogram most-used first', async () => {
		const nodeUsage = vi.fn().mockResolvedValue({
			usage: [
				{ nodeType: 'n8n-nodes-base.httpRequest', workflowCount: 7 },
				{ nodeType: 'n8n-nodes-base.slack', workflowCount: 2 },
			],
			workflowsScanned: 9,
			totalInScope: 9,
		});
		const tool = createWorkflowsTool(createContext({ nodeUsage }), 'full');

		const result = await executeTool(tool, { action: 'node-usage' } as never, {} as never);

		expect(result).toMatchObject({
			usage: [
				{ nodeType: 'n8n-nodes-base.httpRequest', workflowCount: 7 },
				{ nodeType: 'n8n-nodes-base.slack', workflowCount: 2 },
			],
			workflowsScanned: 9,
			totalInScope: 9,
		});
		expect(result).not.toHaveProperty('note');
	});

	// A truncated scan reads as a total unless it says so, and these counts are
	// exactly the numbers a caller would quote back to the user.
	it('says the counts are a lower bound when the scan was capped', async () => {
		const nodeUsage = vi.fn().mockResolvedValue({
			usage: [{ nodeType: 'n8n-nodes-base.slack', workflowCount: 3 }],
			workflowsScanned: 500,
			totalInScope: 812,
		});
		const tool = createWorkflowsTool(createContext({ nodeUsage }), 'full');

		const result = await executeTool(tool, { action: 'node-usage' } as never, {} as never);

		const note = (result as { note: string }).note;
		expect(note).toContain('500 of 812');
		expect(note).toContain('lower bound');
	});

	it('distinguishes an empty scope from a truncated one', async () => {
		const nodeUsage = vi
			.fn()
			.mockResolvedValue({ usage: [], workflowsScanned: 0, totalInScope: 0 });
		const tool = createWorkflowsTool(createContext({ nodeUsage }), 'full');

		const result = await executeTool(tool, { action: 'node-usage' } as never, {} as never);

		expect((result as { note: string }).note).toContain('No node usage recorded');
	});

	it('reports an unresolved folder instead of summarizing a wider scope', async () => {
		const nodeUsage = vi.fn().mockResolvedValue({
			usage: [],
			workflowsScanned: 0,
			totalInScope: 0,
			folderResolution: { requested: 'ragdoll', reason: 'not-found', candidates: ['Archive'] },
		});
		const tool = createWorkflowsTool(createContext({ nodeUsage }), 'full');

		const result = await executeTool(
			tool,
			{ action: 'node-usage', folderPath: 'ragdoll' } as never,
			{} as never,
		);

		const note = (result as { note: string }).note;
		expect(note).toContain('NOT folder-scoped');
		expect(note).toContain('"Archive"');
	});

	it('forwards the folder and node-type narrowing to the service', async () => {
		const nodeUsage = vi
			.fn()
			.mockResolvedValue({ usage: [], workflowsScanned: 0, totalInScope: 0 });
		const tool = createWorkflowsTool(createContext({ nodeUsage }), 'full');

		await executeTool(
			tool,
			{
				action: 'node-usage',
				folderPath: 'Clients/Acme',
				nodeTypes: ['n8n-nodes-base.postgres'],
				recursive: false,
			} as never,
			{} as never,
		);

		expect(nodeUsage).toHaveBeenCalledWith({
			folderPath: 'Clients/Acme',
			nodeTypes: ['n8n-nodes-base.postgres'],
			recursive: false,
		});
	});
});

describe('workflows(list) nodeTypes filter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('forwards nodeTypes so membership is read from the index, not the name', async () => {
		const list = vi.fn().mockResolvedValue(emptyList);
		const tool = createWorkflowsTool(createContext({ list }), 'full');

		await executeTool(
			tool,
			{ action: 'list', nodeTypes: ['n8n-nodes-base.slack'] } as never,
			{} as never,
		);

		expect(list).toHaveBeenCalledWith(
			expect.objectContaining({ nodeTypes: ['n8n-nodes-base.slack'] }),
		);
	});

	it('omits the filter entirely when no node types were asked for', async () => {
		const list = vi.fn().mockResolvedValue(emptyList);
		const tool = createWorkflowsTool(createContext({ list }), 'full');

		await executeTool(tool, { action: 'list' } as never, {} as never);

		expect(list.mock.calls[0][0]).not.toHaveProperty('nodeTypes');
	});
});
