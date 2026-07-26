import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import ToolResultRenderer from '../components/ToolResultRenderer.vue';

const renderComponent = createComponentRenderer(ToolResultRenderer);

describe('ToolResultRenderer', () => {
	it('renders execute-command stdout as terminal output', () => {
		const { getByTestId, queryByText } = renderComponent({
			props: {
				toolName: 'workspace_execute_command',
				result: {
					success: true,
					exitCode: 0,
					stdout: '#!/usr/bin/env node\n"use strict";\n',
					stderr: '',
					executionTimeMs: 42,
				},
			},
		});

		expect(getByTestId('tool-command-result')).toBeInTheDocument();
		expect(getByTestId('tool-command-stdout')).toHaveTextContent('#!/usr/bin/env node');
		expect(getByTestId('tool-command-stdout')).toHaveTextContent('"use strict";');
		expect(queryByText('"stdout"')).not.toBeInTheDocument();
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

		const embed = container.querySelector('embed');
		expect(embed?.getAttribute('src')).toBe('data:application/pdf;base64,base64-pdf');
		expect(embed?.getAttribute('type')).toBe('application/pdf');
	});
});
