import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';

import { calcTextareaHeight, useAutosizeTextarea } from './useAutosizeTextarea';

const getPropertyValue = vi.fn((property: string) => {
	const styles: Record<string, string> = {
		'box-sizing': 'border-box',
		'padding-top': '4px',
		'padding-bottom': '4px',
		'border-top-width': '1px',
		'border-bottom-width': '1px',
		'line-height': '20px',
		'font-size': '16px',
		'font-family': 'Arial',
		'font-weight': '400',
		'letter-spacing': '0px',
		'text-rendering': 'auto',
		'text-transform': 'none',
		width: '200px',
		'text-indent': '0px',
		'padding-left': '0px',
		'padding-right': '0px',
		'border-width': '1px',
	};

	return styles[property] ?? '';
});

function createTextarea(value = '') {
	const textarea = document.createElement('textarea');
	textarea.value = value;
	document.body.appendChild(textarea);
	return textarea;
}

function lineCount(value: string) {
	return Math.max(value.split('\n').length, 1);
}

describe('useAutosizeTextarea', () => {
	beforeEach(() => {
		vi.spyOn(window, 'getComputedStyle').mockReturnValue({
			getPropertyValue,
		} as unknown as CSSStyleDeclaration);
		vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(function (
			this: HTMLTextAreaElement,
		) {
			return lineCount(this.value) * 20 + 8;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = '';
	});

	describe('calcTextareaHeight', () => {
		it('calculates textarea height from content', () => {
			const textarea = createTextarea('first\nsecond');

			expect(calcTextareaHeight(textarea)).toEqual({ height: '50px' });
		});

		it('uses placeholder text for initial height when value is empty', () => {
			const textarea = createTextarea();
			textarea.placeholder = 'first\nsecond\nthird';

			expect(calcTextareaHeight(textarea)).toEqual({ height: '70px' });
		});

		it('respects minRows', () => {
			const textarea = createTextarea('one line');

			expect(calcTextareaHeight(textarea, { minRows: 3 })).toEqual({
				height: '70px',
				minHeight: '70px',
			});
		});

		it('respects maxRows and enables scrolling when content exceeds the maximum', () => {
			const textarea = createTextarea('one\ntwo\nthree\nfour');

			expect(calcTextareaHeight(textarea, { maxRows: 2 })).toEqual({
				height: '50px',
				overflowY: 'auto',
			});
		});

		it('hides overflow when content fits within maxRows', () => {
			const textarea = createTextarea('one\ntwo');

			expect(calcTextareaHeight(textarea, { maxRows: 3 })).toEqual({
				height: '50px',
				overflowY: 'hidden',
			});
		});
	});

	describe('composable behavior', () => {
		const TestComponent = defineComponent({
			props: {
				enabled: { type: Boolean, default: true },
			},
			setup(props) {
				const textarea = ref<HTMLTextAreaElement>();
				const { textareaStyles, calculateTextareaHeight, clearTextareaHeight } =
					useAutosizeTextarea({
						textarea,
						enabled: () => props.enabled,
						rows: { maxRows: 2 },
					});

				return { textarea, textareaStyles, calculateTextareaHeight, clearTextareaHeight };
			},
			template: '<textarea ref="textarea" value="one\ntwo\nthree" />',
		});

		it('recalculates height into reactive styles', () => {
			const wrapper = mount(TestComponent, { attachTo: document.body });

			wrapper.vm.calculateTextareaHeight();

			expect(wrapper.vm.textareaStyles).toEqual({ height: '50px', overflowY: 'auto' });
		});

		it('clears styles from the textarea', () => {
			const wrapper = mount(TestComponent, { attachTo: document.body });
			const textarea = wrapper.vm.textarea as HTMLTextAreaElement;
			textarea.style.height = '50px';
			textarea.style.overflowY = 'auto';

			wrapper.vm.clearTextareaHeight();

			expect(wrapper.vm.textareaStyles).toEqual({});
			expect(textarea.style.height).toBe('');
			expect(textarea.style.overflowY).toBe('');
		});

		it('keeps the focused textarea scrolled to the bottom after recalculation', async () => {
			const wrapper = mount(TestComponent, { attachTo: document.body });
			const textarea = wrapper.vm.textarea as HTMLTextAreaElement;
			textarea.focus();
			textarea.scrollTop = 0;

			wrapper.vm.calculateTextareaHeight();
			await nextTick();

			expect(textarea.scrollTop).toBe(textarea.scrollHeight);
		});

		it('does not calculate styles when disabled', () => {
			const wrapper = mount(TestComponent, {
				attachTo: document.body,
				props: { enabled: false },
			});

			wrapper.vm.calculateTextareaHeight();

			expect(wrapper.vm.textareaStyles).toEqual({});
		});
	});
});
