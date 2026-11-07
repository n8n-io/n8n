import { render } from '@testing-library/vue';

import Loading from './Loading.vue';

describe('N8nLoading', () => {
	it('renders one paragraph bar for each row', () => {
		const { container } = render(Loading, {
			props: { variant: 'p', rows: 3 },
		});

		expect(container.querySelector('.el-skeleton.is-animated.n8n-loading-p')).toBeInTheDocument();
		expect(container.querySelectorAll('.el-skeleton__p')).toHaveLength(3);
	});

	it('renders one text bar when the variant is text', () => {
		const { container } = render(Loading, {
			props: { variant: 'text' },
		});

		expect(container.querySelectorAll('.el-skeleton__text')).toHaveLength(1);
		expect(container.querySelector('.el-skeleton__p')).not.toBeInTheDocument();
	});

	it('renders one text bar for each column', () => {
		const { container } = render(Loading, {
			props: { cols: 4 },
		});

		expect(container.querySelectorAll('.el-skeleton > .el-skeleton__text')).toHaveLength(4);
	});

	it('hides the bars when loading is false', () => {
		const { container } = render(Loading, {
			props: { loading: false },
		});

		expect(container.querySelector('.el-skeleton')).not.toBeInTheDocument();
	});

	it('keeps the bars still when animation is off', () => {
		const { container } = render(Loading, {
			props: { animated: false, variant: 'text' },
		});

		expect(container.querySelector('.el-skeleton')).not.toHaveClass('is-animated');
	});

	it('shrinks only the last heading row', () => {
		const { container } = render(Loading, {
			props: { variant: 'h1', rows: 2 },
		});
		const bars = container.querySelectorAll('.el-skeleton__h1');

		expect(bars).toHaveLength(2);
		expect(bars[0]?.parentElement?.getAttribute('class')).toBe('');
		expect(bars[1]?.parentElement?.getAttribute('class')).not.toBe('');
	});
});
