import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ChatInputBase from './ChatInputBase.vue';

const mockStart = vi.fn();
const mockStop = vi.fn();
const mockIsListening = ref(false);
const mockIsSupported = ref(true);
const mockResult = ref('');
const mockIsFinal = ref(false);

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
});
