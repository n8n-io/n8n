import { render } from '@testing-library/vue';

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
});
