import { render, screen } from '@testing-library/vue';

import N8nSettingsPageHeader from './SettingsPageHeader.vue';

describe('N8nSettingsPageHeader', () => {
	it('renders the title as an h1 by default', () => {
		render(N8nSettingsPageHeader, { props: { title: 'This instance' } });

		const title = screen.getByText('This instance');
		expect(title).toBeInTheDocument();
		expect(title.tagName).toBe('H1');
	});

	it('renders the title with the requested heading tag', () => {
		render(N8nSettingsPageHeader, { props: { title: 'This instance', headingTag: 'h2' } });

		expect(screen.getByText('This instance').tagName).toBe('H2');
	});

	it('renders the description', () => {
		render(N8nSettingsPageHeader, {
			props: { title: 'This instance', description: 'Plan, usage and version.' },
		});

		expect(screen.getByText('Plan, usage and version.')).toBeInTheDocument();
	});

	it('renders the docs link only when a href is provided', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'This instance',
				description: 'Plan, usage and version.',
				docsLabel: 'documentation',
				docsHref: 'https://docs.n8n.io',
			},
		});

		const link = screen.getByRole('link', { name: /documentation/ });
		expect(link).toHaveAttribute('href', 'https://docs.n8n.io');
	});

	it('renders the docs link inline as an underlined word followed by a non-underlined arrow', () => {
		render(N8nSettingsPageHeader, {
			props: {
				title: 'This instance',
				description: 'Plan, usage and version.',
				docsLabel: 'documentation',
				docsHref: 'https://docs.n8n.io',
			},
		});

		const link = screen.getByRole('link', { name: /documentation/ });

		// The link is the inline element, not the N8nExternalLink icon button.
		const label = link.querySelector('[class*="docsLabel"]') as HTMLElement;
		expect(label).toHaveTextContent('documentation');

		const arrow = link.querySelector('[class*="docsArrow"]') as HTMLElement;
		expect(arrow).toHaveTextContent('↗');
		// The arrow is decorative, so it is hidden from assistive tech and excluded from the link name.
		expect(arrow).toHaveAttribute('aria-hidden', 'true');
		expect(link).toHaveAccessibleName('documentation');
	});

	it('does not render a docs link without a href', () => {
		render(N8nSettingsPageHeader, {
			props: { title: 'This instance', description: 'Plan, usage and version.' },
		});

		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});
});
