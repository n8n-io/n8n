import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';

import N8nButton from './Button.vue';

const slots = {
	default: 'Button',
};
const stubs = ['N8nSpinner', 'N8nIcon'];

describe('components', () => {
	describe('N8nButton', () => {
		describe('Legacy API (backwards compatibility)', () => {
			it('should render correctly', () => {
				const wrapper = render(N8nButton, {
					slots,
					global: {
						stubs,
					},
				});
				expect(wrapper.html()).toMatchSnapshot();
			});

			describe('props', () => {
				describe('loading', () => {
					it('should render loading spinner', () => {
						const wrapper = render(N8nButton, {
							props: {
								loading: true,
							},
							slots,
							global: {
								stubs,
							},
						});
						expect(wrapper.html()).toMatchSnapshot();
					});
				});

				describe('icon', () => {
					it('should render icon button with icon name (legacy compat)', () => {
						const wrapper = render(N8nButton, {
							props: {
								icon: 'circle-plus',
							},
							slots,
							global: {
								stubs,
							},
						});
						expect(wrapper.html()).toMatchSnapshot();
					});
				});

				describe('square', () => {
					it('should render square button', () => {
						const wrapper = render(N8nButton, {
							props: {
								square: true,
								label: '48',
							},
							global: {
								stubs,
							},
						});
						expect(wrapper.html()).toMatchSnapshot();
					});
				});

				describe('type', () => {
					it('should render highlight button', () => {
						const wrapper = render(N8nButton, {
							props: {
								type: 'highlight',
							},
							slots,
							global: {
								stubs,
							},
						});
						const button = wrapper.container.querySelector('button');
						expect(button?.className).toContain('highlight');
						expect(wrapper.html()).toMatchSnapshot();
					});

					it('should render success button', () => {
						const wrapper = render(N8nButton, {
							props: {
								type: 'success',
							},
							slots,
							global: {
								stubs,
							},
						});
						const button = wrapper.container.querySelector('button');
						expect(button?.className).toContain('success');
					});

					it('should render warning button', () => {
						const wrapper = render(N8nButton, {
							props: {
								type: 'warning',
							},
							slots,
							global: {
								stubs,
							},
						});
						const button = wrapper.container.querySelector('button');
						expect(button?.className).toContain('warning');
					});
				});

				describe('outline', () => {
					it('should render outline button', () => {
						const wrapper = render(N8nButton, {
							props: {
								outline: true,
							},
							slots,
							global: {
								stubs,
							},
						});
						const button = wrapper.container.querySelector('button');
						expect(button?.className).toContain('outline');
					});
				});

				describe('text', () => {
					it('should render text button', () => {
						const wrapper = render(N8nButton, {
							props: {
								text: true,
							},
							slots,
							global: {
								stubs,
							},
						});
						const button = wrapper.container.querySelector('button');
						expect(button?.className).toContain('ghost');
					});
				});

				describe('block', () => {
					it('should render block button', () => {
						const wrapper = render(N8nButton, {
							props: {
								block: true,
							},
							slots,
							global: {
								stubs,
							},
						});
						const button = wrapper.container.querySelector('button');
						expect(button?.className).toContain('block');
					});
				});

				describe('element', () => {
					it('should render as anchor when element is "a"', () => {
						const wrapper = render(N8nButton, {
							props: {
								element: 'a',
								href: 'https://example.com',
							},
							slots,
							global: {
								stubs,
							},
						});
						const link = wrapper.container.querySelector('a');
						expect(link).toBeInTheDocument();
						expect(link).toHaveAttribute('href', 'https://example.com');
					});
				});

				describe('label', () => {
					it('should render label prop content', () => {
						const wrapper = render(N8nButton, {
							props: {
								label: 'Click me',
							},
							global: {
								stubs,
							},
						});
						expect(wrapper.getByText('Click me')).toBeInTheDocument();
					});
				});
			});
		});

		describe('Current API', () => {
			describe('rendering', () => {
				it('should render correctly with default props', () => {
					const wrapper = render(N8nButton, {
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
					const wrapper = render(N8nButton, {
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
					const wrapper = render(N8nButton, {
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
					const wrapper = render(N8nButton, {
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
					const wrapper = render(N8nButton, {
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
							const wrapper = render(N8nButton, {
								props: { variant },
								slots: { default: 'Button' },
								global: { stubs },
							});
							const button = wrapper.container.querySelector('button');
							expect(button?.className).toContain(variant);
						},
					);
				});

				describe('size', () => {
					it.each(['xsmall', 'small', 'medium'] as const)('should render %s size', (size) => {
						const wrapper = render(N8nButton, {
							props: { size, variant: 'solid' },
							slots: { default: 'Button' },
							global: { stubs },
						});
						const button = wrapper.container.querySelector('button');
						expect(button?.className).toContain(size);
					});
				});

				describe('loading', () => {
					it('should show loading spinner when loading', () => {
						const wrapper = render(N8nButton, {
							props: { loading: true, variant: 'solid' },
							slots: { default: 'Button' },
							global: { stubs },
						});
						const button = wrapper.container.querySelector('button');
						expect(button?.className).toContain('loading');
						expect(wrapper.container.querySelector('n8n-icon-stub')).toBeInTheDocument();
					});

					it('should be disabled while loading', async () => {
						const handleClick = vi.fn();
						const wrapper = render(N8nButton, {
							props: { loading: true, variant: 'solid' },
							attrs: { onClick: handleClick },
							slots: { default: 'Button' },
							global: { stubs },
						});

						const button = wrapper.getByRole('button');
						expect(button).toBeDisabled();
						expect(button).toHaveAttribute('aria-disabled', 'true');

						await userEvent.click(button);
						expect(handleClick).not.toHaveBeenCalled();
					});
				});

				describe('disabled', () => {
					it('should be disabled when disabled prop is true', () => {
						const wrapper = render(N8nButton, {
							props: { disabled: true, variant: 'solid' },
							slots: { default: 'Button' },
							global: { stubs },
						});
						const button = wrapper.getByRole('button');
						expect(button).toBeDisabled();
						expect(button).toHaveAttribute('aria-disabled', 'true');
					});

					it('should apply disabled class', () => {
						const wrapper = render(N8nButton, {
							props: { disabled: true, variant: 'solid' },
							slots: { default: 'Button' },
							global: { stubs },
						});
						const button = wrapper.container.querySelector('button');
						expect(button?.className).toContain('disabled');
					});

					it('should prevent navigation on disabled link button', async () => {
						const wrapper = render(N8nButton, {
							props: {
								href: 'https://example.com',
								disabled: true,
								variant: 'solid',
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

				describe('iconOnly', () => {
					it('should apply iconOnly class for square icon button', () => {
						const wrapper = render(N8nButton, {
							props: {
								iconOnly: true,
								variant: 'solid',
							},
							attrs: {
								'aria-label': 'Icon button',
							},
							slots: { default: '<span>+</span>' },
							global: { stubs },
						});
						const button = wrapper.container.querySelector('button');
						expect(button?.className).toContain('iconOnly');
					});
				});

				describe('class', () => {
					it('should apply custom class', () => {
						const wrapper = render(N8nButton, {
							props: { class: 'custom-class', variant: 'solid' },
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
					const wrapper = render(N8nButton, {
						props: { variant: 'solid' },
						slots: {
							default: '<span data-test-id="slot-content">Custom Content</span>',
						},
						global: { stubs },
					});
					expect(wrapper.getByTestId('slot-content')).toBeInTheDocument();
					expect(wrapper.getByText('Custom Content')).toBeInTheDocument();
				});

				it('should render complex slot content', () => {
					const wrapper = render(N8nButton, {
						props: { variant: 'solid' },
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
					const wrapper = render(N8nButton, {
						props: { variant: 'solid' },
						attrs: { onClick: handleClick },
						slots: { default: 'Button' },
						global: { stubs },
					});

					await userEvent.click(wrapper.getByRole('button'));
					expect(handleClick).toHaveBeenCalledOnce();
				});

				it('should not emit click when disabled', async () => {
					const handleClick = vi.fn();
					const wrapper = render(N8nButton, {
						props: {
							disabled: true,
							variant: 'solid',
						},
						attrs: { onClick: handleClick },
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
					const wrapper = render(N8nButton, {
						props: { variant: 'solid' },
						attrs: { onClick: handleClick },
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
					const wrapper = render(N8nButton, {
						props: { variant: 'solid' },
						slots: { default: 'Button' },
						global: { stubs },
					});
					const button = wrapper.getByRole('button');
					button.focus();
					expect(button).toHaveFocus();
				});

				it('should warn about missing accessible label for icon-only buttons in dev mode', () => {
					const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

					render(N8nButton, {
						props: { iconOnly: true, variant: 'solid' },
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

					render(N8nButton, {
						props: {
							iconOnly: true,
							variant: 'solid',
						},
						attrs: {
							'aria-label': 'Add item',
						},
						slots: { default: '+' },
						global: { stubs },
					});

					const iconWarningCalls = consoleSpy.mock.calls.filter((call) =>
						call[0]?.includes?.('Icon-only buttons should have an accessible label'),
					);
					expect(iconWarningCalls).toHaveLength(0);

					consoleSpy.mockRestore();
				});

				it('should not warn when icon button has title', () => {
					const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

					render(N8nButton, {
						props: {
							iconOnly: true,
							variant: 'solid',
						},
						attrs: {
							title: 'Add item',
						},
						slots: { default: '+' },
						global: { stubs },
					});

					const iconWarningCalls = consoleSpy.mock.calls.filter((call) =>
						call[0]?.includes?.('Icon-only buttons should have an accessible label'),
					);
					expect(iconWarningCalls).toHaveLength(0);

					consoleSpy.mockRestore();
				});
			});

			describe('button type attribute', () => {
				it('should accept custom type attribute', () => {
					const wrapper = render(N8nButton, {
						props: { variant: 'solid', nativeType: 'submit' },
						slots: { default: 'Submit' },
						global: { stubs },
					});
					expect(wrapper.getByRole('button')).toHaveAttribute('type', 'submit');
				});

				it('should pass through additional attributes', () => {
					const wrapper = render(N8nButton, {
						props: { variant: 'solid' },
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
					const wrapper = render(N8nButton, {
						props: { href: 'https://external.com', variant: 'solid' },
						slots: { default: 'External Link' },
						global: { stubs },
					});
					const link = wrapper.container.querySelector('a');
					expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');
				});

				it('should not have disabled attribute on links (uses aria-disabled)', () => {
					const wrapper = render(N8nButton, {
						props: {
							href: 'https://example.com',
							disabled: true,
							variant: 'solid',
						},
						slots: { default: 'Disabled Link' },
						global: { stubs },
					});
					const link = wrapper.container.querySelector('a');
					expect(link).toHaveAttribute('aria-disabled', 'true');
				});
			});
		});

		describe('prop mapping (legacy to current)', () => {
			it('should map type="primary" to solid variant styling', () => {
				const wrapper = render(N8nButton, {
					props: { type: 'primary' },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('solid');
			});

			it('should map type="secondary" to subtle variant styling', () => {
				const wrapper = render(N8nButton, {
					props: { type: 'secondary' },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('subtle');
			});

			it('should map type="tertiary" to ghost variant styling', () => {
				const wrapper = render(N8nButton, {
					props: { type: 'tertiary' },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('ghost');
			});

			it('should map type="danger" to destructive variant styling', () => {
				const wrapper = render(N8nButton, {
					props: { type: 'danger' },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('destructive');
			});

			it('should map outline prop to outline variant', () => {
				const wrapper = render(N8nButton, {
					props: { outline: true },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('outline');
			});

			it('should map text prop to ghost variant', () => {
				const wrapper = render(N8nButton, {
					props: { text: true },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('ghost');
			});

			it('should map size="xmini" to xsmall', () => {
				const wrapper = render(N8nButton, {
					props: { size: 'xmini', variant: 'solid' },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('xsmall');
			});

			it('should map size="mini" to xsmall', () => {
				const wrapper = render(N8nButton, {
					props: { size: 'mini', variant: 'solid' },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('xsmall');
			});

			it('should map square prop to iconOnly behavior', () => {
				const wrapper = render(N8nButton, {
					props: { square: true, variant: 'solid' },
					slots: { default: '+' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('iconOnly');
			});

			it('should prioritize variant prop over type prop', () => {
				const wrapper = render(N8nButton, {
					props: { type: 'primary', variant: 'ghost' },
					slots: { default: 'Button' },
					global: { stubs },
				});
				const button = wrapper.container.querySelector('button');
				expect(button?.className).toContain('ghost');
				expect(button?.className).not.toContain('solid');
			});
		});

		describe('deprecation warnings', () => {
			it('should warn when using type prop', () => {
				const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

				render(N8nButton, {
					props: { type: 'primary' },
					slots: { default: 'Button' },
					global: { stubs },
				});

				expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('type prop is deprecated'));

				consoleSpy.mockRestore();
			});

			it('should warn when using outline prop', () => {
				const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

				render(N8nButton, {
					props: { outline: true },
					slots: { default: 'Button' },
					global: { stubs },
				});

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining('outline prop is deprecated'),
				);

				consoleSpy.mockRestore();
			});

			it('should warn when using text prop', () => {
				const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

				render(N8nButton, {
					props: { text: true },
					slots: { default: 'Button' },
					global: { stubs },
				});

				expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('text prop is deprecated'));

				consoleSpy.mockRestore();
			});

			it('should warn when using label prop', () => {
				const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

				render(N8nButton, {
					props: { label: 'Click me' },
					global: { stubs },
				});

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining('label prop is deprecated'),
				);

				consoleSpy.mockRestore();
			});

			it('should warn when using square prop', () => {
				const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

				render(N8nButton, {
					props: { square: true },
					slots: { default: '+' },
					global: { stubs },
				});

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining('square prop is deprecated'),
				);

				consoleSpy.mockRestore();
			});

			it('should warn when using block prop', () => {
				const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

				render(N8nButton, {
					props: { block: true },
					slots: { default: 'Button' },
					global: { stubs },
				});

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining('block prop is deprecated'),
				);

				consoleSpy.mockRestore();
			});
		});
	});
});
