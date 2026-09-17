import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import canvasLogoSource from './OemPrototypeCanvasLogo.vue?raw';
import OemPrototypeCanvasLogo from './OemPrototypeCanvasLogo.vue';

const renderComponent = createComponentRenderer(OemPrototypeCanvasLogo);

describe('OemPrototypeCanvasLogo', () => {
	it('should link the n8n canvas logo to the documentation in a new tab', () => {
		const { container, getByRole } = renderComponent();
		const logo = getByRole('link', { name: 'n8n' });

		expect(logo).toHaveAttribute('href', 'https://docs.n8n.io/');
		expect(logo).toHaveAttribute('target', '_blank');
		expect(logo).toHaveAttribute('rel', 'noopener noreferrer');

		const [icon, wordmark] = container.querySelectorAll('svg');
		expect(icon).toHaveAttribute('width', '32');
		expect(icon).toHaveAttribute('height', '26');
		expect(wordmark).toHaveAttribute('width', '26');
		expect(wordmark).toHaveAttribute('height', '26');
	});

	it('should keep the fixed canvas placement and dimensions', () => {
		expect(canvasLogoSource).toContain('\ttop: 20px;\n\tleft: 18px;');
		expect(canvasLogoSource).toContain('\twidth: 60px;\n\theight: 26px;');
	});
});
