import { render, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent, h, ref } from 'vue';
import { useClipboard } from '@/composables/useClipboard';

const testValue = 'This is a test';

const TestComponent = defineComponent({
	setup() {
		const pasted = ref('');
		const htmlContent = ref<HTMLElement>();
		const clipboard = useClipboard({
			onPaste(data) {
				pasted.value = data;
				if (htmlContent.value) {
					htmlContent.value.innerHTML = data;
				}
			},
		});

		return () =>
			h('div', [
				h('button', {
					'data-test-id': 'copy',
					onClick: () => {
						void clipboard.copy(testValue);
					},
				}),
				h('div', { 'data-test-id': 'paste' }, pasted.value),
				h('div', { 'data-test-id': 'xss-attack', ref: htmlContent }),
			]);
	},
});

describe('useClipboard()', () => {
	beforeAll(() => {
		userEvent.setup();
	});

	beforeEach(() => {
		// Mock document.execCommand implementation to set clipboard items
		document.execCommand = vi.fn().mockImplementation((command) => {
			if (command === 'copy') {
				Object.defineProperty(window.navigator, 'clipboard', {
					value: { items: [testValue] },
					configurable: true,
				});
			}
			return true;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('copy()', () => {
		it('should copy text value', async () => {
			const { getByTestId } = render(TestComponent);

			const copyButton = getByTestId('copy');
			await userEvent.click(copyButton);
			expect((window.navigator.clipboard as unknown as { items: string[] }).items).toHaveLength(1);
		});
	});

	describe('onClipboardPasteEvent()', () => {
		it('should trigger on clipboard paste event', async () => {
			const { getByTestId } = render(TestComponent);

			const pasteElement = getByTestId('paste');
			await userEvent.paste(testValue);
			expect(pasteElement.textContent).toEqual(testValue);
		});
	});

	it('sanitizes HTML', async () => {
		const unsafeHtml = 'https://www.ex.com/sfefdfd<img/src/onerror=alert(1)>fdf/xdfef.json';
		const { getByTestId } = render(TestComponent);

		await userEvent.paste(unsafeHtml);
		expect(within(getByTestId('xss-attack')).queryByRole('img')).not.toBeInTheDocument();
	});
});
