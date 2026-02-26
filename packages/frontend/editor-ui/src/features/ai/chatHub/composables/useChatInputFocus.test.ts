import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useChatInputFocus } from './useChatInputFocus';
import { useUIStore } from '@/app/stores/ui.store';
import * as canvasUtils from '@/features/workflows/canvas/canvas.utils';

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn(),
}));

vi.mock('@vueuse/core', async () => {
	const actual = await vi.importActual('@vueuse/core');
	return {
		...actual,
		useActiveElement: vi.fn(),
		useEventListener: vi.fn((target, event, handler) => {
			target.addEventListener(event, handler);
			return () => target.removeEventListener(event, handler);
		}),
	};
});

import { useActiveElement } from '@vueuse/core';

describe('useChatInputFocus', () => {
	let mockUIStore: { isAnyModalOpen: boolean };
	let activeElementRef: ReturnType<typeof ref<HTMLElement | null>>;
	let mockInputRef: ReturnType<
		typeof ref<{ focus: () => void; appendText: (text: string) => void } | null>
	>;
	let focusSpy: ReturnType<typeof vi.fn>;
	let appendTextSpy: ReturnType<typeof vi.fn>;

	function createKeyboardEvent(key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
		return new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			cancelable: true,
			...options,
		});
	}

	function dispatchKeydown(key: string, options: Partial<KeyboardEvent> = {}) {
		const event = createKeyboardEvent(key, options);
		document.dispatchEvent(event);
		return event;
	}

	beforeEach(() => {
		setActivePinia(createTestingPinia());

		mockUIStore = { isAnyModalOpen: false };
		vi.mocked(useUIStore).mockReturnValue(mockUIStore as ReturnType<typeof useUIStore>);

		activeElementRef = ref<HTMLElement | null>(document.body);
		vi.mocked(useActiveElement).mockReturnValue(activeElementRef);

		focusSpy = vi.fn();
		appendTextSpy = vi.fn();
		mockInputRef = ref({
			focus: focusSpy,
			appendText: appendTextSpy,
		});

		vi.spyOn(canvasUtils, 'shouldIgnoreCanvasShortcut').mockReturnValue(false);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('basic functionality', () => {
		it('should focus input and append text when printable key is pressed', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('a');

			expect(appendTextSpy).toHaveBeenCalledWith('a');
			expect(focusSpy).toHaveBeenCalled();
		});

		it('should handle uppercase letters', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('A', { shiftKey: true });

			expect(appendTextSpy).toHaveBeenCalledWith('A');
			expect(focusSpy).toHaveBeenCalled();
		});

		it('should handle numbers', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('5');

			expect(appendTextSpy).toHaveBeenCalledWith('5');
			expect(focusSpy).toHaveBeenCalled();
		});

		it('should handle special characters', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('@');

			expect(appendTextSpy).toHaveBeenCalledWith('@');
			expect(focusSpy).toHaveBeenCalled();
		});

		it('should prevent default behavior', () => {
			useChatInputFocus(mockInputRef);

			const event = createKeyboardEvent('a');
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
			document.dispatchEvent(event);

			expect(preventDefaultSpy).toHaveBeenCalled();
		});

		it('should not do anything if inputRef is null', () => {
			const nullInputRef = ref(null);
			useChatInputFocus(nullInputRef);

			dispatchKeydown('a');

			expect(focusSpy).not.toHaveBeenCalled();
			expect(appendTextSpy).not.toHaveBeenCalled();
		});
	});

	describe('modifier keys', () => {
		it('should not trigger when Ctrl key is pressed', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('a', { ctrlKey: true });

			expect(focusSpy).not.toHaveBeenCalled();
			expect(appendTextSpy).not.toHaveBeenCalled();
		});

		it('should not trigger when Meta/Cmd key is pressed', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('a', { metaKey: true });

			expect(focusSpy).not.toHaveBeenCalled();
			expect(appendTextSpy).not.toHaveBeenCalled();
		});

		it('should not trigger when Alt key is pressed', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('a', { altKey: true });

			expect(focusSpy).not.toHaveBeenCalled();
			expect(appendTextSpy).not.toHaveBeenCalled();
		});

		it('should not trigger Ctrl+C (copy shortcut)', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('c', { ctrlKey: true });

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger Cmd+V (paste shortcut)', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('v', { metaKey: true });

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger Ctrl+Z (undo shortcut)', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('z', { ctrlKey: true });

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should trigger with Shift key (for uppercase)', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('A', { shiftKey: true });

			expect(appendTextSpy).toHaveBeenCalledWith('A');
			expect(focusSpy).toHaveBeenCalled();
		});

		it('should append multiple characters on consecutive keypresses', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('h');
			dispatchKeydown('i');

			expect(appendTextSpy).toHaveBeenCalledTimes(2);
			expect(appendTextSpy).toHaveBeenNthCalledWith(1, 'h');
			expect(appendTextSpy).toHaveBeenNthCalledWith(2, 'i');
		});
	});

	describe('non-printable keys', () => {
		it('should not trigger on Enter key', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('Enter');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger on Escape key', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('Escape');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger on ArrowUp key', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('ArrowUp');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger on ArrowDown key', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('ArrowDown');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger on Tab key', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('Tab');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger on Backspace key', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('Backspace');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger on Delete key', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('Delete');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger on F1 function key', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('F1');

			expect(focusSpy).not.toHaveBeenCalled();
		});
	});

	describe('form field focus detection', () => {
		it('should not trigger when focused on input element', () => {
			vi.mocked(canvasUtils.shouldIgnoreCanvasShortcut).mockReturnValue(true);

			useChatInputFocus(mockInputRef);

			dispatchKeydown('a');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger when focused on textarea element', () => {
			vi.mocked(canvasUtils.shouldIgnoreCanvasShortcut).mockReturnValue(true);

			useChatInputFocus(mockInputRef);

			dispatchKeydown('a');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger when focused on contenteditable element', () => {
			vi.mocked(canvasUtils.shouldIgnoreCanvasShortcut).mockReturnValue(true);

			useChatInputFocus(mockInputRef);

			dispatchKeydown('a');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not trigger when focused inside .ignore-key-press-canvas', () => {
			vi.mocked(canvasUtils.shouldIgnoreCanvasShortcut).mockReturnValue(true);

			useChatInputFocus(mockInputRef);

			dispatchKeydown('a');

			expect(focusSpy).not.toHaveBeenCalled();
		});
	});

	describe('modal detection', () => {
		it('should not trigger when a modal is open', () => {
			mockUIStore.isAnyModalOpen = true;

			useChatInputFocus(mockInputRef);

			dispatchKeydown('a');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should trigger when modal is closed', () => {
			mockUIStore.isAnyModalOpen = false;

			useChatInputFocus(mockInputRef);

			dispatchKeydown('a');

			expect(focusSpy).toHaveBeenCalled();
		});
	});

	describe('disabled option', () => {
		it('should not trigger when disabled is true', async () => {
			const disabled = ref(true);
			useChatInputFocus(mockInputRef, { disabled });

			dispatchKeydown('a');

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should trigger when disabled is false', async () => {
			const disabled = ref(false);
			useChatInputFocus(mockInputRef, { disabled });

			dispatchKeydown('a');

			expect(focusSpy).toHaveBeenCalled();
		});

		it('should react to disabled state changes', async () => {
			const disabled = ref(true);
			useChatInputFocus(mockInputRef, { disabled });

			dispatchKeydown('a');
			expect(focusSpy).not.toHaveBeenCalled();

			disabled.value = false;
			await nextTick();

			dispatchKeydown('b');
			expect(appendTextSpy).toHaveBeenCalledWith('b');
			expect(focusSpy).toHaveBeenCalled();
		});

		it('should work with getter function for disabled', () => {
			const disabledState = ref(false);
			useChatInputFocus(mockInputRef, { disabled: () => disabledState.value });

			dispatchKeydown('a');
			expect(focusSpy).toHaveBeenCalled();

			focusSpy.mockClear();
			disabledState.value = true;

			dispatchKeydown('b');
			expect(focusSpy).not.toHaveBeenCalled();
		});
	});

	describe('IME composition', () => {
		it('should not trigger during IME composition', () => {
			useChatInputFocus(mockInputRef);

			const event = new KeyboardEvent('keydown', {
				key: 'a',
				bubbles: true,
				cancelable: true,
			});
			Object.defineProperty(event, 'isComposing', { value: true });
			document.dispatchEvent(event);

			expect(focusSpy).not.toHaveBeenCalled();
		});
	});

	describe('key repeat', () => {
		it('should not trigger on key repeat', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('a', { repeat: true });

			expect(focusSpy).not.toHaveBeenCalled();
		});
	});

	describe('shortcut conflicts', () => {
		it('should not interfere with Ctrl+A (select all)', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('a', { ctrlKey: true });

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not interfere with Cmd+S (save)', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('s', { metaKey: true });

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not interfere with Alt+Tab', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('Tab', { altKey: true });

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not interfere with Ctrl+Shift+T (reopen tab)', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('t', { ctrlKey: true, shiftKey: true });

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it('should not interfere with [ (collapse sidebar shortcut)', () => {
			useChatInputFocus(mockInputRef);

			dispatchKeydown('[');

			expect(focusSpy).not.toHaveBeenCalled();
			expect(appendTextSpy).not.toHaveBeenCalled();
		});
	});
});
