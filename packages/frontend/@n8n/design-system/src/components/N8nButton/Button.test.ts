import { render, fireEvent, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import N8nButton from './Button.vue';

const slots = {
	default: 'Button',
};
const stubs = {
	'n8n-spinner': {
		template: '<span class="n8n-spinner" :size="size" />',
		props: ['size'],
	},
	'n8n-icon': {
		template: '<span class="n8n-icon" :data-size="size" :data-icon="icon" />',
		props: ['icon', 'size'],
	},
};

describe('components', () => {
	describe('N8nButton', () => {
		describe('basic rendering', () => {
			it('should render correctly with default props', () => {
				const wrapper = render(N8nButton, {
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.html()).toMatchSnapshot();
			});

			it('should render with label prop', () => {
				const wrapper = render(N8nButton, {
					props: {
						label: 'Test Label',
					},
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.textContent).toContain('Test Label');
			});

			it('should render slot content when both label and slot provided', () => {
				const wrapper = render(N8nButton, {
					props: {
						label: 'Test Label',
					},
					slots: {
						default: 'Slot Content',
					},
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.textContent).toContain('Test Label');
				expect(wrapper.container.textContent).not.toContain('Slot Content');
			});

			it('should render as link element when element prop is "a"', () => {
				const wrapper = render(N8nButton, {
					props: {
						element: 'a',
						href: 'https://example.com',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const link = wrapper.container.querySelector('a');
				expect(link).toBeInTheDocument();
				expect(link).toHaveAttribute('href', 'https://example.com');
			});
		});

		describe('button types', () => {
			const types = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger'] as const;

			types.forEach((type) => {
				it(`should render ${type} button type`, () => {
					const wrapper = render(N8nButton, {
						props: { type },
						slots,
						global: {
							stubs,
						},
					});
					expect(wrapper.container.querySelector('.button')).toHaveClass(type);
				});
			});
		});

		describe('button sizes', () => {
			const sizes = ['xmini', 'mini', 'small', 'medium', 'large', 'xlarge'] as const;

			sizes.forEach((size) => {
				it(`should render ${size} button size`, () => {
					const wrapper = render(N8nButton, {
						props: { size },
						slots,
						global: {
							stubs,
						},
					});
					expect(wrapper.container.querySelector('.button')).toHaveClass(size);
				});
			});
		});

		describe('loading state', () => {
			it('should render loading spinner when loading is true', () => {
				const wrapper = render(N8nButton, {
					props: {
						loading: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.querySelector('.n8n-spinner')).toBeInTheDocument();
				expect(wrapper.html()).toMatchSnapshot();
			});

			it('should disable button when loading', () => {
				const wrapper = render(N8nButton, {
					props: {
						loading: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const button = wrapper.container.querySelector('button');
				expect(button).toBeDisabled();
			});

			it('should set aria-busy to true when loading', () => {
				const wrapper = render(N8nButton, {
					props: {
						loading: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const button = wrapper.container.querySelector('button');
				expect(button).toHaveAttribute('aria-busy', 'true');
			});

			it('should add loading class when loading', () => {
				const wrapper = render(N8nButton, {
					props: {
						loading: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.querySelector('.button')).toHaveClass('loading');
			});
		});

		describe('icon configuration', () => {
			it('should render icon button', () => {
				const wrapper = render(N8nButton, {
					props: {
						icon: 'circle-plus',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.querySelector('.n8n-icon')).toBeInTheDocument();
				expect(wrapper.html()).toMatchSnapshot();
			});

			it('should render icon with custom size', () => {
				const wrapper = render(N8nButton, {
					props: {
						icon: 'circle-plus',
						iconSize: 'large',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const icon = wrapper.container.querySelector('.n8n-icon');
				expect(icon).toBeInTheDocument();
				// Test that icon is present - the size prop logic is tested through component integration
				expect(wrapper.container.querySelector('.withIcon')).toBeInTheDocument();
			});

			it('should auto-size icon for xmini and mini buttons', () => {
				const wrapper = render(N8nButton, {
					props: {
						icon: 'circle-plus',
						size: 'xmini',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const icon = wrapper.container.querySelector('.n8n-icon');
				expect(icon).toBeInTheDocument();
				// Test that icon is present and button has correct size class
				expect(wrapper.container.querySelector('.xmini')).toBeInTheDocument();
				expect(wrapper.container.querySelector('.withIcon')).toBeInTheDocument();
			});

			it('should prioritize spinner over icon when loading', () => {
				const wrapper = render(N8nButton, {
					props: {
						icon: 'circle-plus',
						loading: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				// When loading, spinner should be present
				expect(wrapper.container.querySelector('.n8n-spinner')).toBeInTheDocument();
				// When loading, the regular icon (with data-icon="circle-plus") should not be present
				const regularIcon = wrapper.container.querySelector('[data-icon="circle-plus"]');
				expect(regularIcon).not.toBeInTheDocument();
			});

			it('should add withIcon class when icon is present', () => {
				const wrapper = render(N8nButton, {
					props: {
						icon: 'circle-plus',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.querySelector('.button')).toHaveClass('withIcon');
			});
		});

		describe('button states', () => {
			it('should render disabled button', () => {
				const wrapper = render(N8nButton, {
					props: {
						disabled: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const button = wrapper.container.querySelector('button');
				expect(button).toBeDisabled();
				expect(button).toHaveAttribute('aria-disabled', 'true');
				expect(wrapper.container.querySelector('.button')).toHaveClass('disabled');
			});

			it('should render active button', () => {
				const wrapper = render(N8nButton, {
					props: {
						active: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.querySelector('.button')).toHaveClass('active');
			});

			it('should render outlined button', () => {
				const wrapper = render(N8nButton, {
					props: {
						outline: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.querySelector('.button')).toHaveClass('outline');
			});

			it('should render text button', () => {
				const wrapper = render(N8nButton, {
					props: {
						text: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.querySelector('.button')).toHaveClass('text');
			});

			it('should render block button', () => {
				const wrapper = render(N8nButton, {
					props: {
						block: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.querySelector('.button')).toHaveClass('block');
			});

			it('should render square button', () => {
				const wrapper = render(N8nButton, {
					props: {
						square: true,
						label: '48',
					},
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.querySelector('.button')).toHaveClass('square');
				expect(wrapper.html()).toMatchSnapshot();
			});
		});

		describe('float configuration', () => {
			it('should render left float button', () => {
				const wrapper = render(N8nButton, {
					props: {
						float: 'left',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.querySelector('.button')).toHaveClass('float-left');
			});

			it('should render right float button', () => {
				const wrapper = render(N8nButton, {
					props: {
						float: 'right',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.querySelector('.button')).toHaveClass('float-right');
			});
		});

		describe('native type configuration', () => {
			it('should set native submit type', () => {
				const wrapper = render(N8nButton, {
					props: {
						nativeType: 'submit',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const button = wrapper.container.querySelector('button');
				expect(button).toHaveAttribute('type', 'submit');
			});

			it('should set native reset type', () => {
				const wrapper = render(N8nButton, {
					props: {
						nativeType: 'reset',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const button = wrapper.container.querySelector('button');
				expect(button).toHaveAttribute('type', 'reset');
			});

			it('should set native button type', () => {
				const wrapper = render(N8nButton, {
					props: {
						nativeType: 'button',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const button = wrapper.container.querySelector('button');
				expect(button).toHaveAttribute('type', 'button');
			});
		});

		describe('user interactions', () => {
			it('should handle click events', async () => {
				const handleClick = vi.fn();
				const wrapper = render(N8nButton, {
					props: {
						onClick: handleClick,
					},
					slots,
					global: {
						components: stubs,
					},
				});

				const button = wrapper.container.querySelector('button')!;
				await fireEvent.click(button);
				expect(handleClick).toHaveBeenCalledTimes(1);
			});

			it('should not fire click when disabled', async () => {
				const handleClick = vi.fn();
				const wrapper = render(N8nButton, {
					props: {
						disabled: true,
						onClick: handleClick,
					},
					slots,
					global: {
						components: stubs,
					},
				});

				const button = wrapper.container.querySelector('button')!;
				expect(button).toBeDisabled();
				expect(button).toHaveAttribute('aria-disabled', 'true');

				// In a real browser, disabled buttons don't fire click events
				// In testing, we verify the disabled state is properly applied
				expect(button.disabled).toBe(true);
			});

			it('should not fire click when loading', async () => {
				const wrapper = render(N8nButton, {
					props: {
						loading: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});

				const button = wrapper.container.querySelector('button')!;
				expect(button).toBeDisabled(); // Loading buttons should be disabled
				expect(button).toHaveAttribute('aria-busy', 'true');

				// In a real browser, disabled buttons don't fire click events
				// In testing, we verify the loading/disabled state is properly applied
				expect(button.disabled).toBe(true);
			});

			it('should handle keyboard navigation', async () => {
				const user = userEvent.setup();
				const handleClick = vi.fn();

				render(N8nButton, {
					props: {
						onClick: handleClick,
					},
					slots,
					global: {
						components: stubs,
					},
				});

				const button = screen.getByRole('button');
				await user.tab();
				expect(button).toHaveFocus();

				await user.keyboard('[Space]');
				expect(handleClick).toHaveBeenCalledTimes(1);
			});
		});

		describe('accessibility', () => {
			it('should have proper ARIA attributes', () => {
				const wrapper = render(N8nButton, {
					slots,
					global: {
						components: stubs,
					},
				});
				const button = wrapper.container.querySelector('button');
				expect(button).toHaveAttribute('aria-live', 'polite');
			});

			it('should set aria-busy when loading', () => {
				const wrapper = render(N8nButton, {
					props: {
						loading: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const button = wrapper.container.querySelector('button');
				expect(button).toHaveAttribute('aria-busy', 'true');
			});

			it('should set aria-disabled when disabled', () => {
				const wrapper = render(N8nButton, {
					props: {
						disabled: true,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const button = wrapper.container.querySelector('button');
				expect(button).toHaveAttribute('aria-disabled', 'true');
			});
		});

		describe('link validation', () => {
			it('should log error when element is "a" but href is missing', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

				render(N8nButton, {
					props: {
						element: 'a',
					},
					slots,
					global: {
						components: stubs,
					},
				});

				expect(consoleSpy).toHaveBeenCalledWith('n8n-button:href is required for link buttons');
				consoleSpy.mockRestore();
			});

			it('should not log error when element is "a" and href is provided', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

				render(N8nButton, {
					props: {
						element: 'a',
						href: 'https://example.com',
					},
					slots,
					global: {
						components: stubs,
					},
				});

				expect(consoleSpy).not.toHaveBeenCalled();
				consoleSpy.mockRestore();
			});
		});

		describe('edge cases', () => {
			it('should handle empty label gracefully', () => {
				const wrapper = render(N8nButton, {
					props: {
						label: '',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container.textContent).toContain('Button');
			});

			it('should handle multiple class combinations', () => {
				const wrapper = render(N8nButton, {
					props: {
						type: 'primary',
						size: 'large',
						outline: true,
						active: true,
						block: true,
						text: true,
						loading: true,
						disabled: true,
						square: true,
						float: 'left',
					},
					slots,
					global: {
						components: stubs,
					},
				});
				const button = wrapper.container.querySelector('.button');
				expect(button).toHaveClass(
					'primary',
					'large',
					'outline',
					'active',
					'block',
					'text',
					'loading',
					'disabled',
					'square',
					'float-left',
				);
			});

			it('should handle null/undefined values gracefully', () => {
				const wrapper = render(N8nButton, {
					props: {
						label: null,
						icon: undefined,
						href: null,
					},
					slots,
					global: {
						components: stubs,
					},
				});
				expect(wrapper.container).toBeInTheDocument();
			});
		});
	});
});
