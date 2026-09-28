import { render } from '@testing-library/vue';

import N8nStatusDot from './StatusDot.vue';

describe('components/N8nStatusDot', () => {
	it('should render success variant without pulse by default', () => {
		const wrapper = render(N8nStatusDot);
		const dot = wrapper.container.firstElementChild;
		expect(dot?.className).toContain('success');
		expect(dot?.className).not.toContain('pulse');
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should be hidden from assistive technology', () => {
		const wrapper = render(N8nStatusDot);
		expect(wrapper.container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
	});

	it.each(['success', 'warning', 'danger'] as const)(
		'should render %s variant class',
		(variant) => {
			const wrapper = render(N8nStatusDot, {
				props: { variant },
			});
			expect(wrapper.container.firstElementChild?.className).toContain(variant);
		},
	);

	it('should render pulse class when pulse is enabled', () => {
		const wrapper = render(N8nStatusDot, {
			props: { pulse: true },
		});
		expect(wrapper.container.firstElementChild?.className).toContain('pulse');
		expect(wrapper.html()).toMatchSnapshot();
	});
});
