import { render, screen } from '@testing-library/vue';

import N8nBadge from './Badge.vue';

describe('components', function describeComponents() {
	describe('N8nBadge', function describeN8nBadge() {
		describe('props', function describeProps() {
			it('should render with default values correctly', function testDefaultValues() {
				const wrapper = render(N8nBadge, {
					slots: {
						default: 'Default badge',
					},
				});

				expect(screen.getByText('Default badge')).toBeVisible();
				expect(wrapper.html()).toMatchSnapshot();
			});

			it('should render the selected variant and size', function testVariantAndSize() {
				const wrapper = render(N8nBadge, {
					props: {
						variant: 'secondary',
						size: 'medium',
					},
					slots: {
						default: 'Secondary badge',
					},
				});

				expect(screen.getByText('Secondary badge')).toBeVisible();
				expect(wrapper.html()).toMatchSnapshot();
			});

			it('should render a button when clickable', function testClickable() {
				const wrapper = render(N8nBadge, {
					props: {
						clickable: true,
					},
					slots: {
						default: 'Clickable badge',
					},
				});

				expect(screen.getByRole('button', { name: 'Clickable badge' })).toHaveAttribute(
					'type',
					'button',
				);
				expect(wrapper.html()).toMatchSnapshot();
			});
		});
	});
});
