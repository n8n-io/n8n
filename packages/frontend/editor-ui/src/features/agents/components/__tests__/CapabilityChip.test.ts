import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import CapabilityChip from '../CapabilityChip.vue';

const renderComponent = createComponentRenderer(CapabilityChip, {
	props: { text: 'Replies in English' },
});

describe('CapabilityChip', () => {
	it('shows the text with no icon for the default neutral status', () => {
		const { getByText, container } = renderComponent();

		expect(getByText('Replies in English')).toBeInTheDocument();
		expect(container.querySelector('[data-icon]')).not.toBeInTheDocument();
		expect(container.querySelector('[class*="pass"]')).not.toBeInTheDocument();
		expect(container.querySelector('[class*="fail"]')).not.toBeInTheDocument();
	});

	it('shows a pass icon for a pass status', () => {
		const { container } = renderComponent({ props: { status: 'pass' } });

		const icon = container.querySelector('[data-icon="circle-check"]');
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveClass('passIcon');
	});

	it('shows a fail icon for a fail status', () => {
		const { container } = renderComponent({ props: { status: 'fail' } });

		const icon = container.querySelector('[data-icon="triangle-alert"]');
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveClass('failIcon');
	});

	it('shows only the custom icon when given with a neutral status', () => {
		const { container } = renderComponent({ props: { icon: 'globe' } });

		expect(container.querySelectorAll('[data-icon]')).toHaveLength(1);
		expect(container.querySelector('[data-icon="globe"]')).toBeInTheDocument();
	});

	it('shows the custom icon and the status icon together for a pass status', () => {
		const { container } = renderComponent({ props: { icon: 'globe', status: 'pass' } });

		expect(container.querySelector('[data-icon="globe"]')).toBeInTheDocument();
		const statusIcon = container.querySelector('[data-icon="circle-check"]');
		expect(statusIcon).toBeInTheDocument();
		expect(statusIcon).toHaveClass('passIcon');
	});
});
