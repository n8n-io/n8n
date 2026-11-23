import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
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
});
