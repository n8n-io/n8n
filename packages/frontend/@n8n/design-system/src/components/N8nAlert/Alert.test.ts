/**
 * Comprehensive test suite for N8nAlert component
 */

import { render, screen } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';

import N8nAlert from './Alert.vue';

describe('components', () => {
	describe('N8nAlert', () => {
		describe('Basic Rendering', () => {
			it('should render with props', () => {
				render(N8nAlert, {
					props: { title: 'Title', description: 'Message' },
				});
				expect(screen.getByRole('alert')).toBeVisible();
				expect(screen.getByText('Title')).toBeVisible();
				expect(screen.getByText('Message')).toBeVisible();
			});

			it('should render slots instead of props', () => {
				const { container } = render(N8nAlert, {
					props: { showIcon: false },
					slots: {
						title: 'Title',
						default: 'Message',
						aside: '<button>Click me</button>',
						icon: '<n8n-icon icon="circle-plus" />',
					},
					global: {
						components: {
							'n8n-icon': {
								template: '<span class="n8n-icon" />',
								props: ['icon'],
							},
						},
					},
				});
				expect(screen.getByRole('alert')).toBeVisible();
				expect(screen.getByText('Title')).toBeVisible();
				expect(screen.getByText('Message')).toBeVisible();
				expect(screen.getByRole('button')).toBeVisible();
				expect(container.querySelector('.n8n-icon')).toBeInTheDocument();
			});

			it('should render with default props', () => {
				const { container } = render(N8nAlert);
				const alert = container.querySelector('[role="alert"]');
				expect(alert).toBeInTheDocument();
				expect(alert).toHaveClass('n8n-alert');
			});

			it('should render with minimal content', () => {
				render(N8nAlert, {
					props: { description: 'Simple message' },
				});
				expect(screen.getByRole('alert')).toBeVisible();
				expect(screen.getByText('Simple message')).toBeVisible();
			});
		});

		describe('Alert Types', () => {
			const alertTypes = ['info', 'success', 'warning', 'error'] as const;

			alertTypes.forEach((type) => {
				it(`should render ${type} alert correctly`, () => {
					const { container } = render(N8nAlert, {
						props: {
							type,
							title: `${type} alert`,
							description: `This is a ${type} message`,
						},
					});
					const alert = container.querySelector('[role="alert"]');
					expect(alert).toHaveClass(type);
				});

				it(`should show correct icon for ${type} alert`, () => {
					const { container } = render(N8nAlert, {
						props: {
							type,
							title: `${type} alert`,
							showIcon: true,
						},
						global: {
							components: {
								'n8n-icon': {
									template: '<span class="n8n-icon" :data-icon="icon" />',
									props: ['icon'],
								},
							},
						},
					});

					const icon = container.querySelector('.n8n-icon');
					expect(icon).toBeInTheDocument();

					// Check that the correct icon is used
					const expectedIcons = {
						success: 'circle-check',
						warning: 'triangle-alert',
						error: 'circle-x',
						info: 'info',
					};
					expect(icon).toHaveAttribute('data-icon', expectedIcons[type]);
				});
			});

			it('should default to info type', () => {
				const { container } = render(N8nAlert, {
					props: { description: 'Default alert' },
				});
				const alert = container.querySelector('[role="alert"]');
				expect(alert).toHaveClass('info');
			});
		});

		describe('Effect Configuration', () => {
			it('should render with light effect by default', () => {
				const { container } = render(N8nAlert, {
					props: { description: 'Light effect' },
				});
				const alert = container.querySelector('[role="alert"]');
				expect(alert).toHaveClass('light');
			});

			it('should render with dark effect', () => {
				const { container } = render(N8nAlert, {
					props: {
						effect: 'dark',
						description: 'Dark effect',
					},
				});
				const alert = container.querySelector('[role="alert"]');
				expect(alert).toHaveClass('dark');
			});

			it('should combine type and effect classes', () => {
				const { container } = render(N8nAlert, {
					props: {
						type: 'success',
						effect: 'dark',
						description: 'Success with dark effect',
					},
				});
				const alert = container.querySelector('[role="alert"]');
				expect(alert).toHaveClass('success', 'dark');
			});
		});

		describe('Icon Configuration', () => {
			it('should show icon by default', () => {
				const { container } = render(N8nAlert, {
					props: { description: 'With icon' },
					global: {
						components: {
							'n8n-icon': {
								template: '<span class="n8n-icon" />',
								props: ['icon'],
							},
						},
					},
				});
				const icon = container.querySelector('.n8n-icon');
				expect(icon).toBeInTheDocument();
			});

			it('should hide icon when showIcon is false', () => {
				const { container } = render(N8nAlert, {
					props: {
						showIcon: false,
						description: 'Without icon',
					},
					global: {
						components: {
							'n8n-icon': {
								template: '<span class="n8n-icon" />',
								props: ['icon'],
							},
						},
					},
				});
				const icon = container.querySelector('.n8n-icon');
				expect(icon).not.toBeInTheDocument();
			});

			it('should use custom icon slot when provided', () => {
				const { container } = render(N8nAlert, {
					props: { showIcon: false },
					slots: {
						icon: '<span class="custom-icon">Custom</span>',
						default: 'Custom icon alert',
					},
				});
				const customIcon = container.querySelector('.custom-icon');
				expect(customIcon).toBeInTheDocument();
				expect(customIcon).toHaveTextContent('Custom');
			});

			it('should prefer icon slot over showIcon prop', () => {
				const { container } = render(N8nAlert, {
					props: { showIcon: true },
					slots: {
						icon: '<span class="custom-icon">Slot Icon</span>',
						default: 'Slot takes precedence',
					},
					global: {
						components: {
							'n8n-icon': {
								template: '<span class="n8n-icon" />',
								props: ['icon'],
							},
						},
					},
				});
				const customIcon = container.querySelector('.custom-icon');
				const defaultIcon = container.querySelector('.n8n-icon');
				expect(customIcon).toBeInTheDocument();
				expect(defaultIcon).not.toBeInTheDocument();
			});
		});

		describe('Background Configuration', () => {
			it('should have background by default', () => {
				const { container } = render(N8nAlert, {
					props: { description: 'With background' },
				});
				const alert = container.querySelector('[role="alert"]');
				expect(alert).toHaveClass('background');
			});

			it('should not have background when background prop is false', () => {
				const { container } = render(N8nAlert, {
					props: {
						background: false,
						description: 'Without background',
					},
				});
				const alert = container.querySelector('[role="alert"]');
				expect(alert).not.toHaveClass('background');
			});
		});

		describe('Center Alignment', () => {
			it('should not be centered by default', () => {
				const { container } = render(N8nAlert, {
					props: { description: 'Not centered' },
				});
				const alert = container.querySelector('[role="alert"]');
				expect(alert).not.toHaveClass('center');
			});

			it('should be centered when center prop is true', () => {
				const { container } = render(N8nAlert, {
					props: {
						center: true,
						description: 'Centered alert',
					},
				});
				const alert = container.querySelector('[role="alert"]');
				expect(alert).toHaveClass('center');
			});
		});

		describe('Content Structure', () => {
			it('should render title and description in correct structure', () => {
				const { container } = render(N8nAlert, {
					props: {
						title: 'Alert Title',
						description: 'Alert Description',
					},
				});

				const titleElement = container.querySelector('.title');
				const descriptionElement = container.querySelector('.description');

				expect(titleElement).toHaveTextContent('Alert Title');
				expect(descriptionElement).toHaveTextContent('Alert Description');
				expect(descriptionElement).toHaveClass('hasTitle');
			});

			it('should render description without hasTitle class when no title', () => {
				const { container } = render(N8nAlert, {
					props: {
						description: 'Only description',
					},
				});

				const descriptionElement = container.querySelector('.description');
				expect(descriptionElement).toHaveTextContent('Only description');
				expect(descriptionElement).not.toHaveClass('hasTitle');
			});

			it('should render only title when no description', () => {
				const { container } = render(N8nAlert, {
					props: {
						title: 'Only title',
					},
				});

				const titleElement = container.querySelector('.title');
				const descriptionElement = container.querySelector('.description');

				expect(titleElement).toHaveTextContent('Only title');
				expect(descriptionElement).not.toBeInTheDocument();
			});
		});

		describe('Slots', () => {
			it('should render title slot content', () => {
				render(N8nAlert, {
					slots: {
						title: '<strong>Bold Title</strong>',
						default: 'Message content',
					},
				});
				const titleElement = screen.getByText('Bold Title');
				expect(titleElement).toBeInTheDocument();
				expect(titleElement.tagName.toLowerCase()).toBe('strong');
			});

			it('should render default slot content', () => {
				render(N8nAlert, {
					slots: {
						default: '<em>Emphasized message</em>',
					},
				});
				const messageElement = screen.getByText('Emphasized message');
				expect(messageElement).toBeInTheDocument();
				expect(messageElement.tagName.toLowerCase()).toBe('em');
			});

			it('should render aside slot content', () => {
				render(N8nAlert, {
					props: { description: 'Main message' },
					slots: {
						aside: '<button type="button">Action Button</button>',
					},
				});
				const button = screen.getByRole('button', { name: 'Action Button' });
				expect(button).toBeInTheDocument();
			});

			it('should prefer slot content over props', () => {
				render(N8nAlert, {
					props: {
						title: 'Prop Title',
						description: 'Prop Description',
					},
					slots: {
						title: 'Slot Title',
						default: 'Slot Description',
					},
				});

				expect(screen.getByText('Slot Title')).toBeInTheDocument();
				expect(screen.getByText('Slot Description')).toBeInTheDocument();
				expect(screen.queryByText('Prop Title')).not.toBeInTheDocument();
				expect(screen.queryByText('Prop Description')).not.toBeInTheDocument();
			});

			it('should render multiple slots simultaneously', () => {
				render(N8nAlert, {
					slots: {
						title: 'Slot Title',
						default: 'Slot Message',
						aside: '<span>Aside Content</span>',
						icon: '<span class="custom-icon">Icon</span>',
					},
				});

				expect(screen.getByText('Slot Title')).toBeInTheDocument();
				expect(screen.getByText('Slot Message')).toBeInTheDocument();
				expect(screen.getByText('Aside Content')).toBeInTheDocument();
				expect(screen.getByText('Icon')).toBeInTheDocument();
			});
		});

		describe('Class Combinations', () => {
			it('should apply all relevant classes', () => {
				const { container } = render(N8nAlert, {
					props: {
						type: 'warning',
						effect: 'dark',
						center: true,
						background: true,
						title: 'Complex Alert',
						description: 'With all options',
					},
				});

				const alert = container.querySelector('[role="alert"]');
				expect(alert).toHaveClass('n8n-alert', 'warning', 'dark', 'center', 'background');
			});

			it('should handle minimal class combination', () => {
				const { container } = render(N8nAlert, {
					props: {
						type: 'error',
						effect: 'light',
						center: false,
						background: false,
						showIcon: false,
						description: 'Minimal alert',
					},
				});

				const alert = container.querySelector('[role="alert"]');
				expect(alert).toHaveClass('n8n-alert', 'error', 'light');
				expect(alert).not.toHaveClass('center', 'background');
			});
		});

		describe('Accessibility', () => {
			it('should have proper alert role', () => {
				render(N8nAlert, {
					props: { description: 'Accessible alert' },
				});
				const alert = screen.getByRole('alert');
				expect(alert).toBeInTheDocument();
			});

			it('should be announced to screen readers', () => {
				render(N8nAlert, {
					props: {
						title: 'Important Alert',
						description: 'This message is important',
					},
				});

				const alert = screen.getByRole('alert');
				expect(alert).toHaveAttribute('role', 'alert');
			});

			it('should support custom aria attributes', () => {
				const { container } = render(N8nAlert, {
					props: {
						description: 'Alert with custom aria',
						'aria-label': 'Custom alert label',
						'aria-describedby': 'external-description',
					},
				});

				const alert = container.querySelector('[role="alert"]');
				expect(alert).toHaveAttribute('aria-label', 'Custom alert label');
				expect(alert).toHaveAttribute('aria-describedby', 'external-description');
			});
		});

		describe('Edge Cases', () => {
			it('should handle empty content gracefully', () => {
				const { container } = render(N8nAlert);
				const alert = container.querySelector('[role="alert"]');
				expect(alert).toBeInTheDocument();
				expect(alert).toHaveClass('n8n-alert');
			});

			it('should handle empty string props', () => {
				render(N8nAlert, {
					props: {
						title: '',
						description: '',
					},
				});

				const alert = screen.getByRole('alert');
				expect(alert).toBeInTheDocument();
			});

			it('should handle very long content', () => {
				const longTitle = 'Very long title '.repeat(20);
				const longDescription = 'Very long description '.repeat(50);

				render(N8nAlert, {
					props: {
						title: longTitle,
						description: longDescription,
					},
				});

				expect(screen.getByText(longTitle)).toBeInTheDocument();
				expect(screen.getByText(longDescription)).toBeInTheDocument();
			});

			it('should handle special characters in content', () => {
				const specialTitle = '!@#$%^&*()_+-=[]{}|;:",.<>? 日本語 émojis 🎉';
				const specialDescription = '<script>alert("xss")</script> & other special chars';

				render(N8nAlert, {
					props: {
						title: specialTitle,
						description: specialDescription,
					},
				});

				expect(screen.getByText(specialTitle)).toBeInTheDocument();
				expect(screen.getByText(specialDescription)).toBeInTheDocument();
			});

			it('should handle all false boolean props', () => {
				const { container } = render(N8nAlert, {
					props: {
						showIcon: false,
						center: false,
						background: false,
						description: 'All false',
					},
				});

				const alert = container.querySelector('[role="alert"]');
				expect(alert).toHaveClass('n8n-alert', 'info', 'light');
				expect(alert).not.toHaveClass('center', 'background');
			});

			it('should handle mixed content types', () => {
				render(N8nAlert, {
					props: {
						title: 'Prop Title',
					},
					slots: {
						default: '<span>Slot Content</span>',
						aside: '<button>Action</button>',
					},
				});

				expect(screen.getByText('Prop Title')).toBeInTheDocument();
				expect(screen.getByText('Slot Content')).toBeInTheDocument();
				expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
			});
		});

		describe('Visual Styling Structure', () => {
			it('should have correct DOM structure', () => {
				const { container } = render(N8nAlert, {
					props: {
						title: 'Test Title',
						description: 'Test Description',
					},
					slots: {
						aside: '<span>Aside</span>',
					},
					global: {
						components: {
							'n8n-icon': {
								template: '<span class="n8n-icon" />',
								props: ['icon'],
							},
						},
					},
				});

				const alert = container.querySelector('[role="alert"]');
				const content = alert?.querySelector('.content');
				const icon = content?.querySelector('.icon');
				const text = content?.querySelector('.text');
				const title = text?.querySelector('.title');
				const description = text?.querySelector('.description');
				const aside = alert?.querySelector('.aside');

				expect(content).toBeInTheDocument();
				expect(icon).toBeInTheDocument();
				expect(text).toBeInTheDocument();
				expect(title).toBeInTheDocument();
				expect(description).toBeInTheDocument();
				expect(aside).toBeInTheDocument();
			});

			it('should omit optional elements when not provided', () => {
				const { container } = render(N8nAlert, {
					props: {
						showIcon: false,
						description: 'Only description',
					},
				});

				const alert = container.querySelector('[role="alert"]');
				const icon = alert?.querySelector('.icon');
				const title = alert?.querySelector('.title');
				const aside = alert?.querySelector('.aside');

				expect(icon).not.toBeInTheDocument();
				expect(title).not.toBeInTheDocument();
				expect(aside).not.toBeInTheDocument();
			});
		});
	});
});
