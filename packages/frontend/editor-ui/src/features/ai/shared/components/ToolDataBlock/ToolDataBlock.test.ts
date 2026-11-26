import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { saveAs } from 'file-saver';
import { createComponentRenderer } from '@/__tests__/render';
import ToolDataBlock from './ToolDataBlock.vue';
import { MAX_TOOL_DATA_DISPLAY_LENGTH } from './toolData.utils';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

const renderComponent = createComponentRenderer(ToolDataBlock);

/** jsdom's Blob has no text() method. */
async function readBlob(blob: Blob): Promise<string> {
	return await new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.readAsText(blob);
	});
}

describe('ToolDataBlock', () => {
	it('highlights JSON by token type', () => {
		const { container } = renderComponent({
			props: { value: { name: 'Flow', count: 3, active: true } },
		});

		expect(container.querySelector('.hljs-attr')).toHaveTextContent('"name"');
		expect(container.querySelector('.hljs-string')).toHaveTextContent('"Flow"');
		expect(container.querySelector('.hljs-number')).toHaveTextContent('3');
		expect(container.querySelector('.hljs-literal')).toHaveTextContent('true');
		expect(container.querySelector('code')?.textContent).toBe(
			JSON.stringify({ name: 'Flow', count: 3, active: true }, null, 2),
		);
	});

	it('shows plain strings without JSON highlighting', () => {
		const { container } = renderComponent({ props: { value: 'total 0\ndrwxr-xr-x  .' } });

		expect(container.querySelector('.hljs-attr')).not.toBeInTheDocument();
		expect(container.querySelector('code')?.textContent).toBe('total 0\ndrwxr-xr-x  .');
	});

	it('escapes HTML in the data', () => {
		const { container } = renderComponent({
			props: { value: { '<b>key</b>': '<img src=x onerror=alert(1)>' } },
		});

		expect(container.querySelector('img')).not.toBeInTheDocument();
		expect(container.querySelector('b')).not.toBeInTheDocument();
		expect(container.querySelector('code')?.textContent).toContain('<img src=x onerror=alert(1)>');
	});

	it('shortens large data and downloads all of it', async () => {
		const value = { data: 'x'.repeat(MAX_TOOL_DATA_DISPLAY_LENGTH) };
		const { container, getByTestId } = renderComponent({ props: { value } });

		expect(container.querySelector('code')?.textContent).toHaveLength(MAX_TOOL_DATA_DISPLAY_LENGTH);
		expect(container.querySelector('.hljs-attr')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('ai-tool-data-download'));

		const [blob, fileName] = vi.mocked(saveAs).mock.calls[0];
		expect(fileName).toBe('tool-data.json');
		expect(await readBlob(blob as Blob)).toBe(JSON.stringify(value, null, 2));
	});

	it('shows the text, images and files of a content result', async () => {
		const { getByTestId, queryByTestId, container } = renderComponent({
			props: {
				value: {
					type: 'content',
					value: [
						{
							type: 'text',
							text: '<untrusted_data source="mcp:Test">\nHere you go:\n</untrusted_data>',
						},
						{ type: 'file', data: { type: 'data', data: 'iVBOR' }, mediaType: 'image/png' },
						{ type: 'file', data: { type: 'data', data: 'aGVsbG8=' }, mediaType: 'text/csv' },
					],
				},
			},
		});

		expect(container.querySelector('code')?.textContent).toBe('Here you go:');
		expect(getByTestId('ai-tool-data-image')).toHaveAttribute('src', 'data:image/png;base64,iVBOR');
		expect(queryByTestId('ai-tool-data-download')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('ai-tool-data-file').querySelector('button')!);

		const [file, fileName] = vi.mocked(saveAs).mock.calls.at(-1)!;
		expect(fileName).toBe('tool-file.csv');
		expect((file as Blob).type).toBe('application/octet-stream');
		expect(await readBlob(file as Blob)).toBe('hello');
	});

	it('shows an image that does not decode as a file to download', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				value: { content: [{ type: 'image', data: 'aGVsbG8=', mimeType: 'image/png' }] },
			},
		});

		await fireEvent.error(getByTestId('ai-tool-data-image'));

		expect(queryByTestId('ai-tool-data-image')).not.toBeInTheDocument();
		await userEvent.click(getByTestId('ai-tool-data-file').querySelector('button')!);

		const [file, fileName] = vi.mocked(saveAs).mock.calls.at(-1)!;
		expect(fileName).toBe('tool-file.png');
		expect(await readBlob(file as Blob)).toBe('hello');
	});

	it('shows a content result with an unknown part as JSON', () => {
		const value = { type: 'content', value: [{ type: 'audio', data: 'AAAA' }] };
		const { container, queryByTestId } = renderComponent({ props: { value } });

		expect(queryByTestId('ai-tool-data-content')).not.toBeInTheDocument();
		expect(container.querySelector('code')?.textContent).toBe(JSON.stringify(value, null, 2));
	});
});
