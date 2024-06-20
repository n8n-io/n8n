<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, type StyleValue } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { NodePanelType } from '@/Interface';

type Props = {
	modelValue: string;
	paneType?: NodePanelType;
	isAreaActive?: boolean;
};

const COLLAPSED_WIDTH = '34px';
const OPEN_WIDTH = '200px';
const OPEN_MIN_WIDTH = '120px';

const emit = defineEmits<{
	(event: 'update:modelValue', value: Props['modelValue']): void;
	(event: 'focus'): void;
}>();

const props = withDefaults(defineProps<Props>(), {
	paneType: 'output',
	isAreaActive: false,
});

const locale = useI18n();

const inputRef = ref<HTMLInputElement | null>(null);
const opened = ref(false);
const placeholder = computed(() =>
	props.paneType === 'input'
		? locale.baseText('ndv.search.placeholder.input')
		: locale.baseText('ndv.search.placeholder.output'),
);

const style = computed<StyleValue>(() =>
	opened.value ? { maxWidth: OPEN_WIDTH, minWidth: OPEN_MIN_WIDTH } : { maxWidth: COLLAPSED_WIDTH },
);

const documentKeyHandler = (event: KeyboardEvent) => {
	const isTargetFormElementOrEditable =
		event.target instanceof HTMLInputElement ||
		event.target instanceof HTMLTextAreaElement ||
		event.target instanceof HTMLSelectElement ||
		(event.target as HTMLElement)?.getAttribute?.('contentEditable') === 'true';

	if (event.key === '/' && props.isAreaActive && !isTargetFormElementOrEditable) {
		inputRef.value?.focus();
		inputRef.value?.select();
	}
};

const onSearchUpdate = (value: string) => {
	emit('update:modelValue', value);
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
onMounted(() => {
	document.addEventListener('keyup', documentKeyHandler);
});
onUnmounted(() => {
	document.removeEventListener('keyup', documentKeyHandler);
});
</script>

<template>
	<n8n-input
		ref="inputRef"
		data-test-id="ndv-search"
		:class="{
			[$style.ioSearch]: true,
			[$style.ioSearchOpened]: opened,
		}"
		:style="style"
		:model-value="modelValue"
		:placeholder="placeholder"
		size="small"
		@update:model-value="onSearchUpdate"
		@focus="onFocus"
		@blur="onBlur"
	>
		<template #prefix>
			<n8n-icon :class="$style.ioSearchIcon" icon="search" />
		</template>
	</n8n-input>
</template>

<style lang="scss" module>
@import '@/styles/variables';

.ioSearch {
	transition: max-width 0.3s $ease-out-expo;

	.ioSearchIcon {
		color: var(--color-foreground-xdark);
		cursor: pointer;
	}

	input {
		border: 0;
		background: transparent;
		cursor: pointer;
	}
}

.ioSearchOpened {
	.ioSearchIcon {
		cursor: default;
	}
	input {
		border: var(--input-border-color, var(--border-color-base))
			var(--input-border-style, var(--border-style-base)) var(--border-width-base);
		background: var(--input-background-color, var(--color-foreground-xlight));
		cursor: text;
	}
}
</style>
