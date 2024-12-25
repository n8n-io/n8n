<script lang="ts" setup>
// vueuse is a peer dependency
// eslint-disable import/no-extraneous-dependencies
import { onClickOutside, useMemoize } from '@vueuse/core';
import { isEmojiSupported } from 'is-emoji-supported';
import { ref, defineProps, onMounted, computed } from 'vue';

import { useI18n } from '../../composables/useI18n';

const emojiRanges = [
	[0x1f600, 0x1f64f], // Emoticons
	[0x1f300, 0x1f5ff], // Symbols & Pictographs
	[0x1f680, 0x1f6ff], // Transport & Map Symbols
	[0x2600, 0x26ff], // Miscellaneous Symbols
	[0x2700, 0x27bf], // Dingbats
	[0x1f900, 0x1f9ff], // Supplemental Symbols
	[0x1f1e6, 0x1f1ff], // Regional Indicator Symbols
	[0x1f400, 0x1f4ff], // Additional pictographs
];

type Icon = {
	type: 'icon' | 'emoji';
	value: string;
};

const { t } = useI18n();

defineOptions({ name: 'N8nIconPicker' });

// TODO: Extract to type
// TODO: Add comments about emoji library and search
const props = withDefaults(
	defineProps<{
		modelValue: Icon;
		buttonTooltip: string;
		availableIcons: string[];
	}>(),
	{
		modelValue: () => ({ type: 'icon', value: 'smile' }),
		buttonTooltip: 'Select an icon',
		availableIcons: () => [],
	},
);

const emit = defineEmits<{
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'update:modelValue': [value: Icon];
}>();

const hasAvailableIcons = computed(() => props.availableIcons.length > 0);

const emojis = computed(() => {
	const emojisArray: string[] = [];
	emojiRanges.forEach(([start, end]) => {
		for (let i = start; i <= end; i++) {
			const emoji = String.fromCodePoint(i);
			if (isEmojiSupported(emoji)) {
				emojisArray.push(emoji);
			}
		}
	});
	return emojisArray;
});

const popupVisible = ref(false);
const container = ref<HTMLDivElement>();
const tabs = ref<Array<{ value: string; label: string }>>(
	hasAvailableIcons.value
		? [
				{ value: 'icons', label: t('iconPicker.tabs.icons') },
				{ value: 'emojis', label: t('iconPicker.tabs.emojis') },
			]
		: [{ value: 'emojis', label: t('iconPicker.tabs.emojis') }],
);
const selectedTab = ref<string>(tabs.value[0].value);

const selectedIcon = computed({
	get: () => props.modelValue,
	set: (value: Icon) => emit('update:modelValue', value),
});

onClickOutside(container, () => {
	popupVisible.value = false;
});

const selectIcon = (value: Icon) => {
	selectedIcon.value = value;
	popupVisible.value = false;
};
</script>

<template>
	<div
		ref="container"
		:class="$style.container"
		role="button"
		aria-haspopup="true"
		:aria-expanded="popupVisible"
	>
		<div :class="$style['icon-picker-button']">
			<N8nIconButton
				v-if="selectedIcon.type === 'icon'"
				:class="$style['icon-button']"
				:icon="selectedIcon.value ?? 'smile'"
				:title="buttonTooltip ?? t('iconPicker.button.tooltip')"
				size="large"
				type="tertiary"
				data-test-id="icon-picker-button"
				@click="popupVisible = !popupVisible"
			/>
			<N8nButton
				v-else-if="selectedIcon.type === 'emoji'"
				:class="$style['emoji-button']"
				:title="buttonTooltip ?? t('iconPicker.button.tooltip')"
				type="tertiary"
				data-test-id="icon-picker-button"
				@click="popupVisible = !popupVisible"
			>
				{{ selectedIcon.value }}
			</N8nButton>
		</div>
		<div v-if="popupVisible" :class="$style.popup">
			<div :class="$style.tabs">
				<N8nTabs v-model="selectedTab" :options="tabs" data-test-id="icon-picker-tabs" />
			</div>
			<div v-show="selectedTab === 'icons'" :class="$style.content">
				<N8nIcon
					v-for="icon in availableIcons"
					:key="icon"
					:icon="icon"
					:class="$style.icon"
					size="large"
					data-test-id="icon-picker-icon"
					@click="selectIcon({ type: 'icon', value: icon })"
				/>
			</div>
			<div v-show="selectedTab === 'emojis'" :class="$style.content">
				<span
					v-for="emoji in emojis"
					:key="emoji"
					:class="$style.emoji"
					data-test-id="icon-picker-emoji"
					@click="selectIcon({ type: 'emoji', value: emoji })"
				>
					{{ emoji }}
				</span>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	position: relative;
}

.emoji-button {
	padding: var(--spacing-xs);
}
.popup {
	position: absolute;
	z-index: 1;
	width: 400px;
	display: flex;
	flex-direction: column;
	margin-top: var(--spacing-4xs);
	background-color: var(--color-background-xlight);
	border-radius: var(--border-radius-base);
	border: var(--border-base);
	border-color: var(--color-foreground-dark);

	.tabs {
		padding: var(--spacing-2xs);
		padding-bottom: var(--spacing-5xs);
	}

	.content {
		display: flex;
		max-height: 400px;
		flex-wrap: wrap;
		gap: var(--spacing-2xs);
		padding: var(--spacing-2xs);
		overflow-y: auto;
	}

	.icon,
	.emoji {
		cursor: pointer;
	}

	.emoji {
		font-family: 'Segoe UI Emoji', 'Segoe UI Symbol', 'Segoe UI', 'Apple Color Emoji',
			'Twemoji Mozilla', 'Noto Color Emoji', 'Android Emoji', sans-serif;
	}

	.icon {
		color: var(--color-text-light);

		&:hover {
			color: var(--color-text-dark);
			background-color: var(--color-background-light);
		}
	}
}
</style>
