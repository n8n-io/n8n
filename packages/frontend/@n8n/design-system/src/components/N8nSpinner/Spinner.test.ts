import { readFileSync } from 'node:fs';
import { render } from '@testing-library/vue';

import Spinner from './Spinner.vue';

const source = readFileSync('src/components/N8nSpinner/Spinner.vue', 'utf8');

describe('Spinner', () => {
	it('renders nine blocks at medium size by default', () => {
		const { container, getByRole } = render(Spinner);
		expect(getByRole('status').classList.contains('blocks-spinner--medium')).toBe(true);
		expect(container.querySelectorAll('.blocks-spinner__block')).toHaveLength(9);
	});

	it.each(['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'] as const)(
		'renders blocks at %s size',
		(size) => {
			const { container, getByRole } = render(Spinner, { props: { type: 'blocks', size } });
			expect(getByRole('status').classList.contains(`blocks-spinner--${size}`)).toBe(true);
			expect(container.querySelectorAll('.blocks-spinner__block')).toHaveLength(9);
		},
	);

	it('keeps grid tracks within the size after gaps', () => {
		expect(source).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
		expect(source).toContain('grid-template-rows: repeat(3, minmax(0, 1fr))');
		expect(source).not.toContain('calc(var(--n8n-spinner-block--size) / 3)');
	});

	it('still renders the ring and dots variants', () => {
		const ring = render(Spinner, { props: { type: 'ring' } });
		expect(ring.container.querySelectorAll('.lds-ring > div')).toHaveLength(4);
		const dots = render(Spinner, { props: { type: 'dots' } });
		expect(dots.container.querySelector('.blocks-spinner')).toBeNull();
		expect(dots.container.querySelector('.n8n-icon')).not.toBeNull();
	});

	it('should render grid blocks in left-to-right row order', () => {
		const { container } = render(Spinner, { props: { type: 'grid' } });
		const svg = container.querySelector('svg');
		const paths = Array.from(container.querySelectorAll('path'));

		expect(svg?.getAttribute('viewBox')).toBe('0 0 7.5 7.5');
		expect(svg?.getAttribute('aria-hidden')).toBe('true');
		expect(svg?.hasAttribute('class')).toBe(false);
		expect(paths.map((path) => path.getAttribute('transform'))).toEqual([
			'translate(0 0)',
			'translate(4 0)',
			'translate(0 4)',
			'translate(4 4)',
		]);
		paths.forEach((path, index) => {
			expect(path.style.getPropertyValue('--spinner-step')).toBe(String(index));
			expect(path.hasAttribute('class')).toBe(false);
		});
	});

	it('should apply the grid size', () => {
		const { container } = render(Spinner, { props: { type: 'grid', size: 'xxlarge' } });
		const svg = container.querySelector('svg');

		expect(svg?.getAttribute('width')).toBe('40');
		expect(svg?.getAttribute('height')).toBe('40');
		expect(svg?.style.width).toBe('40px');
		expect(svg?.style.height).toBe('40px');
	});

	it('should keep the ring option', () => {
		const { container } = render(Spinner, { props: { type: 'ring' } });

		expect(container.querySelectorAll('.lds-ring > div')).toHaveLength(4);
		expect(container.querySelector('[data-spinner="grid"]')).toBeNull();
	});
});
