import { fireEvent, render, screen } from '@testing-library/vue';

import N8nSettingsRowButton from './SettingsRowButton.vue';

describe('N8nSettingsRowButton', () => {
	it('renders its content and handles clicks', async () => {
		const onClick = vi.fn();
		render(N8nSettingsRowButton, {
			attrs: { onClick },
			slots: { default: 'Choose permission' },
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Choose permission' }));

		expect(onClick).toHaveBeenCalledOnce();
	});

	it('is disabled when requested', () => {
		render(N8nSettingsRowButton, {
			props: { disabled: true },
			slots: { default: 'Choose permission' },
		});

		const button = screen.getByRole('button', { name: 'Choose permission' });
		expect(button).toBeDisabled();
	});

	it('rotates the chevron when expanded', () => {
		const { container } = render(N8nSettingsRowButton, {
			props: { expanded: true },
			slots: { default: 'Choose permission' },
		});

		expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
		expect(container.querySelector('svg')?.className.baseVal).toContain('expanded');
	});
});
