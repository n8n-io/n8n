import { useClipboard } from '@n8n/composables/useClipboard';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { render, waitFor } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import CustomActionWizardModal from './CustomActionWizardModal.vue';

// The real dialog renders here. The wizard body is a probe with an input.
vi.mock('./CustomActionWizard.vue', () => ({
	default: defineComponent({
		setup: () => () => h('input', { 'data-test-id': 'wizard-probe-input' }),
	}),
}));

const renderModal = createComponentRenderer(CustomActionWizardModal);

/** Stands in for the canvas, which listens for pastes on the document with `useClipboard`. */
const mountCanvasPasteListener = (onPaste: (text: string) => void) =>
	render(
		defineComponent({
			setup() {
				useClipboard({ onPaste });
				return () => h('div');
			},
		}),
	);

const pasteEvent = (text: string) => {
	const event = new Event('paste', { bubbles: true });
	Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
	return event;
};

describe('CustomActionWizardModal over the canvas', () => {
	it('keeps a paste in the wizard away from the canvas', async () => {
		const onCanvasPaste = vi.fn();
		mountCanvasPasteListener(onCanvasPaste);
		renderModal({ props: { open: true } });

		const input = await waitFor(() => {
			const element = document.querySelector('[data-test-id="wizard-probe-input"]');
			if (!element) throw new Error('The wizard is not open yet');
			return element;
		});
		input.dispatchEvent(pasteEvent('https://api.example.com/v1/items'));

		expect(onCanvasPaste).not.toHaveBeenCalled();
	});

	it('marks the wizard so that canvas shortcuts ignore its keys', async () => {
		renderModal({ props: { open: true } });

		const input = await waitFor(() => {
			const element = document.querySelector('[data-test-id="wizard-probe-input"]');
			if (!element) throw new Error('The wizard is not open yet');
			return element;
		});

		expect(input.closest('[role="dialog"]')).not.toBeNull();
		expect(input.closest('.ignore-key-press-canvas')).not.toBeNull();
	});
});
