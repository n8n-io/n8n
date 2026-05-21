<script setup lang="ts">
import { computed, inject, ref, type StyleValue, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { IRunDataDisplayMode } from '@/Interface';
import type { NodePanelType } from '@/features/ndv/shared/ndv.types';
import { useDebounce } from '@/app/composables/useDebounce';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useEventListener } from '@vueuse/core';
import { PopOutWindowKey } from '@/app/constants';
import { type SearchShortcut } from '@/features/workflows/canvas/canvas.types';

import { N8nIcon, N8nInput } from '@n8n/design-system';
type Props = {
	modelValue: string;
	paneType?: NodePanelType;
	displayMode?: IRunDataDisplayMode;
	/**
	 * Keyboard shortcut for focusing search input.
	 * Shortcut is disabled if not specified.
	 */
	shortcut?: SearchShortcut;
};

const COLLAPSED_WIDTH = '30px';
const OPEN_WIDTH = '204px';
const OPEN_MIN_WIDTH = '120px';

const emit = defineEmits<{
	'update:modelValue': [value: Props['modelValue']];
	focus: [];
}>();

const props = withDefaults(defineProps<Props>(), {
	paneType: 'output',
	displayMode: 'schema',
	shortcut: undefined,
});

const locale = useI18n();
const { debounce } = useDebounce();
const { isCtrlKeyPressed, controlKeyText } = useDeviceSupport();

const popOutWindow = inject(PopOutWindowKey, undefined);
const keyboardEventTarget = computed(() => popOutWindow?.value?.document ?? window.document);
const focusReturnTo = ref<Element | null>(null);

const inputRef = ref<{ focus: () => void; blur: () => void; select: () => void } | null>(null);
const search = ref(props.modelValue ?? '');
const opened = ref(!!search.value);
const placeholder = computed(() => {
	if (props.shortcut === 'ctrl+f') {
		return locale.baseText('ndv.search.placeholder.shortcutHint', {
			interpolate: { shortcut: `${controlKeyText.value}+F` },
		});
	}

	if (props.paneType === 'output') {
		return locale.baseText('ndv.search.placeholder.output');
	}

	if (props.displayMode === 'schema') {
		return locale.baseText('ndv.search.placeholder.input.schema');
	}

	return locale.baseText('ndv.search.placeholder.input');
});

const style = computed<StyleValue>(() =>
	opened.value ? { maxWidth: OPEN_WIDTH, minWidth: OPEN_MIN_WIDTH } : { maxWidth: COLLAPSED_WIDTH },
);

const documentKeyHandler = (event: KeyboardEvent) => {
	const action = getKeyboardActionToTrigger(event);

	if (!action) {
		return;
	}

	event.preventDefault();
	event.stopImmediatePropagation();

	switch (action) {
		case 'open':
			focusReturnTo.value = document.activeElement;
			inputRef.value?.focus();
			inputRef.value?.select();
			break;
		case 'cancel':
			inputRef.value?.blur();
			opened.value = false;
			emit('update:modelValue', '');

			if (focusReturnTo.value instanceof HTMLElement) {
				focusReturnTo.value.focus();
			}
	}
};

const debouncedEmitUpdate = debounce(async (value: string) => emit('update:modelValue', value), {
	debounceTime: 300,
	trailing: true,
});

const onSearchUpdate = (value: string) => {
	search.value = value;
	void debouncedEmitUpdate(value);
};

const onFocus = () => {
	opened.value = true;
	inputRef.value?.select();
	emit('focus');
};

const onBlur = () => {
	if (!props.modelValue) {
		opened.value = false;
	}
};

function isTargetEditable(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		target.getAttribute('contentEditable') === 'true'
	);
}

function getKeyboardActionToTrigger(event: KeyboardEvent): 'open' | 'cancel' | undefined {
	if (opened.value && event.key === 'Escape') {
		return 'cancel';
	}

	switch (props.shortcut) {
		case '/': {
			return event.key === '/' && !isTargetEditable(event.target) ? 'open' : undefined;
		}
		case 'ctrl+f':
			return event.key === 'f' && isCtrlKeyPressed(event) ? 'open' : undefined;
		case undefined:
			return undefined;
	}
}

useEventListener(keyboardEventTarget, 'keydown', documentKeyHandler, { capture: true });

watch(
	() => props.modelValue,
	(value) => {
		const searchClearedFromOutside = search.value && !value;
		search.value = value;

		if (searchClearedFromOutside) {
			opened.value = false;
		}
	},
);
</script>

<template>
	<div data-test-id="ndv-search-container">
		<N8nInput
			ref="inputRef"
			data-test-id="ndv-search"
			:class="{
				[$style.ioSearch]: true,
				[$style.ioSearchOpened]: opened,
			}"
			:style="style"
			:model-value="search"
			:placeholder="placeholder"
			size="small"
			@update:model-value="onSearchUpdate"
			@focus="onFocus"
			@blur="onBlur"
		>
			<template #prefix>
				<N8nIcon :class="$style.ioSearchIcon" icon="search" size="large" />
			</template>
		</N8nInput>
	</div>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as *;

.ioSearch {
	transition: max-width 0.3s $ease-out-expo;
	--input--border-color: transparent;
	--input--border-color--hover: transparent;
	--input--border-color--focus: transparent;
	--input--color--background: transparent;

	.ioSearchIcon {
		color: var(--color--foreground--shade-2);
		cursor: pointer;
		vertical-align: middle;
	}

	input {
		opacity: 0;
		cursor: pointer;
	}
}

.ioSearchOpened {
	--input--border-color: var(--border-color);
	--input--border-color--focus: var(--color--secondary);
	--input--color--background: var(--color--foreground--tint-2);

	.ioSearchIcon {
		cursor: default;
	}

	input {
		opacity: 1;
		cursor: text;
	}
}
</style>
