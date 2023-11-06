<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useI18n } from '@/composables';
import { EnterpriseEditionFeature } from '@/constants';
import type { NodePanelType } from '@/Interface';

type Props = {
	modelValue: string;
	paneType?: NodePanelType;
	isAreaActive?: boolean;
};

const INITIAL_WIDTH = '34px';
const TOOLTIP_AUTO_CLOSE = 3000;

const emit = defineEmits<{
	(event: 'update:modelValue', value: Props['modelValue']): void;
	(event: 'focus'): void;
}>();

const props = withDefaults(defineProps<Props>(), {
	paneType: 'output',
	isAreaActive: false,
});

const locale = useI18n();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();

const inputRef = ref<HTMLInputElement | null>(null);
const maxWidth = ref(INITIAL_WIDTH);
const opened = ref(false);
const focused = ref(false);
const showTooltip = ref<boolean | null>(null);
const autoCloseTooltip = ref<number | null>(null);
const disabled = computed(
	() => !settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.NodeIOFilters),
);
const placeholder = computed(() =>
	props.paneType === 'input'
		? locale.baseText('ndv.search.placeholder.input')
		: locale.baseText('ndv.search.placeholder.output'),
);

const goToUpgrade = () => {
	void uiStore.goToUpgrade('ndv-filter', 'upgrade-ndv-filter');
};
const documentKeyHandler = (event: KeyboardEvent) => {
	const isTargetAnyFormElement =
		event.target instanceof HTMLInputElement ||
		event.target instanceof HTMLTextAreaElement ||
		event.target instanceof HTMLSelectElement;
	if (event.key === '/' && !focused.value && props.isAreaActive && !isTargetAnyFormElement) {
		if (disabled.value) {
			if (autoCloseTooltip.value) {
				window.clearTimeout(autoCloseTooltip.value);
				autoCloseTooltip.value = null;
			}
			autoCloseTooltip.value = window.setTimeout(() => {
				showTooltip.value = false;
			}, TOOLTIP_AUTO_CLOSE);
			showTooltip.value = true;
		} else {
			inputRef.value?.focus();
			inputRef.value?.select();
		}
	}
};

const onSearchUpdate = (value: string) => {
	emit('update:modelValue', value);
};
const onFocus = () => {
	opened.value = true;
	focused.value = true;
	maxWidth.value = '30%';
	inputRef.value?.select();
	emit('focus');
};
const onBlur = () => {
	focused.value = false;
	if (!props.modelValue) {
		opened.value = false;
		maxWidth.value = INITIAL_WIDTH;
	}
};
const onHideTooltip = () => {
	// Need to set it to null, so it keeps opening on hover
	showTooltip.value = null;
};
onMounted(() => {
	document.addEventListener('keyup', documentKeyHandler);
});
onUnmounted(() => {
	document.removeEventListener('keyup', documentKeyHandler);
});
</script>

<template>
	<n8n-tooltip
		:disabled="!disabled"
		:visible="showTooltip"
		@hide="onHideTooltip"
		placement="bottom-end"
	>
		<template #content>
			<i18n-t keypath="ndv.search.upgrade.tooltip" tag="span">
				<template #link>
					<a href="#" @click="goToUpgrade">
						{{ locale.baseText('ndv.search.upgrade.tooltip.link') }}
					</a>
				</template>
			</i18n-t>
		</template>
		<n8n-input
			ref="inputRef"
			:class="{
				[$style.ioSearch]: true,
				[$style.ioSearchOpened]: opened,
				[$style.ioSearchDisabled]: disabled,
			}"
			:style="{ maxWidth }"
			:modelValue="modelValue"
			:disabled="disabled"
			:placeholder="placeholder"
			size="small"
			@update:modelValue="onSearchUpdate"
			@focus="onFocus"
			@blur="onBlur"
		>
			<template #prefix>
				<n8n-icon :class="$style.ioSearchIcon" icon="search" />
			</template>
		</n8n-input>
	</n8n-tooltip>
</template>

<style lang="scss" module>
@import '@/styles/css-animation-helpers.scss';

.ioSearch {
	margin-right: var(--spacing-s);
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

.ioSearchDisabled {
	.ioSearchIcon {
		cursor: not-allowed;
	}
	input[type='text']:disabled {
		border: 0;
		background: transparent;
		cursor: not-allowed;
	}
}
</style>
