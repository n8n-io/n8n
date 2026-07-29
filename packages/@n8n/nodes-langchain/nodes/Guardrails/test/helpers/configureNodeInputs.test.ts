import type { GuardrailsOptions } from '../../actions/types';
import { configureNodeInputsV2, hasLLMGuardrails } from '../../helpers/configureNodeInputs';

describe('configureNodeInputs', () => {
	describe('hasLLMGuardrails+configureNodeInputs', () => {
		it.each([
			{
				guardrails: { nsfw: { value: { threshold: 0.5 } } },
				expected: true,
				expectedInputs: 2,
				name: 'nsfw',
			},
			{
				guardrails: { topicalAlignment: { value: { threshold: 0.7, prompt: 'test' } } },
				expected: true,
				expectedInputs: 2,
				name: 'topicalAlignment',
			},
			{
				guardrails: {
					custom: { guardrail: [{ name: 'custom', prompt: 'test prompt', threshold: 0.6 }] },
				},
				expected: true,
				expectedInputs: 2,
				name: 'custom',
			},
			{
				guardrails: { jailbreak: { value: { threshold: 0.8 } } },
				expected: true,
				expectedInputs: 2,
				name: 'jailbreak',
			},
			{
				guardrails: {
					nsfw: { value: { threshold: 0.5 } },
					topicalAlignment: { value: { threshold: 0.7, prompt: 'test' } },
					custom: { guardrail: [{ name: 'custom1', prompt: 'test prompt', threshold: 0.6 }] },
					jailbreak: { value: { threshold: 0.8 } },
				},
				expectedInputs: 2,
				name: 'multiple LLM checks',
				expected: true,
			},
			{
				guardrails: {
					keywords: 'test, keywords',
					pii: { value: { type: 'all' } },
				},
				expected: false,
				expectedInputs: 1,
				name: 'only non-LLM checks',
			},
			{
				guardrails: {},
				expected: false,
				expectedInputs: 1,
				name: 'empty guardrails',
			},
			{
				guardrails: undefined,
				expected: false,
				expectedInputs: 1,
				name: 'undefined guardrails',
			},
		])(
			'should return $expected when guardrails contain $name',
			({ guardrails, expected, expectedInputs }) => {
				expect(hasLLMGuardrails(guardrails as GuardrailsOptions)).toBe(expected);
				expect(configureNodeInputsV2({ guardrails: guardrails as GuardrailsOptions })).toHaveLength(
					expectedInputs,
				);
			},
		);
	});
});
