import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import OemPrototypeCanvasLogo from './OemPrototypeCanvasLogo.vue';

const renderComponent = createComponentRenderer(OemPrototypeCanvasLogo);

describe('OemPrototypeCanvasLogo', () => {
	it('should link the n8n canvas logo to the documentation in a new tab', () => {
		const { getByRole } = renderComponent();

		expect(getByRole('link', { name: 'n8n' })).toHaveAttribute('href', 'https://docs.n8n.io/');
		expect(getByRole('link', { name: 'n8n' })).toHaveAttribute('target', '_blank');
		expect(getByRole('link', { name: 'n8n' })).toHaveAttribute('rel', 'noopener noreferrer');
	});
});
