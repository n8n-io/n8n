import { useResizeObserver } from '@vueuse/core';
import {
	computed,
	nextTick,
	onBeforeUnmount,
	ref,
	type MaybeRefOrGetter,
	toValue,
	watch,
} from 'vue';

export interface AutosizeTextareaRows {
	minRows?: number;
	maxRows?: number;
}

export interface AutosizeTextareaStyles {
	height?: string;
	minHeight?: string;
	overflowY?: 'hidden' | 'auto';
}

const CONTEXT_STYLE_PROPS = [
	'letter-spacing',
	'line-height',
	'padding-top',
	'padding-bottom',
	'font-family',
	'font-weight',
	'font-size',
	'text-rendering',
	'text-transform',
	'width',
	'text-indent',
	'padding-left',
	'padding-right',
	'border-width',
	'box-sizing',
];

function createHiddenTextarea() {
	const textarea = document.createElement('textarea');
	textarea.setAttribute('tabindex', '-1');
	textarea.setAttribute('aria-hidden', 'true');
	textarea.style.position = 'absolute';
	textarea.style.visibility = 'hidden';
	textarea.style.zIndex = '-1000';
	textarea.style.top = '0';
	textarea.style.right = '0';
	textarea.style.height = '0';
	textarea.style.overflow = 'hidden';
	document.body.appendChild(textarea);

	return textarea;
}

export function calcTextareaHeight(
	targetElement: HTMLTextAreaElement,
	{ minRows, maxRows }: AutosizeTextareaRows = {},
): AutosizeTextareaStyles {
	const hiddenTextarea = createHiddenTextarea();
	const style = window.getComputedStyle(targetElement);
	const boxSizing = style.getPropertyValue('box-sizing');
	const paddingSize =
		Number.parseFloat(style.getPropertyValue('padding-bottom')) +
		Number.parseFloat(style.getPropertyValue('padding-top'));
	const borderSize =
		Number.parseFloat(style.getPropertyValue('border-bottom-width')) +
		Number.parseFloat(style.getPropertyValue('border-top-width'));
	const contextStyle = CONTEXT_STYLE_PROPS.map(
		(name) => `${name}:${style.getPropertyValue(name)}`,
	).join(';');

	hiddenTextarea.setAttribute(
		'style',
		`${hiddenTextarea.getAttribute('style') ?? ''};${contextStyle}`,
	);
	hiddenTextarea.value = targetElement.value || targetElement.placeholder || '';

	const contentScrollHeight = hiddenTextarea.scrollHeight;
	let height = contentScrollHeight;
	const result: AutosizeTextareaStyles = { height: '' };

	if (boxSizing === 'border-box') {
		height += borderSize;
	} else if (boxSizing === 'content-box') {
		height -= paddingSize;
	}

	hiddenTextarea.value = '';
	const singleRowHeight = hiddenTextarea.scrollHeight - paddingSize;

	if (minRows !== undefined) {
		let minHeight = singleRowHeight * minRows;
		if (boxSizing === 'border-box') {
			minHeight += paddingSize + borderSize;
		}
		height = Math.max(minHeight, height);
		result.minHeight = `${minHeight}px`;
	}

	if (maxRows !== undefined) {
		let maxHeight = singleRowHeight * maxRows;
		if (boxSizing === 'border-box') {
			maxHeight += paddingSize + borderSize;
		}
		height = Math.min(maxHeight, height);
		result.overflowY = contentScrollHeight > maxHeight ? 'auto' : 'hidden';
	}

	hiddenTextarea.remove();
	result.height = `${height}px`;
	return result;
}

export function useAutosizeTextarea({
	textarea,
	enabled,
	rows,
}: {
	textarea: MaybeRefOrGetter<HTMLTextAreaElement | null | undefined>;
	enabled: MaybeRefOrGetter<boolean>;
	rows?: MaybeRefOrGetter<AutosizeTextareaRows | undefined>;
}) {
	const textareaStyles = ref<AutosizeTextareaStyles>({});

	async function scrollCaretIntoView() {
		await nextTick();
		const textareaElement = toValue(textarea);
		if (!textareaElement || document.activeElement !== textareaElement) return;

		textareaElement.scrollTop =
			textareaElement.selectionStart === 0 ? 0 : textareaElement.scrollHeight;
	}

	const calculateTextareaHeight = () => {
		const textareaElement = toValue(textarea);
		if (!toValue(enabled) || !textareaElement) return;

		textareaStyles.value = calcTextareaHeight(textareaElement, toValue(rows));
		void scrollCaretIntoView();
	};

	function clearTextareaHeight() {
		textareaStyles.value = {};
		const textareaElement = toValue(textarea);
		if (!textareaElement) return;

		textareaElement.style.height = '';
		textareaElement.style.overflowY = '';
	}

	useResizeObserver(
		computed(() => (toValue(enabled) ? toValue(textarea) : null)),
		() => {
			calculateTextareaHeight();
		},
	);

	watch(
		() => [toValue(enabled), toValue(rows)?.minRows, toValue(rows)?.maxRows],
		([isEnabled]) => {
			if (!isEnabled) {
				clearTextareaHeight();
				return;
			}

			void nextTick(calculateTextareaHeight);
		},
	);

	onBeforeUnmount(clearTextareaHeight);

	return {
		textareaStyles,
		calculateTextareaHeight,
		clearTextareaHeight,
	};
}
