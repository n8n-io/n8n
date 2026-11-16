import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';

import N8nBadge from '../N8nBadge';

import FeatureMaturityBadges from './FeatureMaturityBadges.vue';

const base = {
	preview: false,
	limitedEnterpriseSupport: false,
	enterprisePlan: false,
	testId: 'feature',
};

describe('FeatureMaturityBadges', () => {
	it('renders nothing when the feature has no badges', () => {
		const { container } = render(FeatureMaturityBadges, { props: base });

		expect(container).toBeEmptyDOMElement();
	});

	it('renders Preview from the feature entry', () => {
		const { getByTestId, queryByTestId } = render(FeatureMaturityBadges, {
			props: { ...base, preview: true },
		});

		expect(getByTestId('feature-preview-badge')).toHaveTextContent('Preview');
		expect(queryByTestId('feature-enterprise-readiness-badge')).not.toBeInTheDocument();
	});

	it('renders Limited enterprise support only on an enterprise plan', () => {
		const props = {
			...base,
			limitedEnterpriseSupport: true,
			docsUrl: 'https://docs.n8n.io/example',
		};

		const hidden = render(FeatureMaturityBadges, { props: { ...props, enterprisePlan: false } });
		expect(hidden.queryByTestId('feature-enterprise-readiness-badge')).not.toBeInTheDocument();

		const shown = render(FeatureMaturityBadges, { props: { ...props, enterprisePlan: true } });
		expect(shown.getByTestId('feature-enterprise-readiness-badge')).toHaveTextContent(
			'Limited enterprise readiness',
		);
	});

	it('uses a custom Preview label when the caller sets one', () => {
		const { getByText } = render(FeatureMaturityBadges, {
			props: { preview: true, previewText: 'Early preview' },
		});

		expect(getByText('Early preview')).toBeInTheDocument();
	});

	it('renders both badges when the entry asks for both', () => {
		const { getByTestId } = render(FeatureMaturityBadges, {
			props: { ...base, preview: true, limitedEnterpriseSupport: true, enterprisePlan: true },
		});

		expect(getByTestId('feature-preview-badge')).toBeInTheDocument();
		expect(getByTestId('feature-enterprise-readiness-badge')).toBeInTheDocument();
	});

	it('draws Preview as a pink badge with a flask icon', () => {
		const wrapper = mount(FeatureMaturityBadges, { props: { preview: true, size: 'small' } });

		expect(wrapper.getComponent(N8nBadge).props()).toMatchObject({
			variant: 'pink',
			leadingIcon: 'flask-conical',
			size: 'small',
		});
	});

	it('draws Limited enterprise readiness as a pink badge with a shield icon', () => {
		const wrapper = mount(FeatureMaturityBadges, {
			props: { limitedEnterpriseSupport: true, enterprisePlan: true, size: 'xsmall' },
		});

		expect(wrapper.getComponent(N8nBadge).props()).toMatchObject({
			variant: 'pink',
			leadingIcon: 'shield-half',
			size: 'xsmall',
		});
	});

	it('shows the enterprise tooltip on keyboard focus', async () => {
		const { getByText, findAllByText } = render(FeatureMaturityBadges, {
			props: { limitedEnterpriseSupport: true, enterprisePlan: true },
		});

		await userEvent.tab();
		expect(getByText('Limited enterprise readiness').closest('.n8n-badge')).toHaveFocus();

		expect(
			await findAllByText("Some enterprise capabilities don't cover this feature yet."),
		).not.toHaveLength(0);
	});

	it('links the enterprise tooltip to the feature docs', async () => {
		const { findByRole } = render(FeatureMaturityBadges, {
			props: {
				limitedEnterpriseSupport: true,
				enterprisePlan: true,
				docsUrl: 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant',
			},
		});

		await userEvent.tab();

		const link = await findByRole('link', { name: 'Learn more' });
		expect(link).toHaveAttribute(
			'href',
			'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant',
		);
		expect(link.closest('p')).toHaveTextContent(
			"Some enterprise capabilities don't cover this feature yet. Learn more",
		);
	});
});
