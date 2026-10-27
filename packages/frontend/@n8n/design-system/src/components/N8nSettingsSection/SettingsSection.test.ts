import { render, screen } from '@testing-library/vue';

import N8nSettingsSection from './SettingsSection.vue';

describe('N8nSettingsSection', () => {
	it('renders the title and description', () => {
		render(N8nSettingsSection, {
			props: { title: 'Security', description: 'Manage security' },
			slots: { default: '<div data-test-id="group">group</div>' },
		});

		expect(screen.getByText('Security')).toBeInTheDocument();
		expect(screen.getByText('Manage security')).toBeInTheDocument();
		expect(screen.getByTestId('group')).toBeInTheDocument();
	});

	it('renders the title with the requested heading tag', () => {
		render(N8nSettingsSection, {
			props: { title: 'Security', headingTag: 'h3' },
		});

		expect(screen.getByText('Security').tagName).toBe('H3');
	});

	it('omits the header when neither title nor description is set', () => {
		const { container } = render(N8nSettingsSection, {
			slots: { default: '<div>group</div>' },
		});

		expect(container.querySelector('[class*="header"]')).not.toBeInTheDocument();
	});

	it('renders the header when only a description is provided', () => {
		const { container } = render(N8nSettingsSection, {
			props: { description: 'Only a description' },
		});

		expect(container.querySelector('[class*="header"]')).toBeInTheDocument();
		expect(screen.getByText('Only a description')).toBeInTheDocument();
	});
});
