import type { DecisionModel, DecisionRequest } from '@n8n/ai-utilities';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { configuredOutputs, Decision } from '../Decision.node';
import type { QuestionParameter } from '../types';

const choiceQuestion: QuestionParameter = {
	id: 'department',
	type: 'choice',
	instructions: 'Which team should handle this request?',
	options: { option: [{ value: 'billing' }, { value: 'technical' }] },
};

function decisionResponse(value = 'billing', confidence = 0.92) {
	return {
		decisions: {
			department: {
				type: 'choice' as const,
				value,
				confidence,
				probabilities: { billing: 0.96, technical: 0.04 },
			},
		},
		model: 'jev-latest',
		usage: { inputTokens: 300, outputTokens: 50 },
	};
}

describe('Decision Node', () => {
	let node: Decision;
	let ctx: Mocked<IExecuteFunctions>;
	let model: DecisionModel;

	function setParameters(parameters: {
		state?: unknown;
		questions?: QuestionParameter[];
		options?: object;
		outputMode?: 'single' | 'branch';
	}) {
		ctx.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'state') return parameters.state ?? 'Charged twice';
			if (name === 'questions.question') return parameters.questions ?? [choiceQuestion];
			if (name === 'options') return parameters.options ?? {};
			if (name === 'outputMode') return parameters.outputMode ?? 'single';
			return fallback;
		});
	}

	beforeEach(() => {
		vi.clearAllMocks();
		node = new Decision();
		ctx = mock<IExecuteFunctions>();
		model = { provider: 'test', modelId: 'test-1', decide: vi.fn(async () => decisionResponse()) };

		ctx.getNode.mockReturnValue(mock<INode>({ name: 'Decision', type: 'decision' }));
		ctx.getInputData.mockReturnValue([{ json: { ticket: 'Charged twice' } }]);
		ctx.getInputConnectionData.mockResolvedValue(model);
		ctx.continueOnFail.mockReturnValue(false);
		setParameters({});
	});

	it('should send the built request to the connected model', async () => {
		const result = await node.execute.call(ctx);

		expect(model.decide).toHaveBeenCalledWith({
			state: 'Charged twice',
			questions: {
				department: {
					type: 'choice',
					instructions: 'Which team should handle this request?',
					options: [{ value: 'billing' }, { value: 'technical' }],
				},
			},
		});
		expect(result).toEqual([
			[
				{
					json: {
						decisions: decisionResponse().decisions,
						model: 'jev-latest',
						usage: { inputTokens: 300, outputTokens: 50 },
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should send structured state as JSON', async () => {
		const state = { subject: 'Double charge', amount: 42 };
		setParameters({ state });

		await node.execute.call(ctx);

		expect((model.decide as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ state });
	});

	it('should ask several questions in one call', async () => {
		setParameters({
			questions: [
				choiceQuestion,
				{
					id: 'severity',
					type: 'score',
					instructions: 'How severe?',
					levels: { level: [{ description: 'Low' }, { description: 'Critical' }] },
				},
				{ id: 'urgency', type: 'booleanProbability', instructions: 'Is it urgent?' },
			],
		});
		(model.decide as ReturnType<typeof vi.fn>).mockResolvedValue({
			decisions: {
				...decisionResponse().decisions,
				severity: { type: 'score', value: 1.7 },
				urgency: { type: 'booleanProbability', value: true, probability: 0.88 },
			},
		});

		const result = await node.execute.call(ctx);

		expect(Object.keys((result[0][0].json as { decisions: object }).decisions)).toEqual([
			'department',
			'severity',
			'urgency',
		]);
	});

	it('should evaluate parameters per item and keep paired items', async () => {
		ctx.getInputData.mockReturnValue([
			{ json: { ticket: 'first' } },
			{ json: { ticket: 'second' } },
		]);
		ctx.getNodeParameter.mockImplementation((name, itemIndex, fallback) => {
			// Mirrors an expression such as {{ $json.ticket }}
			if (name === 'state') return itemIndex === 0 ? 'first' : 'second';
			if (name === 'questions.question') return [choiceQuestion];
			if (name === 'options') return {};
			return fallback;
		});

		const result = await node.execute.call(ctx);

		expect(model.decide).toHaveBeenCalledTimes(2);
		expect(
			(model.decide as ReturnType<typeof vi.fn>).mock.calls.map(([call]) => call.state),
		).toEqual(['first', 'second']);
		expect(result[0].map((item: INodeExecutionData) => item.pairedItem)).toEqual([
			{ item: 0 },
			{ item: 1 },
		]);
	});

	it('should pass the confidence threshold to the output', async () => {
		setParameters({ options: { confidenceThreshold: 0.95 } });

		const result = await node.execute.call(ctx);

		expect(result[0][0].json).toMatchObject({
			confidenceThreshold: 0.95,
			decisions: { department: { meetsConfidenceThreshold: false } },
		});
	});

	it('should fail when no Decision Model is connected', async () => {
		ctx.getInputConnectionData.mockResolvedValue(undefined);

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'The connected node is not a Decision Model',
		);
	});

	it('should fail when the connected node cannot decide', async () => {
		ctx.getInputConnectionData.mockResolvedValue({ provider: 'x', modelId: 'y' });

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'The connected node is not a Decision Model',
		);
	});

	it('should not call the model when the questions are invalid', async () => {
		setParameters({ questions: [{ ...choiceQuestion, id: '' }] });

		await expect(node.execute.call(ctx)).rejects.toThrow('Question 1 has no ID');
		expect(model.decide).not.toHaveBeenCalled();
	});

	it('should fail on a malformed provider response', async () => {
		(model.decide as ReturnType<typeof vi.fn>).mockResolvedValue({ answers: {} });

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'The Decision Model returned a malformed response',
		);
	});

	describe('continueOnFail', () => {
		beforeEach(() => {
			ctx.continueOnFail.mockReturnValue(true);
		});

		it('should return the error for the failing item and keep going', async () => {
			ctx.getInputData.mockReturnValue([{ json: { ticket: 'first' } }, { json: { ticket: 'x' } }]);
			(model.decide as ReturnType<typeof vi.fn>)
				.mockRejectedValueOnce(new Error('Rate limited'))
				.mockResolvedValueOnce(decisionResponse());

			const result = await node.execute.call(ctx);

			expect(result[0]).toEqual([
				{ json: { error: 'Rate limited' }, pairedItem: { item: 0 } },
				expect.objectContaining({ pairedItem: { item: 1 } }),
			]);
		});

		it('should report a validation error per item', async () => {
			setParameters({ questions: [] });

			const result = await node.execute.call(ctx);

			expect(result[0][0].json.error).toBe('At least one question must be defined');
		});
	});

	describe('description', () => {
		it('should require a single Decision Model sub-node', () => {
			expect(node.description.inputs).toEqual([
				{ displayName: '', type: 'main' },
				{
					displayName: 'Decision Model',
					type: 'ai_decisionModel',
					maxConnections: 1,
					required: true,
				},
			]);
		});

		it('should derive its outputs from the parameters', () => {
			expect(node.description.outputs).toBe(`={{(${configuredOutputs})($parameter)}}`);
		});
	});

	describe('Branch by Choice', () => {
		const threeOptions: QuestionParameter = {
			...choiceQuestion,
			options: { option: [{ value: 'billing' }, { value: 'technical' }, { value: 'sales' }] },
		};

		it('should send the item to the output of the selected option', async () => {
			setParameters({ outputMode: 'branch', questions: [threeOptions] });

			const result = await node.execute.call(ctx);

			expect(result).toHaveLength(3);
			expect(result[0]).toEqual([expect.objectContaining({ pairedItem: { item: 0 } })]);
			expect(result[1]).toEqual([]);
			expect(result[2]).toEqual([]);
		});

		it('should keep the full decisions on the branched item', async () => {
			setParameters({ outputMode: 'branch', questions: [threeOptions] });

			const result = await node.execute.call(ctx);

			expect(result[0][0].json).toMatchObject({
				decisions: { department: { value: 'billing', confidence: 0.92 } },
			});
		});

		it('should split the items across the outputs', async () => {
			setParameters({ outputMode: 'branch', questions: [threeOptions] });
			ctx.getInputData.mockReturnValue([
				{ json: { ticket: 'refund' } },
				{ json: { ticket: 'crash' } },
				{ json: { ticket: 'refund again' } },
			]);
			(model.decide as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(decisionResponse())
				.mockResolvedValueOnce(decisionResponse('technical'))
				.mockResolvedValueOnce(decisionResponse());

			const result = await node.execute.call(ctx);

			expect(result[0].map((item) => item.pairedItem)).toEqual([{ item: 0 }, { item: 2 }]);
			expect(result[1].map((item) => item.pairedItem)).toEqual([{ item: 1 }]);
			expect(result[2]).toEqual([]);
		});

		it('should send an answer below the threshold to the last output', async () => {
			setParameters({
				outputMode: 'branch',
				questions: [threeOptions],
				options: { confidenceThreshold: 0.8 },
			});
			(model.decide as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				decisionResponse('billing', 0.4),
			);

			const result = await node.execute.call(ctx);

			expect(result).toHaveLength(4);
			expect(result[0]).toEqual([]);
			expect(result[3]).toEqual([expect.objectContaining({ pairedItem: { item: 0 } })]);
		});

		it('should keep a confident answer on its own output', async () => {
			setParameters({
				outputMode: 'branch',
				questions: [threeOptions],
				options: { confidenceThreshold: 0.8 },
			});

			const result = await node.execute.call(ctx);

			expect(result[0]).toHaveLength(1);
			expect(result[3]).toEqual([]);
		});

		it('should fail when the node has no choice question to branch on', async () => {
			setParameters({
				outputMode: 'branch',
				questions: [
					{
						id: 'severity',
						type: 'score',
						instructions: 'How severe?',
						levels: { level: [{ description: 'Low' }, { description: 'High' }] },
					},
				],
			});

			await expect(node.execute.call(ctx)).rejects.toThrow(
				'Branch by Choice needs a choice question',
			);
		});

		it('should fail when an expression changes the options between items', async () => {
			// The outputs come from item 0, so per-item options cannot be routed
			const perItemOptions: QuestionParameter = {
				...choiceQuestion,
				options: { option: [{ value: 'escalation' }] },
			};
			ctx.getInputData.mockReturnValue([{ json: { ticket: 'a' } }, { json: { ticket: 'b' } }]);
			ctx.getNodeParameter.mockImplementation((name, itemIndex, fallback) => {
				if (name === 'state') return 'Charged twice';
				if (name === 'questions.question') return [itemIndex === 0 ? threeOptions : perItemOptions];
				if (name === 'options') return {};
				if (name === 'outputMode') return 'branch';
				return fallback;
			});
			(model.decide as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(decisionResponse())
				.mockResolvedValueOnce(decisionResponse('escalation'));

			await expect(node.execute.call(ctx)).rejects.toThrow(
				"“escalation” is not one of this node's outputs",
			);
		});

		it('should put a failed item on the first output when continuing', async () => {
			setParameters({ outputMode: 'branch', questions: [threeOptions] });
			ctx.continueOnFail.mockReturnValue(true);
			(model.decide as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Rate limited'));

			const result = await node.execute.call(ctx);

			expect(result[0]).toEqual([{ json: { error: 'Rate limited' }, pairedItem: { item: 0 } }]);
		});
	});
});

describe('Decision node request typing', () => {
	it('should accept the generic request shape', () => {
		const request: DecisionRequest = {
			state: 'Charged twice',
			questions: { urgency: { type: 'booleanProbability', instructions: 'Urgent?' } },
		};

		expect(request.questions.urgency.type).toBe('booleanProbability');
	});
});
