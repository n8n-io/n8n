import { setInputs } from '../utils/evaluationUtils';
import { UserError } from 'n8n-workflow';

describe('setInputs', () => {
	const mockThis = (options: Partial<any> = {}) => ({
		getNode: jest.fn().mockReturnValue({ name: 'EvalNode' }),
		getParentNodes: jest
			.fn()
			.mockReturnValue([{ name: 'EvalTrigger', type: 'n8n-nodes-base.evaluationTrigger' }]),
		evaluateExpression: jest.fn().mockReturnValue(true),
		getNodeParameter: jest.fn().mockReturnValue([
			{ inputName: 'foo', inputValue: 'bar' },
			{ inputName: 'baz', inputValue: 'qux' },
		]),
		getInputData: jest.fn().mockReturnValue([{ json: { test: 1 } }]),
		addExecutionHints: jest.fn(),
		getMode: jest.fn().mockReturnValue('evaluation'),
		...options,
	});

	it('should return input data with evaluationData when inputs are provided', () => {
		const context = mockThis();
		const result = setInputs.call(context as any);
		expect(result).toHaveLength(1);
		expect(result[0][0].evaluationData).toEqual({ foo: 'bar', baz: 'qux' });
	});

	it('should throw UserError if no input fields are provided', () => {
		const context = mockThis({
			getNodeParameter: jest.fn().mockReturnValue([]),
		});
		expect(() => setInputs.call(context as any)).toThrow(UserError);
	});

	it('should add execution hints and return input data if not started from evaluation trigger', () => {
		const context = mockThis({
			getParentNodes: jest.fn().mockReturnValue([]),
			getInputData: jest.fn().mockReturnValue([{ json: { test: 2 } }]),
		});
		const result = setInputs.call(context as any);
		expect(context.addExecutionHints).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('No inputs were set'),
			}),
		);
		expect(result).toEqual([[{ json: { test: 2 } }]]);
	});

	it('should add execution hints and return input data if evalTriggerOutput is falsy', () => {
		const context = mockThis({
			evaluateExpression: jest.fn().mockReturnValue(undefined),
			getInputData: jest.fn().mockReturnValue([{ json: { test: 3 } }]),
		});
		const result = setInputs.call(context as any);
		expect(context.addExecutionHints).toHaveBeenCalled();
		expect(result).toEqual([[{ json: { test: 3 } }]]);
	});
});
