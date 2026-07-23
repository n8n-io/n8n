import { generateAgentScenarioSeed } from '../agent-scenario-seed';

const generate = vi.fn();
const extractText = vi.fn();

vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: vi.fn(() => ({ generate })),
	extractText: (result: unknown) => extractText(result) as string,
}));

const baseOptions = {
	agentName: 'Support agent',
	instructions: 'You help with support tickets.',
	tools: [
		{ name: 'Slack_Tool', kind: 'node' as const, nodeType: 'n8n-nodes-base.slackTool' },
		{ name: 'Lookup_workflow', kind: 'workflow' as const, description: 'Find a customer' },
	],
	scenarioHints: 'The customer jane@example.com asks about order #123.',
};

const validSeedJson = JSON.stringify({
	openingMessage: 'Hi, I need help with order #123',
	globalContext: 'Customer jane@example.com, order #123',
	toolHints: { Slack_Tool: 'Message posts succeed', Lookup_workflow: 'Returns jane' },
});

describe('generateAgentScenarioSeed', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		generate.mockResolvedValue({ messages: [] });
	});

	it('parses a valid seed (including fenced JSON)', async () => {
		extractText.mockReturnValue('```json\n' + validSeedJson + '\n```');

		const seed = await generateAgentScenarioSeed(baseOptions);

		expect(seed.openingMessage).toBe('Hi, I need help with order #123');
		expect(seed.globalContext).toContain('jane@example.com');
		expect(seed.toolHints).toEqual({
			Slack_Tool: 'Message posts succeed',
			Lookup_workflow: 'Returns jane',
		});
		expect(seed.warnings).toEqual([]);
	});

	it('includes the scenario, tool names, and date anchors in the prompt', async () => {
		extractText.mockReturnValue(validSeedJson);

		await generateAgentScenarioSeed(baseOptions);

		const prompt = generate.mock.calls[0][0] as string;
		expect(prompt).toContain('## Test Scenario');
		expect(prompt).toContain('jane@example.com asks about order #123');
		expect(prompt).toContain('Slack_Tool');
		expect(prompt).toContain('Lookup_workflow');
		expect(prompt).toContain('## Date anchors');
	});

	it('retries once when the first attempt has no usable openingMessage', async () => {
		extractText
			.mockReturnValueOnce(JSON.stringify({ globalContext: 'no message here' }))
			.mockReturnValueOnce(validSeedJson);

		const seed = await generateAgentScenarioSeed(baseOptions);

		expect(generate).toHaveBeenCalledTimes(2);
		expect(seed.openingMessage).toBe('Hi, I need help with order #123');
		expect(seed.warnings).toHaveLength(1);
	});

	it('throws a FRAMEWORK ISSUE when both attempts fail', async () => {
		extractText.mockReturnValue('not json at all');

		await expect(generateAgentScenarioSeed(baseOptions)).rejects.toThrow(/^FRAMEWORK ISSUE:/);
		expect(generate).toHaveBeenCalledTimes(2);
	});

	it('surfaces LLM call failures through the retry path', async () => {
		generate.mockRejectedValueOnce(new Error('provider timeout'));
		extractText.mockReturnValue(validSeedJson);

		const seed = await generateAgentScenarioSeed(baseOptions);

		expect(seed.openingMessage).toBe('Hi, I need help with order #123');
		expect(seed.warnings[0]).toContain('provider timeout');
	});
});
