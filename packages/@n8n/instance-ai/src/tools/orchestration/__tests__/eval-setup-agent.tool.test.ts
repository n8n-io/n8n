import { formatEvalSetupTask } from '../../evals/format-eval-setup-task';

// Mock heavy Mastra dependencies to avoid ESM issues in Jest
jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn(),
}));
jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn(),
}));

// Lazy-require because createEvalSetupAgentTool uses @mastra/core/tools (createTool)
// which depends on Mastra internals — the mocks above must be in place first.
const { createEvalSetupAgentTool, evalSetupAgentInputSchema } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../eval-setup-agent.tool') as typeof import('../eval-setup-agent.tool');

describe('evalSetupAgentInputSchema', () => {
	it('accepts a valid input with workflowId, task, and conversationContext', () => {
		const result = evalSetupAgentInputSchema.safeParse({
			workflowId: 'w1',
			task: 'Set up evaluations for workflow "X".',
			conversationContext: 'User originally asked for a Q&A bot.',
		});
		expect(result.success).toBe(true);
	});

	it('accepts input without optional conversationContext', () => {
		const result = evalSetupAgentInputSchema.safeParse({
			workflowId: 'w1',
			task: 'Set up evaluations.',
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing workflowId', () => {
		const result = evalSetupAgentInputSchema.safeParse({
			task: 'Set up evaluations.',
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing task', () => {
		const result = evalSetupAgentInputSchema.safeParse({
			workflowId: 'w1',
		});
		expect(result.success).toBe(false);
	});
});

describe('createEvalSetupAgentTool', () => {
	it('creates a tool with id "eval-setup-with-agent"', () => {
		const context = {} as Parameters<typeof createEvalSetupAgentTool>[0];
		const tool = createEvalSetupAgentTool(context);
		expect(tool.id).toBe('eval-setup-with-agent');
	});

	it('tool description mentions eval setup for AI workflows', () => {
		const context = {} as Parameters<typeof createEvalSetupAgentTool>[0];
		const tool = createEvalSetupAgentTool(context);
		expect(tool.description?.toLowerCase()).toContain('eval');
		expect(tool.description?.toLowerCase()).toMatch(/ai|agent/);
	});

	it('tool uses evalSetupAgentInputSchema for input validation', () => {
		const context = {} as Parameters<typeof createEvalSetupAgentTool>[0];
		const tool = createEvalSetupAgentTool(context);
		// createTool wraps the Zod schema; verify behavioral equivalence by
		// checking the tool's schema validates the same inputs.
		const toolSchema = tool.inputSchema as typeof evalSetupAgentInputSchema;
		expect(toolSchema.safeParse({ workflowId: 'w1', task: 't' }).success).toBe(true);
		expect(toolSchema.safeParse({ task: 't' }).success).toBe(false);
		expect(toolSchema.safeParse({ workflowId: 'w1' }).success).toBe(false);
	});
});

describe('formatEvalSetupTask', () => {
	it('passes a task string containing the chosen metrics block to the sub-agent', () => {
		const task = formatEvalSetupTask({
			workflowId: 'w1',
			workflowName: 'Wf',
			detectedAiNodes: ['Agent'],
			datasetChoice: 'link-existing',
			existingDataTableId: 'dt-1',
			suggestedInputColumns: ['user_query'],
			suggestedOutputColumns: [],
			enabledMetrics: [
				{
					id: 'correctness',
					name: 'Correctness',
					kind: 'llm-judge',
					cannedMetricKey: 'correctness',
					description: '',
					prompt: '',
					defaultEnabled: true,
				},
			],
		});
		expect(task).toMatch(/METRICS TO CONFIGURE/i);
		expect(task).toMatch(/correctness/);
	});
});
