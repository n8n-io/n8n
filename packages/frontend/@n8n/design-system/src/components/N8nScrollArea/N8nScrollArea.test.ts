import { render } from '@testing-library/vue';
import { nextTick } from 'vue';

import N8nScrollArea from './N8nScrollArea.vue';

describe('N8nScrollArea', () => {
	it('should render correctly with default props', () => {
		const wrapper = render(N8nScrollArea, {
			slots: {
				default: '<div>Test content</div>',
			},
		});

		expect(wrapper.container).toMatchSnapshot();
	});

	it('should render with custom type prop', () => {
		const wrapper = render(N8nScrollArea, {
			props: {
				type: 'always',
			},
			slots: {
				default: '<div>Test content</div>',
			},
		});

		const scrollAreaRoot = wrapper.container.querySelector('.scrollAreaRoot');
		expect(scrollAreaRoot).toBeInTheDocument();
	});

	it('should render with maxHeight style when provided', () => {
		const wrapper = render(N8nScrollArea, {
			props: {
				maxHeight: '200px',
			},
			slots: {
				default: '<div>Test content</div>',
			},
		});

		const viewport = wrapper.container.querySelector('[style*="max-height"]');
		expect(viewport).toHaveStyle({ maxHeight: '200px' });
	});

	it('should render with maxWidth style when provided', () => {
		const wrapper = render(N8nScrollArea, {
			props: {
				maxWidth: '300px',
			},
			slots: {
				default: '<div>Test content</div>',
			},
		});

		const viewport = wrapper.container.querySelector('[style*="max-width"]');
		expect(viewport).toHaveStyle({ maxWidth: '300px' });
	});

	it('should render with enableVerticalScroll prop', () => {
		const wrapper = render(N8nScrollArea, {
			props: {
				enableVerticalScroll: true,
			},
			slots: {
				default: '<div>Test content</div>',
			},
		});

		// Check that the component renders successfully with the prop
		expect(wrapper.container.querySelector('.scrollAreaRoot')).toBeInTheDocument();
		expect(wrapper.container.querySelector('.viewport')).toBeInTheDocument();
	});

	it('should render with enableHorizontalScroll prop', () => {
		const wrapper = render(N8nScrollArea, {
			props: {
				enableHorizontalScroll: true,
			},
			slots: {
				default: '<div>Test content</div>',
			},
		});

		// Check that the component renders successfully with the prop
		expect(wrapper.container.querySelector('.scrollAreaRoot')).toBeInTheDocument();
		expect(wrapper.container.querySelector('.viewport')).toBeInTheDocument();
	});

	it('should render with both scroll directions enabled', () => {
		const wrapper = render(N8nScrollArea, {
			props: {
				enableVerticalScroll: true,
				enableHorizontalScroll: true,
			},
			slots: {
				default: '<div>Test content</div>',
			},
		});

		// Check that the component renders successfully with both props
		expect(wrapper.container.querySelector('.scrollAreaRoot')).toBeInTheDocument();
		expect(wrapper.container.querySelector('.viewport')).toBeInTheDocument();
	});

	it('should render with scroll disabled', () => {
		const wrapper = render(N8nScrollArea, {
			props: {
				enableVerticalScroll: false,
				enableHorizontalScroll: false,
			},
			slots: {
				default: '<div>Test content</div>',
			},
		});

		// Check that the component still renders properly even with scrollbars disabled
		expect(wrapper.container.querySelector('.scrollAreaRoot')).toBeInTheDocument();
		expect(wrapper.container.querySelector('.viewport')).toBeInTheDocument();
	});

	it('should pass dir prop to ScrollAreaRoot', () => {
		const wrapper = render(N8nScrollArea, {
			props: {
				dir: 'rtl',
			},
			slots: {
				default: '<div>Test content</div>',
			},
		});

		const scrollAreaRoot = wrapper.container.querySelector('.scrollAreaRoot');
		expect(scrollAreaRoot).toHaveAttribute('dir', 'rtl');
	});

	it('should pass scrollHideDelay prop to ScrollAreaRoot', () => {
		const wrapper = render(N8nScrollArea, {
			props: {
				scrollHideDelay: 1000,
			},
			slots: {
				default: '<div>Test content</div>',
			},
		});

		// Note: This would need to be tested with more sophisticated testing
		// as the scrollHideDelay is an internal prop that affects behavior
		expect(wrapper.container).toMatchSnapshot();
	});

	describe('edgeFade', () => {
		const fadeClasses = ['fadeTop', 'fadeBottom', 'fadeLeft', 'fadeRight', 'fadeY', 'fadeX'];

		function getViewport(container: Element) {
			return container.querySelector<HTMLElement>('[data-reka-scroll-area-viewport]')!;
		}

		function setMetric(element: HTMLElement, name: string, value: number) {
			Object.defineProperty(element, name, { configurable: true, writable: true, value });
		}

		async function scrollVertically(viewport: HTMLElement, scrollTop: number) {
			setMetric(viewport, 'scrollHeight', 200);
			setMetric(viewport, 'clientHeight', 100);
			setMetric(viewport, 'scrollTop', scrollTop);
			viewport.dispatchEvent(new Event('scroll'));
			await nextTick();
		}

		async function scrollHorizontally(viewport: HTMLElement, scrollLeft: number) {
			setMetric(viewport, 'scrollWidth', 200);
			setMetric(viewport, 'clientWidth', 100);
			setMetric(viewport, 'scrollLeft', scrollLeft);
			viewport.dispatchEvent(new Event('scroll'));
			await nextTick();
		}

		function expectOnly(viewport: HTMLElement, fadeClass: string | undefined) {
			for (const name of fadeClasses) {
				if (name === fadeClass) expect(viewport).toHaveClass(name);
				else expect(viewport).not.toHaveClass(name);
			}
		}

		it('masks no edge by default', () => {
			const wrapper = render(N8nScrollArea, { slots: { default: '<div>Test content</div>' } });

			const viewport = getViewport(wrapper.container);
			for (const fadeClass of fadeClasses) {
				expect(viewport).not.toHaveClass(fadeClass);
			}
		});

		it('masks no edge when the content fits', async () => {
			const wrapper = render(N8nScrollArea, {
				props: { edgeFade: 'y' },
				slots: { default: '<div>Test content</div>' },
			});

			await nextTick();
			expectOnly(getViewport(wrapper.container), undefined);
		});

		it('masks the bottom edge while content sits below the viewport', async () => {
			const wrapper = render(N8nScrollArea, {
				props: { edgeFade: 'bottom' },
				slots: { default: '<div>Test content</div>' },
			});
			const viewport = getViewport(wrapper.container);

			await scrollVertically(viewport, 0);
			expectOnly(viewport, 'fadeBottom');
		});

		it('clears the bottom edge at the end of the list', async () => {
			const wrapper = render(N8nScrollArea, {
				props: { edgeFade: 'bottom' },
				slots: { default: '<div>Test content</div>' },
			});
			const viewport = getViewport(wrapper.container);

			await scrollVertically(viewport, 100);
			expectOnly(viewport, undefined);
		});

		it('masks only the hidden end of a vertical axis', async () => {
			const wrapper = render(N8nScrollArea, {
				props: { edgeFade: 'y' },
				slots: { default: '<div>Test content</div>' },
			});
			const viewport = getViewport(wrapper.container);

			await scrollVertically(viewport, 0);
			expectOnly(viewport, 'fadeBottom');

			await scrollVertically(viewport, 40);
			expectOnly(viewport, 'fadeY');

			await scrollVertically(viewport, 100);
			expectOnly(viewport, 'fadeTop');
		});

		it('masks only the hidden end of a horizontal axis', async () => {
			const wrapper = render(N8nScrollArea, {
				props: { edgeFade: 'x' },
				slots: { default: '<div>Test content</div>' },
			});
			const viewport = getViewport(wrapper.container);

			await scrollHorizontally(viewport, 0);
			expectOnly(viewport, 'fadeRight');

			await scrollHorizontally(viewport, 40);
			expectOnly(viewport, 'fadeX');

			await scrollHorizontally(viewport, 100);
			expectOnly(viewport, 'fadeLeft');
		});
	});
});
