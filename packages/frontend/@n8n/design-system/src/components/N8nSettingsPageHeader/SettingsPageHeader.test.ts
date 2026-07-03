import { render, screen } from '@testing-library/vue';

import N8nSettingsPageHeader from './SettingsPageHeader.vue';

describe('N8nSettingsPageHeader', () => {
	it('renders the title as an h1 by default', () => {
		render(N8nSettingsPageHeader, { props: { title: 'This instance', showDocsLink: false } });

		const title = screen.getByText('This instance');
		expect(title).toBeInTheDocument();
		expect(title.tagName).toBe('H1');
	});

	it('renders the title with the requested heading tag', () => {
		render(N8nSettingsPageHeader, {
			props: { title: 'This instance', headingTag: 'h2', showDocsLink: false },
		});

		expect(screen.getByText('This instance').tagName).toBe('H2');
	});

	it('renders the description', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'This instance',
				description: 'Plan, usage and version.',
				showDocsLink: false,
			},
		});

		expect(screen.getByText('Plan, usage and version.')).toBeInTheDocument();
	});

	it('renders the docs link on by default with the default "documentation" label', () => {
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

	it('hides the docs link when showDocsLink is false', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'This instance',
				description: 'Plan, usage and version.',
				docsUrl: 'https://docs.n8n.io',
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

	it('renders the docs link inline as an underlined word followed by a non-underlined arrow', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'This instance',
				description: 'Plan, usage and version.',
				docsUrl: 'https://docs.n8n.io',
			},
		});

		const link = screen.getByRole('link', { name: 'documentation' });

		const label = link.querySelector('[class*="docsLabel"]') as HTMLElement;
		expect(label).toHaveTextContent('documentation');

		const arrow = link.querySelector('[aria-hidden="true"]') as HTMLElement;
		expect(arrow).toHaveTextContent('↗');
		// The arrow is decorative, so it is hidden from assistive tech and excluded from the link name.
		expect(arrow).toHaveAttribute('aria-hidden', 'true');
		expect(link).toHaveAccessibleName('documentation');
	});

	it('warns and renders a non-navigational placeholder when shown without a docsUrl', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		render(N8nSettingsPageHeader, {
			props: { title: 'This instance', description: 'Plan, usage and version.' },
		});

		// Placeholder text is still shown to nudge the developer, but it is not a real link.
		const placeholder = screen.getByTestId('settings-page-header-docs');
		expect(placeholder).toHaveTextContent('documentation');
		expect(placeholder).not.toHaveAttribute('href');
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('docsUrl'));

		warn.mockRestore();
	});
});
