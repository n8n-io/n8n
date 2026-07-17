import { injectComboboxRootContext, injectListboxRootContext } from 'reka-ui';
import { watch } from 'vue';

function getEnabledOptions(from: HTMLElement): HTMLElement[] {
	const listbox = from.closest('[role="listbox"]');
	if (!(listbox instanceof HTMLElement)) {
		return [];
	}

	return [...listbox.querySelectorAll('[role="option"]')].filter(
		(el): el is HTMLElement => el instanceof HTMLElement && el.dataset.disabled !== '',
	);
}

export function useComboboxArrowKeyLoop() {
	const combobox = injectComboboxRootContext();
	const listbox = injectListboxRootContext();

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
			return;
		}

		if (!combobox.open.value) {
			return;
		}

		const highlighted = listbox.highlightedElement.value;
		if (!(highlighted instanceof HTMLElement) || !highlighted.isConnected) {
			return;
		}

		const options = getEnabledOptions(highlighted);
		if (options.length < 2) {
			return;
		}

		const index = options.indexOf(highlighted);
		if (index === -1) {
			return;
		}

		const wrapToFirst = event.key === 'ArrowDown' && index === options.length - 1;
		const wrapToLast = event.key === 'ArrowUp' && index === 0;
		if (!wrapToFirst && !wrapToLast) {
			return;
		}

		event.preventDefault();
		event.stopImmediatePropagation();
		listbox.changeHighlight(wrapToFirst ? options[0] : options[options.length - 1]);
	}

	watch(
		() => combobox.inputElement.value,
		(input, _previous, onCleanup) => {
			if (!input) {
				return;
			}

			input.addEventListener('keydown', onKeydown, true);
			onCleanup(() => {
				input.removeEventListener('keydown', onKeydown, true);
			});
		},
		{ immediate: true },
	);
}
