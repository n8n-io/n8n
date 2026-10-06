import { render } from '@testing-library/vue';

import Spinner from './Spinner.vue';

describe('Spinner', () => {
	it('should render grid blocks in left-to-right row order', () => {
		const { container } = render(Spinner, { props: { type: 'grid' } });
		const svg = container.querySelector('svg');
		const paths = Array.from(container.querySelectorAll('path'));

		expect(svg?.getAttribute('viewBox')).toBe('0 0 11 11');
		expect(svg?.getAttribute('aria-hidden')).toBe('true');
		expect(svg?.hasAttribute('class')).toBe(false);
		expect(paths.map((path) => path.getAttribute('transform'))).toEqual([
			'translate(0 0)',
			'translate(4 0)',
			'translate(8 0)',
			'translate(0 4)',
			'translate(4 4)',
			'translate(8 4)',
			'translate(0 8)',
			'translate(4 8)',
			'translate(8 8)',
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
