import { EXTENDED_PROMPT_MAX_LENGTH } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';
import { buildFixWithAiPrompt, isFixWithAiError } from '../fixWithAi';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) => {
			if (!options?.interpolate) return key;
			return `${key}:${JSON.stringify(options.interpolate)}`;
		},
	}),
}));

describe('isFixWithAiError', () => {
	it('accepts valid error objects', () => {
		expect(isFixWithAiError({ nodeName: 'HTTP Request', errorMessage: 'failed' })).toBe(true);
	});

	it('rejects invalid values', () => {
		expect(isFixWithAiError(null)).toBe(false);
		expect(isFixWithAiError({ nodeName: 'HTTP Request' })).toBe(false);
		expect(isFixWithAiError({ nodeName: 1, errorMessage: 'x' })).toBe(false);
	});
});

describe('buildFixWithAiPrompt', () => {
	it('builds a single-node prompt with workflow name', () => {
		expect(
			buildFixWithAiPrompt({
				workflowName: 'My Workflow',
				errors: [{ nodeName: 'Extract Emails', errorMessage: 'boom' }],
			}),
		).toContain('instanceAi.fixWithAi.prompt.singleInWorkflow');
	});

	it('builds a single-node prompt without workflow name', () => {
		expect(
			buildFixWithAiPrompt({
				errors: [{ nodeName: 'Extract Emails', errorMessage: 'boom' }],
			}),
		).toContain('instanceAi.fixWithAi.prompt.single');
	});

	it('builds a multi-node prompt with workflow name', () => {
		expect(
			buildFixWithAiPrompt({
				workflowName: 'My Workflow',
				errors: [
					{ nodeName: 'Node A', errorMessage: 'first' },
					{ nodeName: 'Node B', errorMessage: 'second' },
				],
			}),
		).toContain('instanceAi.fixWithAi.prompt.multipleInWorkflow');
	});

	it('keeps short errors and cuts long errors to a prefix', () => {
		const longError = 'x'.repeat(30_000);
		const single = buildFixWithAiPrompt({
			errors: [{ nodeName: 'Node A', errorMessage: longError }],
		});
		const multiple = buildFixWithAiPrompt({
			errors: [
				{ nodeName: 'Node A', errorMessage: 'Parameter URL is required' },
				{ nodeName: 'Node B', errorMessage: longError },
			],
		});

		expect(single).toContain(`${'x'.repeat(500)}...`);
		expect(single).not.toContain('x'.repeat(501));
		expect(multiple).toContain('Parameter URL is required');
		expect(multiple).not.toContain('x'.repeat(501));
	});

	it('keeps the prompt under the message limit when many nodes fail with long errors', () => {
		const errors = Array.from({ length: 60 }, (_, index) => ({
			nodeName: `Node ${String(index).padStart(2, '0')}`,
			errorMessage: 'x'.repeat(30_000),
		}));

		const prompt = buildFixWithAiPrompt({ errors });

		expect(prompt.length).toBeLessThanOrEqual(EXTENDED_PROMPT_MAX_LENGTH);
		for (const { nodeName } of errors) {
			expect(prompt).toContain(nodeName);
		}
	});
});
