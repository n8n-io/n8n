import { render } from '@testing-library/vue';

import { i18n } from '../../locale';
import Spinner from './Spinner.vue';

describe('Spinner', () => {
	afterEach(() => {
		i18n((key) => key);
	});

	it('uses the default accessible loading label', () => {
		const { getByRole } = render(Spinner);
		expect(getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
	});

	it('uses the configured translation for the accessible loading label', () => {
		i18n((key) => (key === 'spinner.loading' ? 'Chargement…' : key));
		const { getByRole } = render(Spinner, { props: { type: 'grid' } });
		expect(getByRole('status', { name: 'Chargement…' })).toBeInTheDocument();
	});

	it('lets callers override the accessible loading label without nesting statuses', () => {
		const { getByRole, getAllByRole } = render(Spinner, {
			attrs: { role: 'status', 'aria-label': 'Loading options' },
		});
		expect(getByRole('status', { name: 'Loading options' })).toBeInTheDocument();
		expect(getAllByRole('status')).toHaveLength(1);
	});

	it('lets callers hide decorative grid spinners', () => {
		const { container, queryByRole } = render(Spinner, { attrs: { 'aria-hidden': 'true' } });
		expect(container.querySelector('.n8n-spinner')).toHaveAttribute('aria-hidden', 'true');
		expect(queryByRole('status')).toBeNull();
	});

	it('renders the grid at medium size by default', () => {
		const { container } = render(Spinner);
		const svg = container.querySelector('[data-spinner="grid"]');
		expect(svg).toHaveAttribute('width', '14');
		expect(svg).toHaveAttribute('height', '14');
		expect(container.querySelectorAll('path')).toHaveLength(4);
	});

	it.each([
		['xsmall', 10],
		['small', 12],
		['medium', 14],
		['large', 16],
		['xlarge', 20],
		['xxlarge', 40],
	] as const)('renders the grid at %s size', (size, pixels) => {
		const { container } = render(Spinner, { props: { type: 'grid', size } });
		const svg = container.querySelector('svg');
		expect(svg).toHaveAttribute('width', String(pixels));
		expect(svg).toHaveAttribute('height', String(pixels));
		expect(svg?.style.width).toBe(`${pixels}px`);
		expect(svg?.style.height).toBe(`${pixels}px`);
	});

	it('still renders the ring and dots variants', () => {
		const ring = render(Spinner, { props: { type: 'ring' } });
		expect(ring.container.querySelectorAll('.lds-ring > div')).toHaveLength(4);
		const dots = render(Spinner, { props: { type: 'dots' } });
		expect(dots.container.querySelector('[data-spinner="grid"]')).toBeNull();
		expect(dots.container.querySelector('.n8n-icon')).not.toBeNull();
	});

	it('renders grid paths in left-to-right row order', () => {
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
});
