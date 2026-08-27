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

function createContext(list = vi.fn().mockResolvedValue(emptyList)): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: { list },
		permissions: {},
	} as unknown as InstanceAiContext;
}

function inputSchema(tool: unknown): {
	safeParse: (input: unknown) => { success: boolean; data?: Record<string, unknown> };
} {
	return (
		tool as {
			inputSchema: {
				safeParse: (input: unknown) => { success: boolean; data?: Record<string, unknown> };
			};
		}
	).inputSchema;
}

describe('workflows(list) folder scope', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllEnvs();
	});

	// Both arms of a measurement run come off one binary, so the gate has to really
	// remove the field — not merely ignore it. If it only ignored it, the "before"
	// arm would still be told folders exist and the comparison would be meaningless.
	it('keeps folderPath when folder context is on', () => {
		const tool = createWorkflowsTool(createContext(), 'full');

		const parsed = inputSchema(tool).safeParse({ action: 'list', folderPath: 'Clients/Acme' });

		expect(parsed.success).toBe(true);
		expect(parsed.data).toHaveProperty('folderPath', 'Clients/Acme');
	});

	// Stripped, not rejected — the schema is not strict, so an unknown key parses
	// and disappears. Asserting stripping is the honest check: it proves the field
	// is genuinely absent from the advertised schema (so the off arm never learns
	// folders are addressable) and that nothing reaches the handler if a model
	// invents it anyway.
	it('strips folderPath when folder context is off', () => {
		vi.stubEnv('N8N_INSTANCE_AI_FOLDER_CONTEXT_ENABLED', 'false');
		const tool = createWorkflowsTool(createContext(), 'full');

		const parsed = inputSchema(tool).safeParse({ action: 'list', folderPath: 'Clients/Acme' });

		expect(parsed.success).toBe(true);
		expect(parsed.data).not.toHaveProperty('folderPath');
	});

	it('does not mention folderPath in the query hint when folder context is off', () => {
		vi.stubEnv('N8N_INSTANCE_AI_FOLDER_CONTEXT_ENABLED', 'false');
		const tool = createWorkflowsTool(createContext(), 'full');

		expect(JSON.stringify(inputSchema(tool))).not.toContain('folderPath');
	});

	it('still accepts a plain list when folder context is off', () => {
		vi.stubEnv('N8N_INSTANCE_AI_FOLDER_CONTEXT_ENABLED', 'false');
		const tool = createWorkflowsTool(createContext(), 'full');

		expect(inputSchema(tool).safeParse({ action: 'list' }).success).toBe(true);
	});

	it('forwards folderPath and the recursive default to the service', async () => {
		const list = vi.fn().mockResolvedValue(emptyList);
		const tool = createWorkflowsTool(createContext(list), 'full');

		await executeTool(tool, { action: 'list', folderPath: 'logsearch' } as never, {} as never);

		expect(list).toHaveBeenCalledWith(expect.objectContaining({ folderPath: 'logsearch' }));
		// Absent rather than defaulted here: the adapter owns the default, so a case
		// asking for one level can be told apart from one that never mentioned it.
		expect(list.mock.calls[0][0]).not.toHaveProperty('recursive');
	});

	it('forwards recursive: false when the caller asks for one level', async () => {
		const list = vi.fn().mockResolvedValue(emptyList);
		const tool = createWorkflowsTool(createContext(list), 'full');

		await executeTool(
			tool,
			{ action: 'list', folderPath: 'logsearch', recursive: false } as never,
			{} as never,
		);

		expect(list).toHaveBeenCalledWith(expect.objectContaining({ recursive: false }));
	});
});

describe('workflows(list) unresolved folder reporting', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllEnvs();
	});

	it('says the results are not folder-scoped and names the real folders', async () => {
		const list = vi.fn().mockResolvedValue({
			workflows: [],
			total: 0,
			totalInScope: 0,
			folderResolution: {
				requested: 'ragdoll',
				reason: 'not-found',
				candidates: ['Archive', 'logsearch'],
			},
		});
		const tool = createWorkflowsTool(createContext(list), 'full');

		const result = await executeTool(
			tool,
			{ action: 'list', folderPath: 'ragdoll' } as never,
			{} as never,
		);

		const { note, folderResolution } = result as {
			note: string;
			folderResolution: { reason: string };
		};
		expect(folderResolution.reason).toBe('not-found');
		expect(note).toContain('NOT folder-scoped');
		expect(note).toContain('"logsearch"');
		// The recovery the traces showed — retrying as a name filter — has to be named
		// and refused, or the agent falls straight back into it.
		expect(note).toContain('Do NOT substitute a `query` name filter');
	});

	it('reports an ambiguous folder as ambiguous rather than picking one', async () => {
		const list = vi.fn().mockResolvedValue({
			workflows: [],
			total: 0,
			totalInScope: 0,
			folderResolution: {
				requested: 'Acme',
				reason: 'ambiguous',
				candidates: ['Archive/Acme', 'Clients/Acme'],
			},
		});
		const tool = createWorkflowsTool(createContext(list), 'full');

		const result = await executeTool(
			tool,
			{ action: 'list', folderPath: 'Acme' } as never,
			{} as never,
		);

		expect((result as { note: string }).note).toContain('matches more than one folder');
	});

	it('tells the caller to ask the user when folders are unavailable', async () => {
		const list = vi.fn().mockResolvedValue({
			workflows: [],
			total: 0,
			totalInScope: 0,
			folderResolution: { requested: 'logsearch', reason: 'unsupported', candidates: [] },
		});
		const tool = createWorkflowsTool(createContext(list), 'full');

		const result = await executeTool(
			tool,
			{ action: 'list', folderPath: 'logsearch' } as never,
			{} as never,
		);

		const note = (result as { note: string }).note;
		expect(note).toContain('Folders are not available on this instance');
		expect(note).toContain('Ask the user');
	});

	it('adds no folder note when the folder resolved', async () => {
		const tool = createWorkflowsTool(createContext(), 'full');

		const result = await executeTool(
			tool,
			{ action: 'list', folderPath: 'logsearch' } as never,
			{} as never,
		);

		expect(result).not.toHaveProperty('folderResolution');
		expect(result).not.toHaveProperty('note');
	});
});
