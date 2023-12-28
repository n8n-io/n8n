import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent, h, ref } from 'vue';
import { useCopyPaste } from '@/composables/useCopyPaste';

const testValue = 'This is a test';

const TestComponent = defineComponent({
	setup() {
		const pasted = ref('');
		const copyPaste = useCopyPaste({
			onClipboardPasteEvent(data) {
				pasted.value = data;
			},
		});

		return () =>
			h('div', [
				h('button', {
					'data-test-id': 'copy',
					onClick: () => copyPaste.copyToClipboard(testValue),
				}),
				h('div', { 'data-test-id': 'paste' }, pasted.value),
			]);
	},
});

describe('useCopyPaste()', () => {
	beforeAll(() => {
		userEvent.setup();
		document.execCommand = vi.fn();
	});

	it('should add hidden input to body', async () => {
		const { getByTestId } = render(TestComponent);

		const hiddenInput = getByTestId('hidden-copy-paste');
		expect(hiddenInput).toBeInTheDocument();
	});

	describe('copyToClipboard()', () => {
		it('should copy text value', async () => {
			const { getByTestId } = render(TestComponent);

			const copyButton = getByTestId('copy');
			copyButton.click();
			expect(document.execCommand).toHaveBeenCalledWith('copy');
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
});
