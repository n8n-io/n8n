import { render } from '@testing-library/vue';

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
			'Limited enterprise support',
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
});
