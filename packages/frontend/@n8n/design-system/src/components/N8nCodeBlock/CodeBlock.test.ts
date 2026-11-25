import { fireEvent, render, waitFor } from '@testing-library/vue';
import type * as ElementPlus from 'element-plus';
import { ElNotification } from 'element-plus';
import { nextTick } from 'vue';

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

	it('normalizes the language', () => {
		const { container } = render(CodeBlock, {
			props: { code: 'const active = true;', language: ' TypeScript ' },
		});
		expect(container.querySelector('.hljs-keyword')).toHaveTextContent('const');
	});

	it('escapes unknown languages', () => {
		const code = '<img src=x onerror=alert(1)> & text &lt;tag&gt; &#60; &#x3c; &amp;';
		const { container } = render(CodeBlock, { props: { code, language: 'unknown-language' } });
		expect(container.querySelector('code')?.textContent).toBe(code);
		expect(container.querySelector('code img')).toBeNull();
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
		expect(getByRole('button', { name: 'Copied to clipboard' })).toBeInTheDocument();
		expect(ElNotification).not.toHaveBeenCalled();
	});

	it('reports copy failure without emitting a copy event', async () => {
		writeText.mockRejectedValueOnce(new Error('Clipboard unavailable'));
		const { emitted, getByRole } = render(CodeBlock, { props: { code: 'example' } });

		await fireEvent.click(getByRole('button', { name: 'Copy code' }));

		expect(ElNotification).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'error', position: 'bottom-right' }),
		);
		expect(emitted('copy')).toBeUndefined();
		expect(getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
	});

	it('clears success feedback when a later copy fails', async () => {
		const { emitted, getByRole } = render(CodeBlock, { props: { code: 'example' } });
		await fireEvent.click(getByRole('button', { name: 'Copy code' }));
		writeText.mockRejectedValueOnce(new Error('Clipboard unavailable'));

		await fireEvent.click(getByRole('button', { name: 'Copied to clipboard' }));

		expect(getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
		expect(emitted('copy')).toEqual([['example']]);
		expect(ElNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
	});

	it('resets copy feedback after two seconds', async () => {
		vi.useFakeTimers();
		try {
			const { getByRole, unmount } = render(CodeBlock, { props: { code: 'example' } });

			await fireEvent.click(getByRole('button', { name: 'Copy code' }));
			expect(getByRole('button', { name: 'Copied to clipboard' })).toBeInTheDocument();

			await vi.advanceTimersByTimeAsync(2000);
			expect(getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
			unmount();
		} finally {
			vi.useRealTimers();
		}
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

	it('keeps the preview fade when the code fits', async () => {
		const { container } = render(CodeBlock, {
			props: { code: 'const active = true;' },
		});
		const pre = container.querySelector('pre');
		if (!pre) throw new Error('Code block scroller was not rendered');

		Object.defineProperty(pre, 'scrollHeight', { configurable: true, value: 80 });
		Object.defineProperty(pre, 'clientHeight', { configurable: true, value: 280 });
		Object.defineProperty(pre, 'scrollTop', { configurable: true, writable: true, value: 0 });
		pre.dispatchEvent(new Event('scroll'));
		await nextTick();

		expect(pre).toHaveClass('previewFade');
		expect(pre).not.toHaveAttribute('data-scroll-mask-top');
		expect(pre).not.toHaveAttribute('data-scroll-mask-bottom');
	});

	it('sets the bottom fade while content remains and clears it at the end', async () => {
		const { container } = render(CodeBlock, {
			props: { code: 'const active = true;\n'.repeat(40) },
		});
		const pre = container.querySelector('pre');
		if (!pre) throw new Error('Code block scroller was not rendered');

		function setMetric(name: 'scrollHeight' | 'clientHeight' | 'scrollTop', value: number) {
			Object.defineProperty(pre, name, { configurable: true, writable: true, value });
		}

		setMetric('scrollHeight', 400);
		setMetric('clientHeight', 280);
		setMetric('scrollTop', 0);
		pre.dispatchEvent(new Event('scroll'));
		await nextTick();

		expect(pre).not.toHaveClass('previewFade');
		expect(pre).toHaveAttribute('data-scroll-mask-bottom', '');
		expect(pre).not.toHaveAttribute('data-scroll-mask-top');

		setMetric('scrollTop', 120);
		pre.dispatchEvent(new Event('scroll'));
		await nextTick();

		expect(pre).not.toHaveClass('previewFade');
		expect(pre).not.toHaveAttribute('data-scroll-mask-bottom');
		expect(pre).toHaveAttribute('data-scroll-mask-top', '');
	});
});
