import { createTestingPinia } from '@pinia/testing';
import RunDataHtml from '@/features/ndv/runData/components/RunDataHtml.vue';
import { renderComponent } from '@/__tests__/render';

describe('RunDataHtml.vue', () => {
	it('should render the sanitized HTML into the preview iframe', () => {
		const { container } = renderComponent(RunDataHtml, {
			pinia: createTestingPinia(),
			props: {
				inputHtml: '<p>Hello <strong>World</strong></p>',
			},
		});

		const iframe = container.querySelector('iframe');
		expect(iframe).toBeInTheDocument();
		expect(iframe?.getAttribute('srcdoc')).toContain('Hello');
		expect(iframe?.getAttribute('srcdoc')).toContain('<strong>World</strong>');
	});

	it('should isolate the preview iframe from the parent context', () => {
		const { container } = renderComponent(RunDataHtml, {
			pinia: createTestingPinia(),
			props: {
				inputHtml: '<p>content</p>',
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
		const { container } = renderComponent(RunDataHtml, {
			pinia: createTestingPinia(),
			props: {
				inputHtml: '<style></style/><img src=x onerror=alert(1)>',
			},
		});

		const iframe = container.querySelector('iframe');
		expect(iframe?.getAttribute('sandbox')).toBe('');
	});
});
