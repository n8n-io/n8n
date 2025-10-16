import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import StringCellRenderer from './StringCellRenderer.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			if (key === 'dataTable.viewFull' && options?.interpolate?.size) {
				return `View full (${options.interpolate.size} KB)`;
			}
			return key;
		},
	}),
}));

describe('StringCellRenderer', () => {
	const renderComponent = createComponentRenderer(StringCellRenderer);

	describe('Small strings', () => {
		it('should render small strings without truncation', () => {
			const smallString = 'Hello, world!';
			const { container } = renderComponent({
				props: {
					params: {
						value: smallString,
					},
				},
			});

			expect(container.textContent).toContain(smallString);
			expect(container.querySelector('[data-test-id="view-full-string-button"]')).toBeNull();
		});

		it('should render medium strings (under 1000 chars) without View full button', () => {
			const mediumString = 'x'.repeat(500);
			const { container } = renderComponent({
				props: {
					params: {
						value: mediumString,
					},
				},
			});

			expect(container.textContent).toContain(mediumString);
			expect(container.querySelector('[data-test-id="view-full-string-button"]')).toBeNull();
		});
	});

	describe('Large strings', () => {
		it('should truncate large strings and show View full button', () => {
			const largeString = 'x'.repeat(2000);
			const { container, getByTestId } = renderComponent({
				props: {
					params: {
						value: largeString,
						onViewFull: vi.fn(),
					},
				},
			});

			// Should show truncated content
			expect(container.textContent).toContain('x'.repeat(300));
			// Should show ellipsis
			expect(container.textContent).toContain('...');
			// Should show View full button
			expect(getByTestId('view-full-string-button')).toBeInTheDocument();
		});

		it('should call onViewFull when View full button is clicked', async () => {
			const largeString = 'x'.repeat(2000);
			const onViewFull = vi.fn();
			const { getByTestId } = renderComponent({
				props: {
					params: {
						value: largeString,
						onViewFull,
					},
				},
			});

			const button = getByTestId('view-full-string-button');
			await button.click();

			expect(onViewFull).toHaveBeenCalledWith(largeString);
		});

		it('should display correct size in KB for large strings', () => {
			// Create a string that's approximately 1.7 MB (similar to user report)
			const largeString = 'x'.repeat(1700000);
			const { getByTestId } = renderComponent({
				props: {
					params: {
						value: largeString,
						onViewFull: vi.fn(),
					},
				},
			});

			const button = getByTestId('view-full-string-button');
			// Size should be shown in the button text
			expect(button.textContent).toContain('KB');
		});
	});

	describe('HTML escaping', () => {
		it('should render HTML tags as text, not markup', () => {
			const htmlString = '<script>alert("XSS")</script><h1>Title</h1>';
			const { container } = renderComponent({
				props: {
					params: {
						value: htmlString,
					},
				},
			});

			// HTML should be rendered as text, not executed
			expect(container.textContent).toContain('<script>');
			expect(container.textContent).toContain('</script>');
			expect(container.textContent).toContain('<h1>');
			// Should not create actual HTML elements
			expect(container.querySelector('script')).toBeNull();
			expect(container.querySelector('h1')).toBeNull();
		});

		it('should escape large HTML content (like 404 page)', () => {
			const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body>
<h1>404 - Page Not Found</h1>
<p>The page you are looking for does not exist.</p>
${'<div>Content</div>\n'.repeat(500)}
</body>
</html>
			`.trim();

			const { container } = renderComponent({
				props: {
					params: {
						value: htmlContent,
						onViewFull: vi.fn(),
					},
				},
			});

			// HTML should be rendered as text
			expect(container.textContent).toContain('<!DOCTYPE html>');
			expect(container.textContent).toContain('404 - Page Not Found');
			// Should not create actual HTML elements
			expect(container.querySelector('h1')).toBeNull();
		});
	});

	describe('Edge cases', () => {
		it('should handle strings at exactly 1000 chars threshold', () => {
			const thresholdString = 'x'.repeat(1000);
			const { container } = renderComponent({
				props: {
					params: {
						value: thresholdString,
					},
				},
			});

			expect(container.textContent).toContain(thresholdString);
			expect(container.querySelector('[data-test-id="view-full-string-button"]')).toBeNull();
		});

		it('should handle strings at 1001 chars (just over threshold)', () => {
			const overThresholdString = 'x'.repeat(1001);
			const { getByTestId } = renderComponent({
				props: {
					params: {
						value: overThresholdString,
						onViewFull: vi.fn(),
					},
				},
			});

			expect(getByTestId('view-full-string-button')).toBeInTheDocument();
		});

		it('should handle strings with newlines', () => {
			const multilineString = 'Line 1\nLine 2\nLine 3\n'.repeat(100);
			const { container, getByTestId } = renderComponent({
				props: {
					params: {
						value: multilineString,
						onViewFull: vi.fn(),
					},
				},
			});

			expect(container.textContent).toContain('Line 1');
			expect(getByTestId('view-full-string-button')).toBeInTheDocument();
		});

		it('should handle very large strings (>1.7MB) without breaking', () => {
			// Simulate the user-reported issue: 1.648MB string
			const veryLargeString = 'x'.repeat(1700000);
			const { getByTestId } = renderComponent({
				props: {
					params: {
						value: veryLargeString,
						onViewFull: vi.fn(),
					},
				},
			});

			// Should still render the component and show View full button
			expect(getByTestId('view-full-string-button')).toBeInTheDocument();
		});
	});
});
