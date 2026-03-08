import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';

import N8nSticky from './Sticky.vue';

describe('N8nSticky', () => {
	describe('color handling', () => {
		describe('with preset colors (numbers 1-7)', () => {
			it.each([
				[1, 'color-1'],
				[2, 'color-2'],
				[3, 'color-3'],
				[4, 'color-4'],
				[5, 'color-5'],
				[6, 'color-6'],
				[7, 'color-7'],
			])('applies CSS class for preset color %i', (color, expectedClass) => {
				const wrapper = render(N8nSticky, {
					props: {
						backgroundColor: color,
						modelValue: 'Test content',
					},
				});

				const stickyElement = wrapper.container.querySelector('.n8n-sticky');
				expect(stickyElement?.classList.contains(expectedClass)).toBe(true);
			});

			it('does not apply inline color styles for preset colors', () => {
				const wrapper = render(N8nSticky, {
					props: {
						backgroundColor: 3,
						modelValue: 'Test content',
					},
				});

				const stickyElement = wrapper.container.querySelector('.n8n-sticky') as HTMLElement;
				expect(stickyElement?.style.getPropertyValue('--sticky--color--background')).toBe('');
				expect(stickyElement?.style.getPropertyValue('--sticky--border-color--custom-light')).toBe(
					'',
				);
				expect(stickyElement?.style.getPropertyValue('--sticky--border-color--custom-dark')).toBe(
					'',
				);
			});
		});

		describe('with custom hex colors (strings)', () => {
			it('applies inline CSS variables for valid hex color', () => {
				const hexColor = '#FF5733';
				const wrapper = render(N8nSticky, {
					props: {
						backgroundColor: hexColor,
						modelValue: 'Test content',
					},
				});

				const stickyElement = wrapper.container.querySelector('.n8n-sticky') as HTMLElement;
				expect(stickyElement?.style.getPropertyValue('--sticky--color--background')).toBe(hexColor);
				// Check that theme-aware border colors are set (not exact hex)
				expect(
					stickyElement?.style.getPropertyValue('--sticky--border-color--custom-light'),
				).toBeTruthy();
				expect(
					stickyElement?.style.getPropertyValue('--sticky--border-color--custom-dark'),
				).toBeTruthy();
			});

			it('does not apply color CSS class for hex colors', () => {
				const wrapper = render(N8nSticky, {
					props: {
						backgroundColor: '#FF5733',
						modelValue: 'Test content',
					},
				});

				const stickyElement = wrapper.container.querySelector('.n8n-sticky');
				expect(stickyElement?.classList.contains('color-1')).toBe(false);
				expect(stickyElement?.classList.contains('color-2')).toBe(false);
				expect(stickyElement?.classList.contains('color-3')).toBe(false);
			});

			it('handles invalid hex color gracefully by not applying styles', () => {
				const wrapper = render(N8nSticky, {
					props: {
						backgroundColor: 'invalid-color',
						modelValue: 'Test content',
					},
				});

				const stickyElement = wrapper.container.querySelector('.n8n-sticky') as HTMLElement;
				expect(stickyElement?.style.getPropertyValue('--sticky--color--background')).toBe('');
				expect(stickyElement?.style.getPropertyValue('--sticky--border-color--custom-light')).toBe(
					'',
				);
				expect(stickyElement?.style.getPropertyValue('--sticky--border-color--custom-dark')).toBe(
					'',
				);
			});

			it('applies correct inline styles for multiple valid hex colors', () => {
				const testColors = ['#000000', '#FFFFFF', '#123ABC'];

				testColors.forEach((hexColor) => {
					const wrapper = render(N8nSticky, {
						props: {
							backgroundColor: hexColor,
							modelValue: 'Test content',
						},
					});

					const stickyElement = wrapper.container.querySelector('.n8n-sticky') as HTMLElement;
					expect(stickyElement?.style.getPropertyValue('--sticky--color--background')).toBe(
						hexColor,
					);
				});
			});
		});

		describe('default behavior', () => {
			it('renders without backgroundColor prop', () => {
				const wrapper = render(N8nSticky, {
					props: {
						modelValue: 'Test content',
					},
				});

				const stickyElement = wrapper.container.querySelector('.n8n-sticky');
				expect(stickyElement).toBeTruthy();
			});
		});
	});
});
