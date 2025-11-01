import type { INodeParameters, INodePropertyOptions } from 'n8n-workflow';

// Import the function and property
import { numberInputsProperty, configuredInputs } from '../helpers';

// We need to extract the configuredInputs function for testing
// Since it's not exported, we'll test it indirectly through the node's inputs property

describe('ModelSelector Configuration', () => {
	describe('numberInputsProperty', () => {
		it('should have correct configuration', () => {
			expect(numberInputsProperty.displayName).toBe('Number of Inputs');
			expect(numberInputsProperty.name).toBe('numberInputs');
			expect(numberInputsProperty.type).toBe('options');
			expect(numberInputsProperty.default).toBe(2);
			expect(numberInputsProperty.validateType).toBe('number');
		});

		it('should have options from 2 to 10', () => {
			const options = numberInputsProperty.options as INodePropertyOptions[];
			expect(options).toHaveLength(9);
			expect(options[0]).toEqual({ name: '2', value: 2 });
			expect(options[8]).toEqual({ name: '10', value: 10 });
		});

		it('should have all sequential values from 2 to 10', () => {
			const expectedValues = [2, 3, 4, 5, 6, 7, 8, 9, 10];
			const options = numberInputsProperty.options as INodePropertyOptions[];
			const actualValues = options.map((option) => option.value);
			expect(actualValues).toEqual(expectedValues);
		});
	});

	describe('configuredInputs function', () => {
		it('should generate correct input configuration for default value', () => {
			const parameters: INodeParameters = { numberInputs: 2 };
			const result = configuredInputs(parameters);

			expect(result).toEqual([
				{ type: 'ai_languageModel', displayName: 'Model 1', required: true, maxConnections: 1 },
				{ type: 'ai_languageModel', displayName: 'Model 2', required: true, maxConnections: 1 },
			]);
		});

		it('should generate correct input configuration for custom value', () => {
			const parameters: INodeParameters = { numberInputs: 5 };
			const result = configuredInputs(parameters);

			expect(result).toEqual([
				{ type: 'ai_languageModel', displayName: 'Model 1', required: true, maxConnections: 1 },
				{ type: 'ai_languageModel', displayName: 'Model 2', required: true, maxConnections: 1 },
				{ type: 'ai_languageModel', displayName: 'Model 3', required: true, maxConnections: 1 },
				{ type: 'ai_languageModel', displayName: 'Model 4', required: true, maxConnections: 1 },
				{ type: 'ai_languageModel', displayName: 'Model 5', required: true, maxConnections: 1 },
			]);
		});

		it('should handle undefined numberInputs parameter', () => {
			const parameters: INodeParameters = {};
			const result = configuredInputs(parameters);

			expect(result).toEqual([
				{ type: 'ai_languageModel', displayName: 'Model 1', required: true, maxConnections: 1 },
				{ type: 'ai_languageModel', displayName: 'Model 2', required: true, maxConnections: 1 },
			]);
		});
	});
});
