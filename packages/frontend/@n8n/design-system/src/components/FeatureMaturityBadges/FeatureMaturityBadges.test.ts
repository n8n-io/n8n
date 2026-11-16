import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import { computed } from 'vue';

import N8nBadge from '../N8nBadge';

import FeatureMaturityBadges from './FeatureMaturityBadges.vue';
import { EnterprisePlanKey } from './featureMaturityState';

const enterprisePlan = {
	global: {
		provide: {
			[EnterprisePlanKey as symbol]: computed(() => true),
		},
	},
};

describe('FeatureMaturityBadges', () => {
	it('draws the Preview badge when no feature id is set', () => {
		const { getByText, queryByText } = render(FeatureMaturityBadges);

		expect(getByText('Preview')).toBeInTheDocument();
		expect(queryByText('Limited enterprise readiness')).not.toBeInTheDocument();
	});

	it('renders the badges listed for the feature', () => {
		const previewOnly = render(FeatureMaturityBadges, { props: { feature: 'workflowReviews' } });

		expect(previewOnly.getByTestId('security-workflow-reviews-preview-badge')).toHaveTextContent(
			'Preview',
		);
		expect(
			previewOnly.queryByTestId('security-workflow-reviews-enterprise-readiness-badge'),
		).not.toBeInTheDocument();
		previewOnly.unmount();

		const hidden = render(FeatureMaturityBadges, { props: { feature: 'assistant' } });
		expect(hidden.queryByTestId('n8n-agent-enterprise-readiness-badge')).not.toBeInTheDocument();
		hidden.unmount();

		const shown = render(FeatureMaturityBadges, {
			...enterprisePlan,
			props: { feature: 'agents' },
		});
		expect(shown.getByTestId('agents-preview-badge')).toBeInTheDocument();
		expect(shown.getByTestId('agents-enterprise-readiness-badge')).toHaveTextContent(
			'Limited enterprise readiness',
		);
	});

	it('hides either badge, or both, when the callsite asks', () => {
		const preview = render(FeatureMaturityBadges, {
			...enterprisePlan,
			props: { feature: 'agents', hideEnterprise: true },
		});
		expect(preview.getByTestId('agents-preview-badge')).toBeInTheDocument();
		expect(preview.queryByTestId('agents-enterprise-readiness-badge')).not.toBeInTheDocument();
		preview.unmount();

		const enterprise = render(FeatureMaturityBadges, {
			...enterprisePlan,
			props: { feature: 'agents', hidePreview: true },
		});
		expect(enterprise.queryByTestId('agents-preview-badge')).not.toBeInTheDocument();
		expect(enterprise.getByTestId('agents-enterprise-readiness-badge')).toBeInTheDocument();
		enterprise.unmount();

		const { container } = render(FeatureMaturityBadges, {
			...enterprisePlan,
			props: { feature: 'agents', hidePreview: true, hideEnterprise: true },
		});
		expect(container).toBeEmptyDOMElement();
	});

	it('draws Preview as a dashed badge and enterprise as an outline badge', () => {
		const preview = mount(FeatureMaturityBadges, { props: { feature: 'workflowReviews' } });
		expect(preview.getComponent(N8nBadge).props()).toMatchObject({
			variant: 'outline',
			size: 'xxsmall',
		});
		expect(preview.getComponent(N8nBadge).props('leadingIcon')).toBeUndefined();
		preview.unmount();

		const enterprise = mount(FeatureMaturityBadges, {
			...enterprisePlan,
			props: { feature: 'assistant' },
		});
		expect(enterprise.getComponent(N8nBadge).props()).toMatchObject({
			variant: 'outline',
			size: 'xxsmall',
		});
		expect(enterprise.getComponent(N8nBadge).props('leadingIcon')).toBeUndefined();
	});

	it('shows the enterprise tooltip on keyboard focus', async () => {
		const { getByText, findAllByText, queryByRole } = render(FeatureMaturityBadges, {
			...enterprisePlan,
			props: { feature: 'assistant' },
		});

		await userEvent.tab();
		expect(getByText('Limited enterprise readiness').closest('.n8n-badge')).toHaveFocus();

		expect(
			await findAllByText("Some enterprise capabilities don't cover this feature yet."),
		).not.toHaveLength(0);
		expect(queryByRole('link', { name: 'Learn more' })).not.toBeInTheDocument();
	});
});
