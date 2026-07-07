import type { IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

// helpers.ts imports schemaParsing (which imports @n8n/json-schema-to-zod) at module top
// level. getPromptInputByType does not use it, so stub it out to avoid relying on that
// package's ESM build being present in the test environment.
vi.mock('./schemaParsing', () => ({
	convertJsonSchemaToZod: vi.fn(),
}));

import { getPromptInputByType } from './helpers';

const mockContext = (
	chatInput: NodeParameterValueType,
	guardrailsInput: NodeParameterValueType,
) => {
	const ctx = mock<IExecuteFunctions>();
	ctx.getNode.mockReturnValue(mock<INode>());
	ctx.getNodeParameter.mockImplementation((key) => {
		if (key === 'promptType') return 'auto';
		return undefined;
	});
	ctx.evaluateExpression.mockImplementation((expr) => {
		if (expr.includes('chatInput')) return chatInput;
		if (expr.includes('guardrailsInput')) return guardrailsInput;
		return undefined;
	});
	return ctx;
};

describe('getPromptInputByType', () => {
	describe('auto mode guardrails fallback', () => {
		it('should fall back to guardrailsInput when chatInput is falsy and fallbackToGuardrails is enabled', () => {
			const ctx = mockContext('', 'guardrails prompt');

			const input = getPromptInputByType({
				ctx,
				i: 0,
				promptTypeKey: 'promptType',
				inputKey: 'text',
				fallbackToGuardrails: true,
			});

			expect(input).toBe('guardrails prompt');
		});

		it('should NOT fall back to guardrailsInput when fallbackToGuardrails is disabled (default)', () => {
			const ctx = mockContext('', 'guardrails prompt');

			const input = getPromptInputByType({
				ctx,
				i: 0,
				promptTypeKey: 'promptType',
				inputKey: 'text',
			});

			// Without the flag, the empty chatInput is returned as-is; the empty string is
			// not undefined, so no error is thrown, but no fallback occurs either.
			expect(input).toBe('');
			expect(ctx.evaluateExpression).not.toHaveBeenCalledWith('{{ $json["guardrailsInput"] }}', 0);
		});

		it('should use chatInput and skip the fallback when chatInput is present', () => {
			const ctx = mockContext('chat prompt', 'guardrails prompt');

			const input = getPromptInputByType({
				ctx,
				i: 0,
				promptTypeKey: 'promptType',
				inputKey: 'text',
				fallbackToGuardrails: true,
			});

			expect(input).toBe('chat prompt');
			expect(ctx.evaluateExpression).not.toHaveBeenCalledWith('{{ $json["guardrailsInput"] }}', 0);
		});
	});
});
