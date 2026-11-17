import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';

import N8nBadge from '../N8nBadge';

import FeatureMaturityBadges from './N8nFeatureMaturityBadges.vue';
import { FeatureMaturityKey, type FeatureMaturityCatalog } from './featureMaturityState';

const featureMaturity: FeatureMaturityCatalog = {
	workflowReviews: { preview: true, limitedEnterpriseSupport: false },
	assistant: { preview: false, limitedEnterpriseSupport: true },
	agents: { preview: true, limitedEnterpriseSupport: true },
};

const featureList = {
	global: { provide: { [FeatureMaturityKey as symbol]: featureMaturity } },
};

describe('N8nFeatureMaturityBadges', () => {
	it('renders nothing and warns when the feature id is missing from the list', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = render(FeatureMaturityBadges, {
			...featureList,
			props: { feature: 'missing' },
		});

		expect(container).toBeEmptyDOMElement();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing'));
		warn.mockRestore();
	});

	it('draws the Preview badge when no feature id is set', () => {
		const { getByText, queryByText } = render(FeatureMaturityBadges);

		expect(getByText('Preview')).toBeInTheDocument();
		expect(queryByText('Limited enterprise readiness')).not.toBeInTheDocument();
	});

	it('renders the badges listed for the feature', () => {
		const previewOnly = render(FeatureMaturityBadges, {
			...featureList,
			props: { feature: 'workflowReviews' },
		});

		expect(previewOnly.getByTestId('workflow-reviews-preview-badge')).toHaveTextContent('Preview');
		expect(
			previewOnly.queryByTestId('workflow-reviews-enterprise-readiness-badge'),
		).not.toBeInTheDocument();
		previewOnly.unmount();

		const enterpriseOnly = render(FeatureMaturityBadges, {
			...featureList,
			props: { feature: 'assistant' },
		});
		expect(enterpriseOnly.getByTestId('assistant-enterprise-readiness-badge')).toBeInTheDocument();
		expect(enterpriseOnly.queryByTestId('assistant-preview-badge')).not.toBeInTheDocument();
		enterpriseOnly.unmount();

		const shown = render(FeatureMaturityBadges, {
			...featureList,
			props: { feature: 'agents' },
		});
		expect(shown.getByTestId('agents-preview-badge')).toBeInTheDocument();
		expect(shown.getByTestId('agents-enterprise-readiness-badge')).toHaveTextContent(
			'Limited enterprise readiness',
		);
	});

	it('hides either badge, or both, when the callsite asks', () => {
		const preview = render(FeatureMaturityBadges, {
			...featureList,
			props: { feature: 'agents', hideEnterprise: true },
		});
		expect(preview.getByTestId('agents-preview-badge')).toBeInTheDocument();
		expect(preview.queryByTestId('agents-enterprise-readiness-badge')).not.toBeInTheDocument();
		preview.unmount();

		const enterprise = render(FeatureMaturityBadges, {
			...featureList,
			props: { feature: 'agents', hidePreview: true },
		});
		expect(enterprise.queryByTestId('agents-preview-badge')).not.toBeInTheDocument();
		expect(enterprise.getByTestId('agents-enterprise-readiness-badge')).toBeInTheDocument();
		enterprise.unmount();

		const { container } = render(FeatureMaturityBadges, {
			...featureList,
			props: { feature: 'agents', hidePreview: true, hideEnterprise: true },
		});
		expect(container).toBeEmptyDOMElement();
	});

	it('draws both badges as outline badges', () => {
		const preview = mount(FeatureMaturityBadges, {
			...featureList,
			props: { feature: 'workflowReviews' },
		});
		expect(preview.getComponent(N8nBadge).props()).toMatchObject({
			variant: 'outline',
			size: 'xxsmall',
		});
		expect(preview.getComponent(N8nBadge).props('leadingIcon')).toBeUndefined();
		preview.unmount();

		const enterprise = mount(FeatureMaturityBadges, {
			...featureList,
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
			...featureList,
			props: { feature: 'assistant' },
		});

		await userEvent.tab();
		expect(getByText('Limited enterprise readiness').closest('.n8n-badge')).toHaveFocus();

		expect(
			await findAllByText("Some enterprise capabilities don't cover this feature yet."),
		).not.toHaveLength(0);
		expect(queryByRole('link', { name: 'See docs' })).not.toBeInTheDocument();
	});

	it('links the enterprise tooltip to the feature docs', async () => {
		const docsUrl = 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant';
		const { findByRole } = render(FeatureMaturityBadges, {
			global: {
				provide: {
					[FeatureMaturityKey as symbol]: {
						assistant: { preview: false, limitedEnterpriseSupport: true, docsUrl },
					} satisfies FeatureMaturityCatalog,
				},
			},
			props: { feature: 'assistant' },
		});

		await userEvent.tab();

		const link = await findByRole('link', { name: 'See docs' });
		expect(link).toHaveAttribute('href', docsUrl);
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		expect(link.closest('p')).toHaveTextContent(
			"Some enterprise capabilities don't cover this feature yet. See docs",
		);

		const icon = link.querySelector('[data-icon="external-link"]');
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveAttribute('aria-hidden', 'true');
		expect(link).toHaveAccessibleName('See docs');
	});
});
