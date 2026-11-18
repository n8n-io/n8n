import {
	agentProposalEditInputSchema,
	agentProposalEvalCaseInputSchema,
	isAgentProposalArmPass,
	isAgentProposalRegression,
	type AgentProposalCaseArm,
	type AgentProposalCaseResult,
} from '../self-healing-agents';

const arm = (overrides: Partial<AgentProposalCaseArm> = {}): AgentProposalCaseArm => ({
	status: 'success',
	answer: 'Done',
	verdict: { status: 'completed', outcome: 'pass', reasoning: null },
	toolCalls: [],
	usage: { inputTokens: null, outputTokens: null, costUsd: null, durationMs: null },
	...overrides,
});

const failed = arm({ verdict: { status: 'completed', outcome: 'fail', reasoning: 'Wrong tool' } });

const result = (
	published: AgentProposalCaseArm,
	proposed: AgentProposalCaseArm | null,
): AgentProposalCaseResult => ({
	caseKey: 'new:0',
	origin: 'proposal',
	motivating: true,
	input: 'Where is my order?',
	criteria: 'The answer gives the order status.',
	expectedOutput: null,
	expectedTools: ['lookup_order'],
	published,
	proposed,
});

describe('agentProposalEditInputSchema', () => {
	it('accepts each edit kind', () => {
		expect(
			agentProposalEditInputSchema.safeParse({ kind: 'instructions', after: 'Be brief.' }).success,
		).toBe(true);
		expect(
			agentProposalEditInputSchema.safeParse({
				kind: 'toolDescription',
				toolType: 'workflow',
				toolName: 'lookup_order',
				after: 'Finds an order by its number.',
			}).success,
		).toBe(true);
		expect(
			agentProposalEditInputSchema.safeParse({
				kind: 'skill',
				skillId: 'skill-1',
				field: 'instructions',
				after: 'Ask for the order number first.',
			}).success,
		).toBe(true);
	});

	it('rejects an empty new value and an unknown tool type', () => {
		expect(
			agentProposalEditInputSchema.safeParse({ kind: 'instructions', after: ' ' }).success,
		).toBe(false);
		expect(
			agentProposalEditInputSchema.safeParse({
				kind: 'toolDescription',
				toolType: 'custom',
				toolName: 'lookup_order',
				after: 'Finds an order.',
			}).success,
		).toBe(false);
	});
});

describe('agentProposalEvalCaseInputSchema', () => {
	it('requires a rule or expected tools', () => {
		const base = { input: 'Where is my order?', criteria: null, expectedTools: [] };
		expect(agentProposalEvalCaseInputSchema.safeParse(base).success).toBe(false);
		expect(
			agentProposalEvalCaseInputSchema.safeParse({ ...base, expectedTools: ['lookup_order'] })
				.success,
		).toBe(true);
		expect(
			agentProposalEvalCaseInputSchema.parse({ ...base, criteria: 'Gives the order status.' }),
		).toMatchObject({ motivating: false });
	});
});

describe('isAgentProposalArmPass', () => {
	it('counts only a completed pass as a pass', () => {
		expect(isAgentProposalArmPass(arm())).toBe(true);
		expect(isAgentProposalArmPass(failed)).toBe(false);
		expect(isAgentProposalArmPass(arm({ status: 'error' }))).toBe(false);
		expect(
			isAgentProposalArmPass(
				arm({ verdict: { status: 'skipped', outcome: null, reasoning: null } }),
			),
		).toBe(false);
	});
});

describe('isAgentProposalRegression', () => {
	it('is true only when the published version passed and the proposed version did not', () => {
		expect(isAgentProposalRegression(result(arm(), failed))).toBe(true);
		expect(isAgentProposalRegression(result(failed, arm()))).toBe(false);
		expect(isAgentProposalRegression(result(failed, failed))).toBe(false);
		expect(isAgentProposalRegression(result(arm(), null))).toBe(false);
	});
});
