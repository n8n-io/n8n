import { describe, expect, it } from 'vitest';
import { useFixWithAiOffer } from '../useFixWithAiOffer';

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
