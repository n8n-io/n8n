import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ChatInputBase from './ChatInputBase.vue';
import {
	base64EncodedSize,
	MAX_ATTACHMENT_BASE64_BYTES,
	MAX_TOTAL_ATTACHMENT_BASE64_BYTES,
	MAX_TOTAL_ATTACHMENT_DECODED_BYTES,
} from '@n8n/api-types';

const mockStart = vi.fn();
const mockStop = vi.fn();
const mockIsListening = ref(false);
const mockIsSupported = ref(true);
const mockResult = ref('');
const mockIsFinal = ref(false);

const mockShowError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: vi.fn() }),
}));

vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		useSpeechRecognition: () => ({
			isSupported: mockIsSupported,
			isListening: mockIsListening,
			result: mockResult,
			isFinal: mockIsFinal,
			start: mockStart,
			stop: mockStop,
		}),
	};
});

const renderComponent = createComponentRenderer(ChatInputBase);

function makeProps(overrides: Partial<InstanceType<typeof ChatInputBase>['$props']> = {}) {
	return {
		modelValue: '',
		isStreaming: false,
		canSubmit: true,
		...overrides,
	};
}

describe('ChatInputBase', () => {
	beforeEach(() => {
		createTestingPinia();
		mockIsListening.value = false;
		mockIsSupported.value = true;
		mockResult.value = '';
		mockShowError.mockClear();
		mockIsFinal.value = false;
		vi.clearAllMocks();
	});

	it('should show send button when not streaming', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: makeProps({ isStreaming: false }),
		});

		expect(getByTestId('instance-ai-send-button')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-stop-button')).not.toBeInTheDocument();
	});

	it('should show stop button when streaming', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: makeProps({ isStreaming: true }),
		});

		expect(getByTestId('instance-ai-stop-button')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-send-button')).not.toBeInTheDocument();
	});

	it('should emit submit on Enter keydown', () => {
		const { getByRole, emitted } = renderComponent({
			props: makeProps(),
		});

		const textarea = getByRole('textbox');
		textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(emitted().submit).toBeTruthy();
	});

	it('should NOT emit submit on Shift+Enter', () => {
		const { getByRole, emitted } = renderComponent({
			props: makeProps(),
		});

		const textarea = getByRole('textbox');
		textarea.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }),
		);

		expect(emitted().submit).toBeFalsy();
	});

	it('should NOT emit submit on Enter during IME composition', () => {
		const { getByRole, emitted } = renderComponent({
			props: makeProps(),
		});

		const textarea = getByRole('textbox');
		textarea.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Enter',
				isComposing: true,
				bubbles: true,
			}),
		);

		expect(emitted().submit).toBeFalsy();
	});

	it('should emit tab on Tab keydown', () => {
		const { getByRole, emitted } = renderComponent({
			props: makeProps(),
		});

		const textarea = getByRole('textbox');
		textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

		expect(emitted().tab).toBeTruthy();
	});

	it('should disable send button when canSubmit is false', () => {
		const { getByTestId } = renderComponent({
			props: makeProps({ canSubmit: false }),
		});

		const sendButton = getByTestId('instance-ai-send-button');
		expect(sendButton.closest('button')?.disabled).toBe(true);
	});

	it('should show attach button only when showAttach is true', () => {
		const { getByTestId } = renderComponent({
			props: makeProps({ showAttach: true }),
		});

		expect(getByTestId('chat-input-attach-button')).toBeInTheDocument();
	});

	it('should NOT show attach button when showAttach is false', () => {
		const { queryByTestId } = renderComponent({
			props: makeProps({ showAttach: false }),
		});

		expect(queryByTestId('chat-input-attach-button')).not.toBeInTheDocument();
	});

	it('should show voice button when showVoice is true and speech is supported', () => {
		mockIsSupported.value = true;
		const { getByTestId } = renderComponent({
			props: makeProps({ showVoice: true }),
		});

		expect(getByTestId('chat-input-voice-button')).toBeInTheDocument();
	});

	it('should emit stop when stop button is clicked', () => {
		const { getByTestId, emitted } = renderComponent({
			props: makeProps({ isStreaming: true }),
		});

		getByTestId('instance-ai-stop-button').click();
		expect(emitted().stop).toBeTruthy();
	});

	it('forwards maxLength to the textarea', () => {
		const { getByRole } = renderComponent({
			props: makeProps({ maxLength: 12345 }),
		});

		expect(getByRole('textbox')).toHaveAttribute('maxlength', '12345');
	});

	it('defaults to 5000 character limit when maxLength is not provided', () => {
		const { getByRole } = renderComponent({
			props: makeProps(),
		});

		expect(getByRole('textbox')).toHaveAttribute('maxlength', '5000');
	});

	it('should NOT add leading space when voice input starts from empty message', async () => {
		// BUG: committedSpokenMessage.value + ' ' + spoken.trimStart()
		// When committedSpokenMessage is '', the result starts with ' '
		const emittedValues: string[] = [];
		const { rerender } = renderComponent({
			props: makeProps({ showVoice: true, modelValue: '' }),
			attrs: {
				'onUpdate:modelValue': (val: string) => emittedValues.push(val),
			},
		});

		// Simulate speech recognition producing a result
		mockResult.value = 'hello world';

		// Wait for the watcher to fire
		await rerender({ ...makeProps({ showVoice: true, modelValue: '' }) });

		// The emitted modelValue should NOT start with a space
		expect(emittedValues.length).toBeGreaterThan(0);
		const lastValue = emittedValues[emittedValues.length - 1];
		expect(lastValue).not.toMatch(/^\s/);
	});

	describe('oversized attachments', () => {
		/** `size` is what the guard reads; content is irrelevant to the check. */
		function fileOfSize(name: string, decodedBytes: number): File {
			const file = new File(['x'], name, { type: 'image/png' });
			Object.defineProperty(file, 'size', { value: decodedBytes });
			return file;
		}

		function pasteInto(textarea: HTMLElement, files: File[]) {
			const event = new Event('paste', { bubbles: true, cancelable: true });
			Object.defineProperty(event, 'clipboardData', { value: { files } });
			textarea.dispatchEvent(event);
		}

		// A file is measured by its base64-encoded size, so the largest that fits is 3/4 of the limit.
		const largestAllowedRawBytes = (MAX_ATTACHMENT_BASE64_BYTES / 4) * 3;
		const oversizedRawBytes = largestAllowedRawBytes + 1;

		it('does not attach a pasted file that is over the limit', () => {
			const { getByRole, emitted } = renderComponent({ props: makeProps({ showAttach: true }) });

			pasteInto(getByRole('textbox'), [fileOfSize('huge.png', oversizedRawBytes)]);

			expect(emitted()['files-selected']).toBeFalsy();
		});

		it('warns the user when a pasted file is rejected for size', () => {
			const { getByRole } = renderComponent({ props: makeProps({ showAttach: true }) });

			pasteInto(getByRole('textbox'), [fileOfSize('huge.png', oversizedRawBytes)]);

			expect(mockShowError).toHaveBeenCalled();
		});

		it('still attaches a pasted file that fits', () => {
			const { getByRole, emitted } = renderComponent({ props: makeProps({ showAttach: true }) });

			pasteInto(getByRole('textbox'), [fileOfSize('fine.png', 1024)]);

			expect(emitted()['files-selected']).toBeTruthy();
			expect(mockShowError).not.toHaveBeenCalled();
		});

		it('rejects a batch that would breach the combined per-message budget', () => {
			// Each file is individually fine; together they are not. Without this the
			// upload only fails after megabytes have crossed the wire.
			const half = MAX_TOTAL_ATTACHMENT_DECODED_BYTES / 2;
			const { getByRole, emitted } = renderComponent({ props: makeProps({ showAttach: true }) });

			pasteInto(getByRole('textbox'), [
				fileOfSize('a.png', half),
				fileOfSize('b.png', half),
				fileOfSize('c.png', half),
			]);

			const events = emitted()['files-selected'] as Array<[File[]]>;
			expect(events[0][0].map((f) => f.name)).toEqual(['a.png', 'b.png']);
			expect(mockShowError).toHaveBeenCalled();
		});

		// base64 pads each file up to a multiple of 4, so encoding the *sum* of raw sizes
		// yields less than the sum of each file's encoded size. Three 4 MiB files encode
		// to exactly the limit in aggregate but 8 bytes over it individually — and the
		// backend measures per file, so a batch accepted here would be rejected there.
		it('measures each file encoded, not the raw total', () => {
			const perFile = 4 * 1024 * 1024;
			expect(base64EncodedSize(perFile * 3)).toBeLessThanOrEqual(MAX_TOTAL_ATTACHMENT_BASE64_BYTES);
			expect(base64EncodedSize(perFile) * 3).toBeGreaterThan(MAX_TOTAL_ATTACHMENT_BASE64_BYTES);

			const { getByRole, emitted } = renderComponent({ props: makeProps({ showAttach: true }) });

			pasteInto(getByRole('textbox'), [
				fileOfSize('a.png', perFile),
				fileOfSize('b.png', perFile),
				fileOfSize('c.png', perFile),
			]);

			const events = emitted()['files-selected'] as Array<[File[]]>;
			expect(events[0][0].map((f) => f.name)).toEqual(['a.png', 'b.png']);
			expect(mockShowError).toHaveBeenCalled();
		});

		it('counts files already in the composer toward the budget', () => {
			const half = MAX_TOTAL_ATTACHMENT_DECODED_BYTES / 2;
			const { getByRole, emitted } = renderComponent({
				props: makeProps({ showAttach: true, attachedEncodedBytes: base64EncodedSize(half * 2) }),
			});

			pasteInto(getByRole('textbox'), [fileOfSize('one-too-many.png', half)]);

			expect(emitted()['files-selected']).toBeFalsy();
			expect(mockShowError).toHaveBeenCalled();
		});

		it('attaches a batch that fits within the combined budget', () => {
			const third = MAX_TOTAL_ATTACHMENT_DECODED_BYTES / 3;
			const { getByRole, emitted } = renderComponent({ props: makeProps({ showAttach: true }) });

			pasteInto(getByRole('textbox'), [fileOfSize('a.png', third), fileOfSize('b.png', third)]);

			const events = emitted()['files-selected'] as Array<[File[]]>;
			expect(events[0][0].map((f) => f.name)).toEqual(['a.png', 'b.png']);
			expect(mockShowError).not.toHaveBeenCalled();
		});

		it('attaches the files that fit and drops only the oversized one', () => {
			const { getByRole, emitted } = renderComponent({ props: makeProps({ showAttach: true }) });

			pasteInto(getByRole('textbox'), [
				fileOfSize('fine.png', 1024),
				fileOfSize('huge.png', oversizedRawBytes),
			]);

			const events = emitted()['files-selected'] as Array<[File[]]>;
			expect(events).toBeTruthy();
			expect(events[0][0].map((f) => f.name)).toEqual(['fine.png']);
			expect(mockShowError).toHaveBeenCalled();
		});
	});
});
