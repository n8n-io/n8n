import { readFileSync } from 'node:fs';
import { render } from '@testing-library/vue';

import Spinner from './Spinner.vue';
const source = readFileSync('src/components/N8nSpinner/Spinner.vue', 'utf8');

describe('N8nSpinner', () => {
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
});
