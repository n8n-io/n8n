import { render, screen } from '@testing-library/vue';

import {
	FeatureMaturityKey,
	type FeatureMaturityCatalog,
} from '../N8nFeatureMaturityBadges/featureMaturityState';
import N8nSettingsPageHeader from './SettingsPageHeader.vue';

const featureMaturity: FeatureMaturityCatalog = {
	agents: { preview: true, limitedEnterpriseSupport: true },
	context: { preview: true, limitedEnterpriseSupport: true },
};

const featureList = {
	global: { provide: { [FeatureMaturityKey as symbol]: featureMaturity } },
};

describe('N8nSettingsPageHeader', () => {
	it('renders the title as an h1 by default', () => {
		render(N8nSettingsPageHeader, { props: { title: 'This instance' } });

		const title = screen.getByText('This instance');
		expect(title).toBeInTheDocument();
		expect(title.tagName).toBe('H1');
	});

	it('renders the feature badges beside the title', () => {
		render(N8nSettingsPageHeader, {
			...featureList,
			props: { title: 'Context', feature: 'context' },
		});

		const title = screen.getByRole('heading', { name: 'Context' });
		const preview = screen.getByTestId('context-preview-badge');
		const enterprise = screen.getByTestId('context-enterprise-readiness-badge');
		expect(title.parentElement).toContainElement(preview);
		expect(title.parentElement).toContainElement(enterprise);
	});

	it('hides one badge when the header asks', () => {
		const preview = render(N8nSettingsPageHeader, {
			...featureList,
			props: {
				title: 'Agents',
				feature: 'agents',
				hideEnterprise: true,
			},
		});
		expect(preview.getByTestId('agents-preview-badge')).toBeInTheDocument();
		expect(preview.queryByTestId('agents-enterprise-readiness-badge')).not.toBeInTheDocument();
		preview.unmount();

		const enterprise = render(N8nSettingsPageHeader, {
			...featureList,
			props: {
				title: 'Agents',
				feature: 'agents',
				hidePreview: true,
			},
		});
		expect(enterprise.queryByTestId('agents-preview-badge')).not.toBeInTheDocument();
		expect(enterprise.getByTestId('agents-enterprise-readiness-badge')).toBeInTheDocument();
	});

	it('renders the titleTrailing slot alongside the title', () => {
		render(N8nSettingsPageHeader, {
			props: { title: 'This instance' },
			slots: { titleTrailing: '<span data-test-id="trailing">Preview</span>' },
		});

		const title = screen.getByText('This instance');
		const trailing = screen.getByTestId('trailing');
		expect(title).toBeInTheDocument();
		expect(trailing).toHaveTextContent('Preview');
		expect(title.parentElement).toBe(trailing.parentElement);
	});

	it('renders the title with the requested heading tag', () => {
		render(N8nSettingsPageHeader, {
			props: { title: 'This instance', headingTag: 'h2' },
		});

		expect(screen.getByText('This instance').tagName).toBe('H2');
	});

	it('renders the description', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'This instance',
				description: 'Plan, usage and version.',
			},
		});

		expect(screen.getByText('Plan, usage and version.')).toBeInTheDocument();
	});

	it('renders the docs link when a URL is set', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'This instance',
				description: 'Plan, usage and version.',
				docsUrl: 'https://docs.n8n.io',
			},
		});

		const link = screen.getByRole('link', { name: 'documentation' });
		expect(link).toHaveAttribute('href', 'https://docs.n8n.io');
	});

	it('hides the docs link when showDocsLink is false, even when a URL is set', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'This instance',
				description: 'Plan, usage and version.',
				docsUrl: 'https://docs.n8n.io',
				showDocsLink: false,
			},
		});

		expect(screen.getByText('Plan, usage and version.')).toBeInTheDocument();
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
		expect(screen.queryByTestId('settings-page-header-docs')).not.toBeInTheDocument();
	});

	it('hides the feature documentation link when showDocsLink is false', () => {
		render(N8nSettingsPageHeader, {
			global: {
				provide: {
					[FeatureMaturityKey as symbol]: {
						agents: {
							preview: true,
							limitedEnterpriseSupport: true,
							docsUrl: 'https://docs.n8n.io/build/build-and-manage-agents',
						},
					} satisfies FeatureMaturityCatalog,
				},
			},
			props: {
				title: 'Agents',
				description: 'Build agents.',
				feature: 'agents',
				showDocsLink: false,
			},
		});

		expect(screen.queryByRole('link')).not.toBeInTheDocument();
		expect(screen.queryByTestId('settings-page-header-docs')).not.toBeInTheDocument();
	});

	it('renders custom leading copy and a custom label', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'API keys',
				description: 'Use your API keys to control n8n programmatically.',
				docsLeadingText: 'Read the ',
				docsLabel: 'API reference',
				docsUrl: 'https://docs.n8n.io/api/',
			},
		});

		expect(screen.getByText(/Read the/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'API reference' })).toBeInTheDocument();
	});

	it('drops the leading copy when docsLeadingText is explicitly empty', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'Migration report',
				description: 'Learn more about all breaking changes in our',
				docsUrl: 'https://docs.n8n.io',
				docsLeadingText: '',
			},
		});

		expect(screen.getByRole('link', { name: 'documentation' })).toBeInTheDocument();
		expect(screen.queryByText(/Learn more in the/)).not.toBeInTheDocument();
	});

	it('uses the documentation URL from the feature entry', () => {
		render(N8nSettingsPageHeader, {
			global: {
				provide: {
					[FeatureMaturityKey as symbol]: {
						openTelemetry: {
							preview: true,
							limitedEnterpriseSupport: false,
							docsUrl: 'https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/',
						},
					} satisfies FeatureMaturityCatalog,
				},
			},
			props: {
				title: 'OpenTelemetry',
				description: 'Send traces from this instance.',
				feature: 'openTelemetry',
			},
		});

		expect(screen.getByRole('link', { name: 'documentation' })).toHaveAttribute(
			'href',
			'https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/',
		);
	});

	it('lets the page URL override the feature entry', () => {
		render(N8nSettingsPageHeader, {
			global: {
				provide: {
					[FeatureMaturityKey as symbol]: {
						agents: {
							preview: true,
							limitedEnterpriseSupport: true,
							docsUrl: 'https://docs.n8n.io/build/build-and-manage-agents',
						},
					} satisfies FeatureMaturityCatalog,
				},
			},
			props: {
				title: 'Agents',
				description: 'Build agents.',
				feature: 'agents',
				docsUrl: 'https://docs.n8n.io/override',
			},
		});

		expect(screen.getByRole('link', { name: 'documentation' })).toHaveAttribute(
			'href',
			'https://docs.n8n.io/override',
		);
	});

	it('renders the docs link as an N8nExternalLink that opens in a new tab', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'This instance',
				description: 'Plan, usage and version.',
				docsUrl: 'https://docs.n8n.io',
			},
		});

		const link = screen.getByRole('link', { name: 'documentation' });
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('renders the docs link in the inline treatment, followed by the external-link icon', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'This instance',
				description: 'Plan, usage and version.',
				docsUrl: 'https://docs.n8n.io',
			},
		});

		const link = screen.getByRole('link', { name: 'documentation' });
		// `inline` is what sizes the link to the description text instead of the standalone pill.
		expect(link).toHaveClass('inline');

		const icon = link.querySelector('[data-icon="external-link"]') as HTMLElement;
		expect(icon).toBeInTheDocument();
		// The icon is decorative, so it is hidden from assistive tech and excluded from the link name.
		expect(icon).toHaveAttribute('aria-hidden', 'true');
		expect(link).toHaveAccessibleName('documentation');
	});

	it('warns and renders a non-navigational placeholder when shown without a docs URL', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		render(N8nSettingsPageHeader, {
			props: { title: 'This instance', description: 'Plan, usage and version.' },
		});

		const placeholder = screen.getByTestId('settings-page-header-docs');
		expect(placeholder).toHaveTextContent('documentation');
		expect(placeholder).not.toHaveAttribute('href');
		expect(placeholder).toBeDisabled();
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('docsUrl'));

		warn.mockRestore();
	});
});
