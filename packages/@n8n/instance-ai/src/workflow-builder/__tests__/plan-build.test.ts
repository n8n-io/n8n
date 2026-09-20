import { mock } from 'vitest-mock-extended';
import { describe, expect, it } from 'vitest';

import type { InstanceAiNodeService } from '../../types';
import type { DecisionService } from '../../workflow-compiler/decision/decision-service';
import { buildPlanSchema, decideBuildPlan } from '../plan-build';

const plan = {
	originalRequest: 'Email a candidate and book an interview after they confirm a time.',
	plan: 'Email available times. Wait for confirmation. Book the confirmed interview.',
	steps: [
		{ id: 'outreach', intent: 'Send email to the candidate', search: 'Gmail' },
		{ id: 'confirmation', intent: 'Wait for candidate confirmation', search: 'Wait' },
	],
};

function services(coverage = 0.99) {
	const nodes = mock<Required<InstanceAiNodeService>>();
	nodes.listSearchable.mockResolvedValue([
		{
			name: 'n8n-nodes-base.gmail',
			displayName: 'Gmail',
			description: 'Send email',
			version: 2.1,
			inputs: ['main'],
			outputs: ['main'],
		},
		{
			name: 'n8n-nodes-base.wait',
			displayName: 'Wait',
			description: 'Wait for confirmation',
			version: 1.1,
			inputs: ['main'],
			outputs: ['main'],
		},
	]);
	nodes.listDiscriminators.mockImplementation(async (type) =>
		type.endsWith('.gmail')
			? { resources: [{ name: 'message', operations: ['send', 'get'] }] }
			: null,
	);
	nodes.getNodeTypeDefinition.mockResolvedValue({ content: 'Live parameter definition' });
	nodes.getDescription.mockResolvedValue({
		name: 'n8n-nodes-base.wait',
		displayName: 'Wait',
		description: 'Wait for confirmation',
		version: 1.1,
		group: ['transform'],
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	});
	const decisions = mock<DecisionService>({ kind: 'systemone' });
	decisions.decide.mockResolvedValue({
		ok: true,
		model: 'fixture',
		answers: {
			coverage: { type: 'noul', noul: coverage },
			progress: { type: 'noul', noul: 0.99 },
			scope: { type: 'noul', noul: 0.99 },
			step_0: {
				type: 'choice',
				choice: 'option_0',
				confidence: 0.99,
				probabilities: { option_0: 0.99, none_of_these: 0.01 },
			},
			step_1: {
				type: 'choice',
				choice: 'option_0',
				confidence: 0.99,
				probabilities: { option_0: 0.99, none_of_these: 0.01 },
			},
		},
		problems: [],
		latencyMs: 120,
	});
	return { nodes, decisions };
}

describe('LLM plan and bounded decisions', () => {
	it('grounds the full plan in installed operations and returns their parameter definitions', async () => {
		const { nodes, decisions } = services();
		const result = await decideBuildPlan(plan, nodes, decisions);
		expect(result.status).toBe('ready');
		expect(result.selections[0].selected).toMatchObject({
			nodeType: 'n8n-nodes-base.gmail',
			resource: 'message',
			operation: 'send',
		});
		expect(result.definitions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ definition: { content: 'Live parameter definition' } }),
			]),
		);
		expect(decisions.decide).toHaveBeenCalledOnce();
		expect(decisions.decide).toHaveBeenCalledWith(
			expect.objectContaining({
				state: plan,
				questions: expect.objectContaining({
					coverage: expect.anything(),
					step_0: expect.anything(),
					step_1: expect.anything(),
				}),
			}),
		);
	});

	it('returns an incomplete plan to LLM reasoning instead of treating node matches as a complete build', async () => {
		const { nodes, decisions } = services(0.05);
		const result = await decideBuildPlan(plan, nodes, decisions);
		expect(result).toMatchObject({ status: 'needs_reasoning', coverage: 'no' });
		expect(result.guidance).toContain('ask-user');
	});

	it('does not select a single candidate when the decision service is unavailable', async () => {
		const { nodes, decisions } = services();
		decisions.decide.mockResolvedValue({
			ok: false,
			reason: 'unavailable',
			message: 'Unavailable',
			latencyMs: 1,
		});
		const result = await decideBuildPlan(plan, nodes, decisions);
		expect(result.status).toBe('needs_reasoning');
		expect(result.selections.every(({ selected }) => selected === undefined)).toBe(true);
		expect(nodes.getNodeTypeDefinition).not.toHaveBeenCalled();
	});

	it('narrows flat operation definitions and shares discovery for repeated services', async () => {
		const { nodes, decisions } = services();
		nodes.listDiscriminators.mockResolvedValue(null);
		const description = await nodes.getDescription('n8n-nodes-base.gmail');
		nodes.getDescription.mockClear();
		nodes.getDescription.mockResolvedValue({
			...description,
			properties: [
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					options: [{ name: 'Send', value: 'send' }],
				},
			],
		});
		const result = await decideBuildPlan(
			{ ...plan, steps: [plan.steps[0], { ...plan.steps[0], id: 'reminder' }] },
			nodes,
			decisions,
		);
		expect(result.status).toBe('ready');
		expect(result.selections.every(({ selected }) => selected?.operation === 'send')).toBe(true);
		expect(nodes.getDescription).toHaveBeenCalledOnce();
		expect(nodes.getNodeTypeDefinition).toHaveBeenCalledOnce();
		expect(nodes.getNodeTypeDefinition).toHaveBeenCalledWith(
			'n8n-nodes-base.gmail',
			expect.objectContaining({ operation: 'send' }),
		);
	});

	it('requires reasoning when parameter definitions are unavailable', async () => {
		const { nodes, decisions } = services();
		nodes.getNodeTypeDefinition.mockResolvedValue(null);
		expect((await decideBuildPlan(plan, nodes, decisions)).status).toBe('needs_reasoning');
	});

	it('retains quality checks and successful choices when a large plan batch times out', async () => {
		const { nodes, decisions } = services();
		decisions.decide.mockImplementation(async ({ questions }) => {
			if ('step_8' in questions)
				return { ok: false, reason: 'timeout', message: 'Timed out', latencyMs: 1500 };
			return {
				ok: true,
				model: 'fixture',
				latencyMs: 200,
				problems: [],
				answers: Object.fromEntries(
					Object.entries(questions).map(([key, question]) => [
						key,
						question.type === 'noul'
							? { type: 'noul', noul: 0.99 }
							: {
									type: 'choice',
									choice: 'option_0',
									confidence: 0.99,
									probabilities: { option_0: 0.99, none_of_these: 0.01 },
								},
					]),
				),
			};
		});
		const result = await decideBuildPlan(
			{
				...plan,
				steps: Array.from({ length: 16 }, (_, i) => ({ ...plan.steps[0], id: `email_${i}` })),
			},
			nodes,
			decisions,
		);
		expect(decisions.decide).toHaveBeenCalledTimes(3);
		expect(result).toMatchObject({
			status: 'needs_reasoning',
			checks: { coverage: 'yes', progress: 'yes', scope: 'yes' },
			decisionStatus: 'incomplete',
			decisionFailures: ['timeout'],
		});
		expect(result.selections.slice(0, 8).every(({ selected }) => selected)).toBe(true);
		expect(result.selections.slice(8).every(({ selected }) => !selected)).toBe(true);
	});

	it('returns progress and scope concerns to the LLM even when coverage passes', async () => {
		const { nodes, decisions } = services();
		const outcome = await decisions.decide({
			name: 'fixture',
			schemaVersion: '1',
			state: {},
			questions: {},
		});
		if (!outcome.ok) throw new Error('Expected a successful fixture');
		decisions.decide.mockResolvedValue({
			...outcome,
			answers: { ...outcome.answers, progress: { type: 'noul', noul: 0.05 } },
		});
		expect(await decideBuildPlan(plan, nodes, decisions)).toMatchObject({
			status: 'needs_reasoning',
			checks: { coverage: 'yes', progress: 'no', scope: 'yes' },
		});
	});

	it('does not turn an unavailable integration into a different service', async () => {
		const { nodes, decisions } = services();
		const result = await decideBuildPlan(
			{
				...plan,
				steps: [{ id: 'missing', intent: 'Use an unavailable ATS', search: 'Unavailable ATS' }],
			},
			nodes,
			decisions,
		);
		expect(result.status).toBe('needs_reasoning');
		expect(result.selections[0].selected).toBeUndefined();
	});

	it('rejects duplicate step ids and stops a cancelled plan before discovery', async () => {
		expect(
			buildPlanSchema.safeParse({ ...plan, steps: [plan.steps[0], plan.steps[0]] }).success,
		).toBe(false);
		const { nodes, decisions } = services();
		await expect(decideBuildPlan(plan, nodes, decisions, AbortSignal.abort())).rejects.toThrow();
		expect(nodes.listSearchable).not.toHaveBeenCalled();
	});
});
