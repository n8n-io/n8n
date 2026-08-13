import { describe, it, expect } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import AskModeCoachmark from './AskModeCoachmark.vue';

const renderComponent = createComponentRenderer(AskModeCoachmark);

describe('AskModeCoachmark', () => {
	it('renders slot content and hides tooltip when not visible', () => {
		const { getByText, queryByText } = renderComponent({
			props: { visible: false },
			slots: { default: '<button>Toggle Button</button>' },
		});

		expect(getByText('Toggle Button')).toBeInTheDocument();

		// Tooltip content should not be in DOM when not visible (Reka UI behavior)
		expect(queryByText('Ask mode enabled')).not.toBeInTheDocument();
	});

	it('renders coachmark content when visible', async () => {
		const { getByText } = renderComponent({
			props: { visible: true },
			slots: { default: '<button>Toggle Button</button>' },
		});

		// Wait for tooltip content to appear in portal
		await waitFor(() => {
			expect(getByText('Ask mode enabled')).toBeInTheDocument();
			expect(
				getByText(
					'Ask questions about n8n, get help with errors, or learn about automation. Switch to Build anytime to create workflows.',
				),
			).toBeInTheDocument();
			expect(getByText('Got it')).toBeInTheDocument();
		});
	});

	it('emits dismiss event when Got it button is clicked', async () => {
		const { getByText, emitted } = renderComponent({
			props: { visible: true },
			slots: { default: '<button>Toggle Button</button>' },
		});

		// Wait for tooltip content to appear in portal
		await waitFor(() => {
			expect(getByText('Got it')).toBeInTheDocument();
		});

		await fireEvent.click(getByText('Got it'));

		expect(emitted().dismiss).toHaveLength(1);
	});
});
