import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import ToolResultRenderer from '../components/ToolResultRenderer.vue';

const renderComponent = createComponentRenderer(ToolResultRenderer);

describe('ToolResultRenderer', () => {
	it.each([
		{ mediaType: 'image/png', selector: 'img' },
		{ mediaType: 'application/pdf', selector: 'iframe' },
	])('renders tagged $mediaType data with and without text', ({ mediaType, selector }) => {
		const file = { type: 'file', data: { type: 'data', data: 'YWJj' }, mediaType };
		const { container, getByText, rerender } = renderComponent({
			props: {
				toolName: 'read_file',
				result: { type: 'content', value: [file] },
			},
		});

		expect(container.querySelector(selector)?.getAttribute('src')).toBe(
			`data:${mediaType};base64,YWJj`,
		);
		if (mediaType === 'application/pdf') {
			expect(container.querySelector('embed')).not.toBeInTheDocument();
			expect(container.querySelector('iframe')?.getAttribute('title')).toBeTruthy();
		}

		return rerender({
			result: { type: 'content', value: [{ type: 'text', text: 'file result' }, file] },
		}).then(() => {
			expect(getByText('file result')).toBeInTheDocument();
			expect(container.querySelector(selector)?.getAttribute('src')).toBe(
				`data:${mediaType};base64,YWJj`,
			);
		});
	});

	it.each([
		null,
		{ type: 'data', data: 123 },
		{ type: 'url', url: 'https://example.test/file.png' },
		{ type: 'reference', reference: 'file-123' },
	])('ignores unsupported tagged file data: %j', (data) => {
		const { container, getByText } = renderComponent({
			props: {
				toolName: 'read_file',
				result: {
					type: 'content',
					value: [
						{ type: 'text', text: 'file result' },
						{ type: 'file', data, mediaType: 'image/png' },
					],
				},
			},
		});

		expect(getByText('file result')).toBeInTheDocument();
		expect(container.querySelector('img, iframe')).not.toBeInTheDocument();
	});

	it('renders MCP image content', () => {
		const { container, getByText } = renderComponent({
			props: {
				toolName: 'screen_screenshot',
				result: {
					content: [
						{ type: 'text', text: 'current browser screenshot' },
						{ type: 'image', data: 'base64-screenshot', mimeType: 'image/png' },
					],
				},
			},
		});

		expect(getByText('current browser screenshot')).toBeInTheDocument();
		const image = container.querySelector('img');
		expect(image?.getAttribute('src')).toBe('data:image/png;base64,base64-screenshot');
	});

	it('renders AI SDK content tool output with image data', () => {
		const { container, getByText } = renderComponent({
			props: {
				toolName: 'screen_screenshot',
				result: {
					type: 'content',
					value: [
						{ type: 'text', text: 'current browser screenshot' },
						{ type: 'image-data', data: 'base64-screenshot', mediaType: 'image/png' },
					],
				},
			},
		});

		expect(getByText('current browser screenshot')).toBeInTheDocument();
		const image = container.querySelector('img');
		expect(image?.getAttribute('src')).toBe('data:image/png;base64,base64-screenshot');
	});

	it('renders AI SDK content tool output with file-data as a file', () => {
		const { container } = renderComponent({
			props: {
				toolName: 'read_file',
				result: {
					type: 'content',
					value: [{ type: 'file-data', data: 'base64-pdf', mediaType: 'application/pdf' }],
				},
			},
		});

		const iframe = container.querySelector('iframe');
		expect(iframe?.getAttribute('src')).toBe('data:application/pdf;base64,base64-pdf');
		// An `<embed>` would be refused by `object-src 'none'`.
		expect(container.querySelector('embed')).not.toBeInTheDocument();
		// An iframe needs a title where an embed did not.
		expect(iframe?.getAttribute('title')).toBeTruthy();
	});
});
