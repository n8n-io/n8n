import { NodeConnectionTypes } from 'n8n-workflow';

import { getInputs, nodeProperties } from '../methods/config';

describe('config', () => {
	describe('getInputs', () => {
		it('should return basic inputs for all parameters', () => {
			const inputs = getInputs({});

			expect(inputs).toHaveLength(4);
			expect(inputs[0].type).toBe(NodeConnectionTypes.Main);
			expect(inputs[1].type).toBe(NodeConnectionTypes.AiLanguageModel);
			expect(inputs[2].type).toBe(NodeConnectionTypes.AiLanguageModel);
			expect(inputs[3].type).toBe(NodeConnectionTypes.AiOutputParser);
		});

		it('should exclude the OutputParser when hasOutputParser is false', () => {
			const inputs = getInputs({ hasOutputParser: false });

			expect(inputs).toHaveLength(3);
			expect(inputs[0].type).toBe(NodeConnectionTypes.Main);
			expect(inputs[1].type).toBe(NodeConnectionTypes.AiLanguageModel);
			expect(inputs[2].type).toBe(NodeConnectionTypes.AiLanguageModel);
		});

		it('should include the OutputParser when hasOutputParser is true', () => {
			const inputs = getInputs({ hasOutputParser: true });

			expect(inputs).toHaveLength(4);
			expect(inputs[3].type).toBe(NodeConnectionTypes.AiOutputParser);
		});

		it('should exclude the FallbackInput when needsFallback is false', () => {
			const inputs = getInputs({ hasOutputParser: true, needsFallback: false });

			expect(inputs).toHaveLength(3);
			expect(inputs[0].type).toBe(NodeConnectionTypes.Main);
			expect(inputs[1].type).toBe(NodeConnectionTypes.AiLanguageModel);
			expect(inputs[2].type).toBe(NodeConnectionTypes.AiOutputParser);
		});

		it('should include the FallbackInput when needsFallback is true', () => {
			const inputs = getInputs({ hasOutputParser: false, needsFallback: true });

			expect(inputs).toHaveLength(3);
			expect(inputs[2].type).toBe(NodeConnectionTypes.AiLanguageModel);
		});
	});

	describe('nodeProperties', () => {
		it('should have the expected properties', () => {
			expect(Array.isArray(nodeProperties)).toBe(true);
			expect(nodeProperties.length).toBeGreaterThan(0);

			const promptParams = nodeProperties.filter((prop) => prop.name === 'prompt');
			expect(promptParams.length).toBeGreaterThan(0);

			const messagesParam = nodeProperties.find((prop) => prop.name === 'messages');
			expect(messagesParam).toBeDefined();
			expect(messagesParam?.type).toBe('fixedCollection');

			const hasOutputParserParam = nodeProperties.find((prop) => prop.name === 'hasOutputParser');
			expect(hasOutputParserParam).toBeDefined();
			expect(hasOutputParserParam?.type).toBe('boolean');
		});
	});
});
