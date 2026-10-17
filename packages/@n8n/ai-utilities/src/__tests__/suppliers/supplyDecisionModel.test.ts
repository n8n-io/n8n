import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { supplyDecisionModel } from 'src/suppliers/supplyDecisionModel';
import type { DecisionModel, DecisionRequest, DecisionResponse } from 'src/types/decision-model';

const request: DecisionRequest = {
	state: 'Charged twice',
	questions: {
		department: {
			type: 'choice',
			instructions: 'Which team?',
			options: [{ value: 'billing' }, { value: 'technical' }],
		},
	},
};

const response: DecisionResponse = {
	decisions: { department: { type: 'choice', value: 'billing', confidence: 0.92 } },
	model: 'test-1',
};

describe('supplyDecisionModel', () => {
	let context: ISupplyDataFunctions;
	let decide: Mock<(request: DecisionRequest) => Promise<DecisionResponse>>;
	let model: DecisionModel;

	beforeEach(() => {
		vi.clearAllMocks();
		context = mock<ISupplyDataFunctions>();
		context.getNode = vi.fn().mockReturnValue(mock<INode>({ name: 'Test Decision Model' }));
		context.addInputData = vi.fn().mockReturnValue({ index: 2 });
		context.addOutputData = vi.fn();
		decide = vi.fn<(request: DecisionRequest) => Promise<DecisionResponse>>();
		decide.mockResolvedValue(response);
		model = { provider: 'test', modelId: 'test-1', decide };
	});

	it('should supply a model that keeps its identity', () => {
		const supplied = supplyDecisionModel(context, model).response as DecisionModel;

		expect(supplied.provider).toBe('test');
		expect(supplied.modelId).toBe('test-1');
	});

	it('should pass the request through and return the response', async () => {
		const supplied = supplyDecisionModel(context, model).response as DecisionModel;

		await expect(supplied.decide(request)).resolves.toEqual(response);
		expect(decide).toHaveBeenCalledWith(request);
	});

	it('should log the request and the response on the sub-node', async () => {
		const supplied = supplyDecisionModel(context, model).response as DecisionModel;

		await supplied.decide(request);

		expect(context.addInputData).toHaveBeenCalledWith('ai_decisionModel', [
			[{ json: { model: 'test-1', ...request } }],
		]);
		expect(context.addOutputData).toHaveBeenCalledWith('ai_decisionModel', 2, [
			[{ json: response }],
		]);
	});

	it('should attribute a provider failure to the sub-node', async () => {
		decide.mockRejectedValue(new Error('Rate limited'));
		const supplied = supplyDecisionModel(context, model).response as DecisionModel;

		const error = await supplied.decide(request).catch((e: Error) => e);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect((error as NodeOperationError).functionality).toBe('configuration-node');
		expect((error as Error).message).toBe('Rate limited');
	});

	it('should log a provider failure as the output of the run', async () => {
		decide.mockRejectedValue(new Error('Rate limited'));
		const supplied = supplyDecisionModel(context, model).response as DecisionModel;

		await supplied.decide(request).catch(() => undefined);

		const [connectionType, runIndex, logged] = vi.mocked(context.addOutputData).mock.calls[0];
		expect(connectionType).toBe('ai_decisionModel');
		expect(runIndex).toBe(2);
		expect(logged).toBeInstanceOf(NodeOperationError);
	});

	it('should pass a close function through', () => {
		const closeFunction = vi.fn();

		const supplied = supplyDecisionModel(context, model, { closeFunction });

		expect(supplied.closeFunction).toBe(closeFunction);
	});
});
