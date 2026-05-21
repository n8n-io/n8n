import { describe, expect, it } from 'vitest';
import { buildFixWithAiPrompt, isFixWithAiError, useFixWithAiOffer } from '../useFixWithAiOffer';

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

	it('builds a multi-node prompt', () => {
		const prompt = buildFixWithAiPrompt({
			workflowName: 'My Workflow',
			errors: [
				{ nodeName: 'Node A', errorMessage: 'first' },
				{ nodeName: 'Node B', errorMessage: 'second' },
			],
		});

		expect(prompt).toContain('instanceAi.fixWithAi.prompt.multipleInWorkflow');
	});
});

describe('useFixWithAiOffer', () => {
	it('registerOffer stores failures reported from the preview iframe', () => {
		const { offersByWorkflow, registerOffer } = useFixWithAiOffer();

		registerOffer({
			workflowId: 'wf-1',
			workflowName: 'My Workflow',
			executionId: 'exec-99',
			errors: [{ nodeName: 'Extract Emails', errorMessage: 'boom' }],
		});

		expect(offersByWorkflow.value.get('wf-1')).toEqual({
			workflowId: 'wf-1',
			workflowName: 'My Workflow',
			executionId: 'exec-99',
			errors: [{ nodeName: 'Extract Emails', errorMessage: 'boom' }],
		});
	});

	it('ignores registerOffer when errors array is empty', () => {
		const { offersByWorkflow, registerOffer } = useFixWithAiOffer();

		registerOffer({
			workflowId: 'wf-1',
			executionId: 'exec-99',
			errors: [],
		});

		expect(offersByWorkflow.value.has('wf-1')).toBe(false);
	});

	it('tracks dismiss state by execution id', () => {
		const { dismiss, isDismissed } = useFixWithAiOffer();

		dismiss('exec-1');
		expect(isDismissed('exec-1')).toBe(true);
		expect(isDismissed('exec-2')).toBe(false);
	});

	it('cleanup clears offers and dismiss state', () => {
		const { offersByWorkflow, registerOffer, dismiss, cleanup, isDismissed } = useFixWithAiOffer();

		registerOffer({
			workflowId: 'wf-1',
			executionId: 'exec-1',
			errors: [{ nodeName: 'Node', errorMessage: 'failed' }],
		});
		dismiss('exec-1');
		cleanup();

		expect(offersByWorkflow.value.size).toBe(0);
		expect(isDismissed('exec-1')).toBe(false);
	});
});
