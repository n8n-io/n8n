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

	it('caps the content column when size is narrow', () => {
		const { container } = render(N8nSettingsLayout, {
			slots: { default: 'content' },
		});

		const content = container.querySelector('[class*="narrow"]') as HTMLElement;
		expect(content).toBeTruthy();
		expect(content.className).not.toContain('wide');
	});

	it('lets the content fill the container when size is wide', () => {
		const { container } = render(N8nSettingsLayout, {
			props: { size: 'wide' },
			slots: { default: 'content' },
		});

		const content = container.querySelector('[class*="wide"]') as HTMLElement;
		expect(content).toBeTruthy();
		expect(content.className).not.toContain('narrow');
	});

	it('keeps the header a direct child of the content region in both modes', () => {
		for (const size of ['narrow', 'wide'] as const) {
			const { container } = render(N8nSettingsLayout, {
				props: { size },
				slots: { default: '<header data-test-id="page-header">title</header>' },
			});

			const content = container.querySelector(`[class*="${size}"]`) as HTMLElement;
			const header = content.querySelector('[data-test-id="page-header"]') as HTMLElement;

			expect(header.parentElement).toBe(content);
		}
	});

	it('renders the back action outside the content column', () => {
		const { container } = render(N8nSettingsLayout, {
			props: { showBack: true },
			slots: { default: 'content' },
		});

		const content = container.querySelector('[class*="narrow"]') as HTMLElement;
		const backButton = screen.getByTestId('settings-back-button');

		expect(backButton).toBeInTheDocument();
		expect(content.contains(backButton)).toBe(false);
	});
});
