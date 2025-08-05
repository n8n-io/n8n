import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import N8nIconButton from '../IconButton.vue';

describe('N8nIconButton', () => {
	const stubs = ['n8n-button'];

	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nIconButton, {
				props: {
					icon: 'plus',
				},
				global: {
					stubs,
				},
			});

			const button = container.querySelector('n8n-button-stub');
			expect(button).toBeInTheDocument();
			expect(button).toHaveAttribute('square', 'true');
			expect(button).toHaveAttribute('icon', 'plus');
		});

		it('should render with custom icon', () => {
			const { container } = render(N8nIconButton, {
				props: {
					icon: 'trash',
				},
				global: {
					stubs,
				},
			});

			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('icon', 'trash');
		});
	});

	describe('Props Configuration', () => {
		it('should render with different types', () => {
			const types = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger'] as const;

			types.forEach((type) => {
				const { container } = render(N8nIconButton, {
					props: {
						icon: 'plus',
						type,
					},
					global: {
						stubs,
					},
				});

				const button = container.querySelector('n8n-button-stub');
				expect(button).toHaveAttribute('type', type);
			});
		});

		it('should render with different sizes', () => {
			const sizes = ['mini', 'small', 'medium', 'large', 'xlarge'] as const;

			sizes.forEach((size) => {
				const { container } = render(N8nIconButton, {
					props: {
						icon: 'plus',
						size,
					},
					global: {
						stubs,
					},
				});

				const button = container.querySelector('n8n-button-stub');
				expect(button).toHaveAttribute('size', size);
			});
		});

		it('should handle loading state', () => {
			const { container } = render(N8nIconButton, {
				props: {
					icon: 'plus',
					loading: true,
				},
				global: {
					stubs,
				},
			});

			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('loading', 'true');
		});

		it('should handle disabled state', () => {
			const { container } = render(N8nIconButton, {
				props: {
					icon: 'plus',
					disabled: true,
				},
				global: {
					stubs,
				},
			});

			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('disabled', 'true');
		});

		it('should handle outline style', () => {
			const { container } = render(N8nIconButton, {
				props: {
					icon: 'plus',
					outline: true,
				},
				global: {
					stubs,
				},
			});

			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('outline', 'true');
		});

		it('should handle text style', () => {
			const { container } = render(N8nIconButton, {
				props: {
					icon: 'plus',
					text: true,
				},
				global: {
					stubs,
				},
			});

			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('text', 'true');
		});

		it('should handle active state', () => {
			const { container } = render(N8nIconButton, {
				props: {
					icon: 'plus',
					active: true,
				},
				global: {
					stubs,
				},
			});

			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('active', 'true');
		});
	});

	describe('Button Properties', () => {
		it('should always render as square button', () => {
			const { container } = render(N8nIconButton, {
				props: {
					icon: 'plus',
				},
				global: {
					stubs,
				},
			});

			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('square', 'true');
		});

		it('should pass through additional attributes', () => {
			const { container } = render(N8nIconButton, {
				props: {
					icon: 'plus',
					'data-testid': 'custom-icon-button',
					'aria-label': 'Add item',
				},
				global: {
					stubs,
				},
			});

			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('data-testid', 'custom-icon-button');
			expect(button).toHaveAttribute('aria-label', 'Add item');
		});
	});

	describe('Default Values', () => {
		it('should use default values when props are not provided', () => {
			const { container } = render(N8nIconButton, {
				props: {
					icon: 'plus',
				},
				global: {
					stubs,
				},
			});

			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('type', 'primary'); // default
			expect(button).toHaveAttribute('size', 'medium'); // default
			expect(button).toHaveAttribute('loading', 'false'); // default
			expect(button).toHaveAttribute('outline', 'false'); // default
			expect(button).toHaveAttribute('text', 'false'); // default
			expect(button).toHaveAttribute('disabled', 'false'); // default
			expect(button).toHaveAttribute('active', 'false'); // default
		});
	});

	describe('Combined Props', () => {
		it('should handle multiple props together', () => {
			const { container } = render(N8nIconButton, {
				props: {
					icon: 'settings',
					type: 'secondary',
					size: 'large',
					outline: true,
					active: true,
					'aria-label': 'Settings',
				},
				global: {
					stubs,
				},
			});

			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('icon', 'settings');
			expect(button).toHaveAttribute('type', 'secondary');
			expect(button).toHaveAttribute('size', 'large');
			expect(button).toHaveAttribute('outline', 'true');
			expect(button).toHaveAttribute('active', 'true');
			expect(button).toHaveAttribute('square', 'true');
			expect(button).toHaveAttribute('aria-label', 'Settings');
		});
	});
});
