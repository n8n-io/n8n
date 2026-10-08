import { fireEvent, render, waitFor } from '@testing-library/vue';
import type * as ElementPlus from 'element-plus';
import { ElNotification } from 'element-plus';

import CodeBlock from './CodeBlock.vue';

vi.mock('element-plus', async (importOriginal) => {
	const elementPlus = await importOriginal<typeof ElementPlus>();
	return { ...elementPlus, ElNotification: vi.fn() };
});

const writeText = vi.fn<Clipboard['writeText']>();

function setClipboard(clipboard?: Pick<Clipboard, 'writeText'>) {
	Object.defineProperty(navigator, 'clipboard', {
		configurable: true,
		value: clipboard,
	});
}

describe('N8nCodeBlock', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setClipboard({ writeText });
	});

	it('renders highlighted code', () => {
		const { container } = render(CodeBlock, {
			props: { code: 'const active = true;', language: 'typescript' },
		});

		expect(container.querySelector('code')).toHaveTextContent('const active = true;');
		expect(container.querySelector('.hljs-keyword')).toHaveTextContent('const');
	});

	it('copies code and emits the copy event', async () => {
		const code = 'const active = true;';
		const { emitted, getByRole } = render(CodeBlock, { props: { code } });

		await fireEvent.click(getByRole('button', { name: 'Copy code' }));

		expect(writeText).toHaveBeenCalledWith(code);
		expect(emitted('copy')).toEqual([[code]]);
		expect(ElNotification).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Copied to clipboard', type: 'success' }),
		);
	});

	it.each([
		{ copyable: false, clipboard: { writeText } },
		{ copyable: true, clipboard: undefined },
	])('hides the copy action when unavailable', ({ copyable, clipboard }) => {
		setClipboard(clipboard);
		const { queryByRole } = render(CodeBlock, {
			props: { code: 'const active = true;', copyable },
		});

		expect(queryByRole('button', { name: 'Copy code' })).not.toBeInTheDocument();
	});

	it('toggles collapsed state and emits the model update', async () => {
		vi.spyOn(HTMLPreElement.prototype, 'scrollHeight', 'get').mockReturnValue(400);
		vi.spyOn(HTMLPreElement.prototype, 'getBoundingClientRect').mockReturnValue({
			width: 100,
			height: 280,
			top: 0,
			right: 100,
			bottom: 280,
			left: 0,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		});
		const { emitted, getByRole } = render(CodeBlock, {
			props: { code: 'const active = true;' },
		});

		const expandButton = await waitFor(() => getByRole('button', { name: 'Expand code' }));
		await fireEvent.click(expandButton);

		expect(emitted('update:collapsed')).toEqual([[false]]);
		await waitFor(() => expect(getByRole('button', { name: 'Collapse code' })).toBeInTheDocument());
	});
});
