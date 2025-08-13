<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, type StyleValue, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { IRunDataDisplayMode, NodePanelType } from '@/Interface';
import { useDebounce } from '@/composables/useDebounce';

type Props = {
	modelValue: string;
	paneType?: NodePanelType;
	displayMode?: IRunDataDisplayMode;
	isAreaActive?: boolean;
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
	isAreaActive: false,
});

const locale = useI18n();
const { debounce } = useDebounce();

const inputRef = ref<HTMLInputElement | null>(null);
const search = ref(props.modelValue ?? '');
const opened = ref(!!search.value);
const placeholder = computed(() => {
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

onMounted(() => {
	document.addEventListener('keyup', documentKeyHandler);
});

onUnmounted(() => {
	document.removeEventListener('keyup', documentKeyHandler);
});

watch(
	() => props.modelValue,
	(value) => {
		search.value = value;
	},
);
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
		:model-value="search"
		:placeholder="placeholder"
		size="small"
		@update:model-value="onSearchUpdate"
		@focus="onFocus"
		@blur="onBlur"
	>
		<template #prefix>
			<n8n-icon :class="$style.ioSearchIcon" icon="search" size="large" />
		</template>
	</n8n-input>
</template>

<style lang="scss" module>
@use '@/styles/variables' as *;

.ioSearch {
	transition: max-width 0.3s $ease-out-expo;

	.ioSearchIcon {
		color: var(--color-foreground-xdark);
		cursor: pointer;
		vertical-align: middle;
	}

	:global(.el-input__prefix) {
		left: 8px;
	}

	&:global(.el-input--prefix .el-input__inner) {
		padding-left: 30px;
	}

	input {
		border: 0;
		opacity: 0;
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
		opacity: 1;
		cursor: text;
	}
}
</style>
