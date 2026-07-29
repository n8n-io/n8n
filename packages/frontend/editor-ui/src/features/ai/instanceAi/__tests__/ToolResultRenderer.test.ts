import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import ToolResultRenderer from '../components/ToolResultRenderer.vue';

const renderComponent = createComponentRenderer(ToolResultRenderer);

describe('ToolResultRenderer', () => {
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

		const embed = container.querySelector('embed');
		expect(embed?.getAttribute('src')).toBe('data:application/pdf;base64,base64-pdf');
		expect(embed?.getAttribute('type')).toBe('application/pdf');
	});
});
