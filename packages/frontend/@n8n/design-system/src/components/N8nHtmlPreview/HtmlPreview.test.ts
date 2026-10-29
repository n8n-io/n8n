import { render } from '@testing-library/vue';

import N8nHtmlPreview from './HtmlPreview.vue';

describe('N8nHtmlPreview', () => {
	it('should render the sanitized HTML into the preview iframe', () => {
		const { container } = render(N8nHtmlPreview, {
			props: {
				html: '<p>Hello <strong>World</strong></p>',
			},
		});

		const iframe = container.querySelector('iframe');
		expect(iframe).toBeInTheDocument();
		expect(iframe?.getAttribute('srcdoc')).toContain('Hello');
		expect(iframe?.getAttribute('srcdoc')).toContain('<strong>World</strong>');
	});

	it('should isolate the preview iframe from the parent context', () => {
		const { container } = render(N8nHtmlPreview, {
			props: {
				html: '<p>content</p>',
			},
		});

		const iframe = container.querySelector('iframe');
		// Empty sandbox disables scripts and same-origin access; combined with
		// no-referrer this keeps previewed HTML from reaching the parent origin.
		expect(iframe?.getAttribute('sandbox')).toBe('');
		expect(iframe?.getAttribute('referrerpolicy')).toBe('no-referrer');
	});

	it('should keep the preview isolated even when sanitized markup retains attributes', () => {
		// Some malformed inputs survive sanitization with attributes intact, so the
		// sandbox is the boundary that must hold regardless of the rendered markup.
		const { container } = render(N8nHtmlPreview, {
			props: {
				html: '<style></style/><img src=x onerror=alert(1)>',
			},
		});

		const iframe = container.querySelector('iframe');
		expect(iframe?.getAttribute('sandbox')).toBe('');
	});

	it('should keep the class that callers use to select the iframe', () => {
		const { container } = render(N8nHtmlPreview, {
			props: {
				html: '<p>content</p>',
			},
		});

		expect(container.querySelector('iframe')).toHaveClass('__html-display');
	});
});
