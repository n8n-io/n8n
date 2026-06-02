import { render, screen } from '@testing-library/vue';

import N8nSettingsRow from './SettingsRow.vue';

describe('N8nSettingsRow', () => {
	it('renders title and description', () => {
		render(N8nSettingsRow, {
			props: { title: 'My setting', description: 'What it does' },
		});

		expect(screen.getByText('My setting')).toBeInTheDocument();
		expect(screen.getByText('What it does')).toBeInTheDocument();
	});

	it('defaults to the horizontal layout with center alignment', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title' },
		});

		const row = container.querySelector('[data-layout]');
		expect(row?.getAttribute('data-layout')).toBe('horizontal');
		expect(row?.className).not.toContain('alignStart');
	});

	it('applies the start alignment class when align="start"', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', align: 'start' },
		});

		const row = container.querySelector('[data-layout="horizontal"]');
		expect(row?.className).toContain('alignStart');
	});

	it.each(['horizontal', 'vertical', 'custom'] as const)('renders the %s layout', (layout) => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', layout },
			slots: { default: '<div data-test-id="custom-content">content</div>' },
		});

		expect(container.querySelector(`[data-layout="${layout}"]`)).toBeInTheDocument();
	});

	it('renders the full-width default slot only in the custom layout', () => {
		render(N8nSettingsRow, {
			props: { layout: 'custom' },
			slots: { default: '<div data-test-id="custom-content">content</div>' },
		});

		expect(screen.getByTestId('custom-content')).toBeInTheDocument();
	});

	it('caps the action width at 50% by default in the horizontal layout', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title' },
			slots: { action: '<button>Do</button>' },
		});

		const action = container.querySelector('[class*="action"]') as HTMLElement;
		expect(action.style.maxWidth).toBe('50%');
	});

	it('allows overriding the action max-width', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', actionMaxWidth: '12rem' },
			slots: { action: '<button>Do</button>' },
		});

		const action = container.querySelector('[class*="action"]') as HTMLElement;
		expect(action.style.maxWidth).toBe('12rem');
	});

	it('removes the action max-width cap when actionMaxWidth is false', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', actionMaxWidth: false },
			slots: { action: '<button>Do</button>' },
		});

		const action = container.querySelector('[class*="action"]') as HTMLElement;
		expect(action.style.maxWidth).toBe('');
	});

	it('does not apply the action max-width in the vertical layout', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', layout: 'vertical' },
			slots: { action: '<button>Do</button>' },
		});

		const action = container.querySelector('[class*="action"]') as HTMLElement;
		expect(action.style.maxWidth).toBe('');
	});

	it('shows the visual slot when provided', () => {
		render(N8nSettingsRow, {
			props: { title: 'Title' },
			slots: { visual: '<span data-test-id="device-icon">icon</span>' },
		});

		expect(screen.getByTestId('settings-row-visual')).toBeInTheDocument();
		expect(screen.getByTestId('device-icon')).toBeInTheDocument();
	});

	it('hides the visual slot by default', () => {
		render(N8nSettingsRow, { props: { title: 'Title' } });

		expect(screen.queryByTestId('settings-row-visual')).not.toBeInTheDocument();
	});

	it('renders the divider by default', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title' },
		});

		expect(container.querySelector('[data-test-id="settings-row-divider"]')).toBeInTheDocument();
	});

	it('does not render the divider when show-divider is false', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', showDivider: false },
		});

		expect(
			container.querySelector('[data-test-id="settings-row-divider"]'),
		).not.toBeInTheDocument();
	});

	it('clamps the description to a maximum of 3 lines', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', description: 'Long text', maxDescriptionLines: 8 },
		});

		const description = container.querySelector('[class*="description"]') as HTMLElement;
		expect(description.style.getPropertyValue('--settings-row--description-lines')).toBe('3');
	});

	it('uses the configured description line count below the clamp', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', description: 'Long text', maxDescriptionLines: 2 },
		});

		const description = container.querySelector('[class*="description"]') as HTMLElement;
		expect(description.style.getPropertyValue('--settings-row--description-lines')).toBe('2');
	});

	it('renders custom info slot content over the title/description', () => {
		render(N8nSettingsRow, {
			props: { title: 'Default title' },
			slots: { info: '<div data-test-id="custom-info">custom</div>' },
		});

		expect(screen.getByTestId('custom-info')).toBeInTheDocument();
		expect(screen.queryByText('Default title')).not.toBeInTheDocument();
	});
});
