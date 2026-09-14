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
});
