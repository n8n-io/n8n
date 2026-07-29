import { fireEvent, render, screen } from '@testing-library/vue';

import N8nSettingsLayout from './SettingsLayout.vue';

describe('N8nSettingsLayout', () => {
	it('renders slotted content', () => {
		render(N8nSettingsLayout, {
			slots: { default: '<div data-test-id="content">page</div>' },
		});

		expect(screen.getByTestId('content')).toBeInTheDocument();
	});

	it('hides the back action by default', () => {
		render(N8nSettingsLayout, { slots: { default: 'content' } });

		expect(screen.queryByTestId('settings-back-button')).not.toBeInTheDocument();
	});

	it('defaults the back action label to "Back"', () => {
		render(N8nSettingsLayout, {
			props: { showBack: true },
			slots: { default: 'content' },
		});

		const button = screen.getByTestId('settings-back-button');
		expect(button).toHaveTextContent('Back');
		expect(button).toHaveAccessibleName('Back');
	});

	it('shows a ghost back action with the given label when show-back is set', () => {
		render(N8nSettingsLayout, {
			props: { showBack: true, backLabel: 'Back to Security settings' },
			slots: { default: 'content' },
		});

		const button = screen.getByTestId('settings-back-button');
		expect(button).toBeInTheDocument();
		expect(button.className).toContain('ghost');
		expect(button).toHaveTextContent('Back to Security settings');
		// The arrow icon is aria-hidden, so the label is the button's accessible name.
		expect(button).toHaveAccessibleName('Back to Security settings');
	});

	it('emits back when the back action is clicked', async () => {
		const { emitted } = render(N8nSettingsLayout, {
			props: { showBack: true },
			slots: { default: 'content' },
		});

		await fireEvent.click(screen.getByTestId('settings-back-button'));

		expect(emitted().back).toHaveLength(1);
	});

	it('caps the content at the content max-width by default', () => {
		const { container } = render(N8nSettingsLayout, {
			slots: { default: 'content' },
		});

		const content = container.querySelector('[class*="content"]') as HTMLElement;
		expect(content.className).not.toContain('fullWidth');
	});

	it('lets the content fill the padded container when fullWidth is set', () => {
		const { container } = render(N8nSettingsLayout, {
			props: { fullWidth: true },
			slots: { default: 'content' },
		});

		const content = container.querySelector('[class*="content"]') as HTMLElement;
		expect(content.className).toContain('fullWidth');
	});

	it('keeps the header a direct child of the centered content region in both modes', () => {
		// The content region applies `margin-inline: auto` to its children, so a capped
		// header stays centered on the page whether or not the content is full-width.
		for (const fullWidth of [false, true]) {
			const { container } = render(N8nSettingsLayout, {
				props: { fullWidth },
				slots: { default: '<header data-test-id="page-header">title</header>' },
			});

			const content = container.querySelector('[class*="content"]') as HTMLElement;
			const header = content.querySelector('[data-test-id="page-header"]') as HTMLElement;

			expect(header.parentElement).toBe(content);
		}
	});

	it('renders the back action outside the centered content column', () => {
		const { container } = render(N8nSettingsLayout, {
			props: { showBack: true },
			slots: { default: 'content' },
		});

		const content = container.querySelector('[class*="content"]') as HTMLElement;
		const backButton = screen.getByTestId('settings-back-button');

		// The back action lives in the full-width padded area, not inside the capped/centered content.
		expect(backButton).toBeInTheDocument();
		expect(content.contains(backButton)).toBe(false);
	});
});
