import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';

import N8nBadge from '../N8nBadge';

import FeatureMaturityBadges from './FeatureMaturityBadges.vue';

const base = {
	showPreview: false,
	showEnterprise: false,
	testId: 'feature',
};

describe('FeatureMaturityBadges', () => {
	it('renders nothing when neither badge is requested', () => {
		const { container } = render(FeatureMaturityBadges, { props: base });

		expect(container).toBeEmptyDOMElement();
	});

	it('renders Preview when showPreview is set', () => {
		const { getByTestId, queryByTestId } = render(FeatureMaturityBadges, {
			props: { ...base, showPreview: true },
		});

		expect(getByTestId('feature-preview-badge')).toHaveTextContent('Preview');
		expect(queryByTestId('feature-enterprise-readiness-badge')).not.toBeInTheDocument();
	});

	it('renders Limited enterprise readiness when showEnterprise is set', () => {
		const { getByTestId, queryByTestId } = render(FeatureMaturityBadges, {
			props: { ...base, showEnterprise: true },
		});

		expect(queryByTestId('feature-preview-badge')).not.toBeInTheDocument();
		expect(getByTestId('feature-enterprise-readiness-badge')).toHaveTextContent(
			'Limited enterprise readiness',
		);
	});

	it('renders both badges when both flags are set', () => {
		const { getByTestId } = render(FeatureMaturityBadges, {
			props: { ...base, showPreview: true, showEnterprise: true },
		});

		expect(getByTestId('feature-preview-badge')).toBeInTheDocument();
		expect(getByTestId('feature-enterprise-readiness-badge')).toBeInTheDocument();
	});

	it('draws Preview as a dashed badge and enterprise as an outline badge', () => {
		const wrapper = mount(FeatureMaturityBadges, {
			props: { showPreview: true, showEnterprise: true },
		});

		const badges = wrapper.findAllComponents(N8nBadge);
		expect(badges).toHaveLength(2);
		expect(badges[0]?.props()).toMatchObject({ variant: 'outline', size: 'xxsmall' });
		expect(badges[0]?.props('leadingIcon')).toBeUndefined();
		expect(badges[1]?.props()).toMatchObject({ variant: 'outline', size: 'xxsmall' });
		expect(badges[1]?.props('leadingIcon')).toBeUndefined();
	});

	it('shows the enterprise tooltip on keyboard focus', async () => {
		const { getByText, findAllByText, queryByRole } = render(FeatureMaturityBadges, {
			props: { showEnterprise: true },
		});

		await userEvent.tab();
		expect(getByText('Limited enterprise readiness').closest('.n8n-badge')).toHaveFocus();

		expect(
			await findAllByText("Some enterprise capabilities don't cover this feature yet."),
		).not.toHaveLength(0);
		expect(queryByRole('link', { name: 'Learn more' })).not.toBeInTheDocument();
	});
});
