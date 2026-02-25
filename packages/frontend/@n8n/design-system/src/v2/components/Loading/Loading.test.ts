import { render } from '@testing-library/vue';

import { SKELETON_VARIANTS } from './Loading.types';
import Loading from './Loading.vue';

describe('v2/components/Loading', () => {
	describe('rendering', () => {
		it('should render when loading is true (default)', () => {
			const wrapper = render(Loading);
			expect(wrapper.container.querySelector('.n8n-loading')).toBeInTheDocument();
		});

		it('should not render when loading is false', () => {
			const wrapper = render(Loading, {
				props: { loading: false },
			});
			expect(wrapper.container.querySelector('.n8n-loading')).not.toBeInTheDocument();
		});

		it('should have aria-hidden attribute for accessibility', () => {
			const wrapper = render(Loading);
			expect(wrapper.container.querySelector('.n8n-loading')).toHaveAttribute(
				'aria-hidden',
				'true',
			);
		});
	});

	describe('CSS classes', () => {
		it('should apply n8n-loading base class', () => {
			const wrapper = render(Loading);
			expect(wrapper.container.querySelector('.n8n-loading')).toBeInTheDocument();
		});

		it('should apply variant-specific class', () => {
			const wrapper = render(Loading, {
				props: { variant: 'h1' },
			});
			expect(wrapper.container.querySelector('.n8n-loading-h1')).toBeInTheDocument();
		});

		it('should apply default variant class (p)', () => {
			const wrapper = render(Loading);
			expect(wrapper.container.querySelector('.n8n-loading-p')).toBeInTheDocument();
		});
	});

	describe('variants', () => {
		test.each(SKELETON_VARIANTS)('should render variant "%s"', (variant) => {
			const wrapper = render(Loading, {
				props: { variant },
			});
			expect(wrapper.container.querySelector(`.n8n-loading-${variant}`)).toBeInTheDocument();
		});
	});

	describe('rows prop', () => {
		it('should render single row by default', () => {
			const wrapper = render(Loading, {
				props: { variant: 'p' },
			});
			const container = wrapper.container.querySelector('.n8n-loading');
			const items = container?.querySelectorAll('[class*="item"]');
			expect(items).toHaveLength(1);
		});

		it('should render multiple rows for p variant', () => {
			const wrapper = render(Loading, {
				props: { variant: 'p', rows: 3 },
			});
			const container = wrapper.container.querySelector('.n8n-loading');
			const items = container?.querySelectorAll('[class*="item"]');
			expect(items).toHaveLength(3);
		});

		it('should render multiple rows for h1 variant', () => {
			const wrapper = render(Loading, {
				props: { variant: 'h1', rows: 2 },
			});
			const container = wrapper.container.querySelector('.n8n-loading');
			const items = container?.querySelectorAll('[class*="item"]');
			expect(items).toHaveLength(2);
		});
	});

	describe('cols prop', () => {
		it('should render columns when cols is set', () => {
			const wrapper = render(Loading, {
				props: { cols: 4 },
			});
			const container = wrapper.container.querySelector('.n8n-loading');
			const items = container?.querySelectorAll('[class*="item"]');
			expect(items).toHaveLength(4);
		});

		it('should override row-based layout when cols is set', () => {
			const wrapper = render(Loading, {
				props: { rows: 5, cols: 3 },
			});
			const container = wrapper.container.querySelector('.n8n-loading');
			const items = container?.querySelectorAll('[class*="item"]');
			expect(items).toHaveLength(3);
		});
	});

	describe('shrinkLast prop', () => {
		it('should apply h1Last class to last row for h1 variant when shrinkLast is true', () => {
			const wrapper = render(Loading, {
				props: { variant: 'h1', rows: 2, shrinkLast: true },
			});
			expect(wrapper.container.querySelector('[class*="h1Last"]')).toBeInTheDocument();
		});

		it('should apply pLast class to last row for p variant when shrinkLast is true', () => {
			const wrapper = render(Loading, {
				props: { variant: 'p', rows: 2, shrinkLast: true },
			});
			expect(wrapper.container.querySelector('[class*="pLast"]')).toBeInTheDocument();
		});

		it('should not apply shrink class when shrinkLast is false', () => {
			const wrapper = render(Loading, {
				props: { variant: 'p', rows: 2, shrinkLast: false },
			});
			expect(wrapper.container.querySelector('[class*="pLast"]')).not.toBeInTheDocument();
		});

		it('should not apply shrink class when rows is 1', () => {
			const wrapper = render(Loading, {
				props: { variant: 'p', rows: 1, shrinkLast: true },
			});
			expect(wrapper.container.querySelector('[class*="pLast"]')).not.toBeInTheDocument();
		});
	});

	describe('animated prop', () => {
		it('should apply animated class by default', () => {
			const wrapper = render(Loading);
			expect(wrapper.container.querySelector('[class*="animated"]')).toBeInTheDocument();
		});

		it('should not apply animated class when animated is false', () => {
			const wrapper = render(Loading, {
				props: { animated: false },
			});
			expect(wrapper.container.querySelector('[class*="animated"]')).not.toBeInTheDocument();
		});
	});

	describe('custom variant', () => {
		it('should render with 100% dimensions for custom variant', () => {
			const wrapper = render(Loading, {
				props: { variant: 'custom' },
			});
			expect(wrapper.container.querySelector('.n8n-loading-custom')).toBeInTheDocument();
			expect(wrapper.container.querySelector('[class*="custom"]')).toBeInTheDocument();
		});
	});

	describe('backward compatibility', () => {
		it('should have n8n-loading class for global CSS selectors', () => {
			const wrapper = render(Loading);
			expect(wrapper.container.querySelector('.n8n-loading')).toBeInTheDocument();
		});

		it('should have variant class for global CSS selectors', () => {
			const wrapper = render(Loading, {
				props: { variant: 'button' },
			});
			expect(wrapper.container.querySelector('.n8n-loading-button')).toBeInTheDocument();
		});
	});
});
