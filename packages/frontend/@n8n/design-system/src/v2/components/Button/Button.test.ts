import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';

import Button from './Button.vue';

const stubs = ['N8nIcon'];

describe('v2/components/Button', () => {
	describe('rendering', () => {
		it('should render correctly with default props', () => {
			const wrapper = render(Button, {
				slots: {
					default: 'Click me',
				},
				global: {
					stubs,
				},
			});
			expect(wrapper.getByRole('button')).toBeInTheDocument();
			expect(wrapper.getByText('Click me')).toBeInTheDocument();
		});

		it('should render as button element by default', () => {
			const wrapper = render(Button, {
				slots: {
					default: 'Button',
				},
				global: {
					stubs,
				},
			});
			expect(wrapper.container.querySelector('button')).toBeInTheDocument();
		});

		it('should render as anchor element when href is provided', () => {
			const wrapper = render(Button, {
				props: {
					href: 'https://example.com',
				},
				slots: {
					default: 'Link Button',
				},
				global: {
					stubs,
				},
			});
			const link = wrapper.container.querySelector('a');
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute('href', 'https://example.com');
			expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');
		});

		it('should have type="button" by default', () => {
			const wrapper = render(Button, {
				slots: {
					default: 'Button',
				},
				global: {
					stubs,
				},
			});
			expect(wrapper.getByRole('button')).toHaveAttribute('type', 'button');
		});

		it('should not have type attribute when rendered as link', () => {
			const wrapper = render(Button, {
				props: {
					href: 'https://example.com',
				},
				slots: {
					default: 'Link',
				},
				global: {
					stubs,
				},
			});
			const link = wrapper.container.querySelector('a');
			expect(link).not.toHaveAttribute('type');
		});
	});

	describe('props', () => {
		describe('variant', () => {
			it.each(['solid', 'subtle', 'ghost', 'outline', 'destructive'] as const)(
				'should render %s variant',
				(variant) => {
					const wrapper = render(Button, {
						props: { variant },
						slots: { default: 'Button' },
						global: { stubs },
					});
					const button = wrapper.container.querySelector('button');
					expect(button?.className).toContain(variant);
				},
			);

			it('should default to outline variant', () => {
				const wrapper = render(Button, {
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('outline');
			});
		});

		describe('size', () => {
			it.each(['xsmall', 'small', 'medium'] as const)('should render %s size', (size) => {
				const wrapper = render(Button, {
					props: { size },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain(size);
			});

			it('should default to small size', () => {
				const wrapper = render(Button, {
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('small');
			});
		});

		describe('loading', () => {
			it('should show loading spinner when loading', () => {
				const wrapper = render(Button, {
					props: { loading: true },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('loading');
				expect(wrapper.container.querySelector('n8n-icon-stub')).toBeInTheDocument();
			});

			it('should be disabled while loading', async () => {
				const handleClick = vi.fn();
				const wrapper = render(Button, {
					props: { loading: true, onClick: handleClick },
					slots: { default: 'Button' },
					global: { stubs },
				});

				const button = wrapper.getByRole('button');
				expect(button).toBeDisabled();
				expect(button).toHaveAttribute('aria-disabled', 'true');

				// Verify clicks are blocked
				await userEvent.click(button);
				expect(handleClick).not.toHaveBeenCalled();

				// Verify keyboard activation is also blocked
				button.focus();
				await userEvent.keyboard('{Enter}');
				expect(handleClick).not.toHaveBeenCalled();
			});

			it('applies loading CSS class to wrapper element', () => {
				const wrapper = render(Button, {
					props: { loading: true },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('loading');
			});
		});

		describe('disabled', () => {
			it('should be disabled when disabled prop is true', () => {
				const wrapper = render(Button, {
					props: { disabled: true },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.getByRole('button');
				expect(button).toBeDisabled();
				expect(button).toHaveAttribute('aria-disabled', 'true');
			});

			it('should apply disabled class', () => {
				const wrapper = render(Button, {
					props: { disabled: true },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('disabled');
			});

			it('should prevent navigation on disabled link button', async () => {
				const wrapper = render(Button, {
					props: {
						href: 'https://example.com',
						disabled: true,
					},
					slots: { default: 'Link' },
					global: { stubs },
				});
				const link = wrapper.container.querySelector('a')!;

				const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
				const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

				link.dispatchEvent(clickEvent);

				expect(preventDefaultSpy).toHaveBeenCalled();
			});
		});

		describe('icon', () => {
			it('should apply icon class for square icon button', () => {
				const wrapper = render(Button, {
					props: {
						icon: true,
						'aria-label': 'Icon button',
					},
					slots: { default: '<span>+</span>' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('icon');
			});
		});

		describe('class', () => {
			it('should apply custom class', () => {
				const wrapper = render(Button, {
					props: { class: 'custom-class' },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('custom-class');
			});
		});
	});

	describe('slots', () => {
		it('should render default slot content', () => {
			const wrapper = render(Button, {
				slots: {
					default: '<span data-test-id="slot-content">Custom Content</span>',
				},
				global: { stubs },
			});
			expect(wrapper.getByTestId('slot-content')).toBeInTheDocument();
			expect(wrapper.getByText('Custom Content')).toBeInTheDocument();
		});

		it('should render complex slot content', () => {
			const wrapper = render(Button, {
				slots: {
					default: '<span>Icon</span><span>Text</span>',
				},
				global: { stubs },
			});
			expect(wrapper.getByText('Icon')).toBeInTheDocument();
			expect(wrapper.getByText('Text')).toBeInTheDocument();
		});
	});

	describe('events', () => {
		it('should emit click event', async () => {
			const handleClick = vi.fn();
			const wrapper = render(Button, {
				props: { onClick: handleClick },
				slots: { default: 'Button' },
				global: { stubs },
			});

			await userEvent.click(wrapper.getByRole('button'));
			expect(handleClick).toHaveBeenCalledOnce();
		});

		it('should not emit click when disabled', async () => {
			const handleClick = vi.fn();
			const wrapper = render(Button, {
				props: {
					disabled: true,
					onClick: handleClick,
				},
				slots: { default: 'Button' },
				global: { stubs },
			});

			await userEvent.click(wrapper.getByRole('button'));
			expect(handleClick).not.toHaveBeenCalled();
		});
	});

	describe('accessibility', () => {
		it('should be keyboard accessible', async () => {
			const handleClick = vi.fn();
			const wrapper = render(Button, {
				props: { onClick: handleClick },
				slots: { default: 'Button' },
				global: { stubs },
			});

			const button = wrapper.getByRole('button');
			button.focus();
			expect(button).toHaveFocus();

			await userEvent.keyboard('{Enter}');
			expect(handleClick).toHaveBeenCalledOnce();
		});

		it('should be focusable', () => {
			const wrapper = render(Button, {
				slots: { default: 'Button' },
				global: { stubs },
			});
			const button = wrapper.getByRole('button');
			button.focus();
			expect(button).toHaveFocus();
		});

		it('should warn about missing accessible label for icon-only buttons in dev mode', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			render(Button, {
				props: { icon: true },
				slots: { default: '+' },
				global: { stubs },
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Icon-only buttons should have an accessible label'),
			);

			consoleSpy.mockRestore();
		});

		it('should not warn when icon button has aria-label', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			render(Button, {
				props: {
					icon: true,
					'aria-label': 'Add item',
				},
				slots: { default: '+' },
				global: { stubs },
			});

			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it('should not warn when icon button has title', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			render(Button, {
				props: {
					icon: true,
					title: 'Add item',
				},
				slots: { default: '+' },
				global: { stubs },
			});

			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('button type attribute', () => {
		it('should accept custom type attribute', () => {
			const wrapper = render(Button, {
				attrs: { type: 'submit' },
				slots: { default: 'Submit' },
				global: { stubs },
			});
			expect(wrapper.getByRole('button')).toHaveAttribute('type', 'submit');
		});

		it('should pass through additional attributes', () => {
			const wrapper = render(Button, {
				attrs: {
					'data-test-id': 'custom-button',
					'aria-describedby': 'help-text',
				},
				slots: { default: 'Button' },
				global: { stubs },
			});
			const button = wrapper.getByRole('button');
			expect(button).toHaveAttribute('data-test-id', 'custom-button');
			expect(button).toHaveAttribute('aria-describedby', 'help-text');
		});
	});

	describe('link button', () => {
		it('should render link with proper security attributes', () => {
			const wrapper = render(Button, {
				props: { href: 'https://external.com' },
				slots: { default: 'External Link' },
				global: { stubs },
			});
			const link = wrapper.container.querySelector('a');
			expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');
		});

		it('should not have disabled attribute on links (uses aria-disabled)', () => {
			const wrapper = render(Button, {
				props: {
					href: 'https://example.com',
					disabled: true,
				},
				slots: { default: 'Disabled Link' },
				global: { stubs },
			});
			const link = wrapper.container.querySelector('a');
			// Links don't support disabled attribute, but should have aria-disabled
			expect(link).toHaveAttribute('aria-disabled', 'true');
		});
	});
});
