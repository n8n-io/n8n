<script lang="ts" setup>
// vueuse is a peer dependency
// eslint-disable-next-line import/no-extraneous-dependencies
import { onClickOutside } from '@vueuse/core';
import { ref, defineProps, onMounted, computed } from 'vue';

import { useI18n } from '../../composables/useI18n';

const emojiRanges = [
	[0x1f600, 0x1f64f], // Emoticons
	[0x1f300, 0x1f5ff], // Symbols & Pictographs
	[0x1f680, 0x1f6ff], // Transport & Map Symbols
	[0x2600, 0x26ff], // Miscellaneous Symbols
	[0x2700, 0x27bf], // Dingbats
	[0x1f900, 0x1f9ff], // Supplemental Symbols
];

const { t } = useI18n();

defineOptions({ name: 'N8nIconPicker' });

const props = withDefaults(
	defineProps<{
		defaultIcon: string;
		buttonTooltip: string;
		availableIcons: string[];
	}>(),
	{
		defaultIcon: 'smile',
		buttonTooltip: 'Select an icon',
		availableIcons: () => [],
	},
);

const hasAvailableIcons = computed(() => props.availableIcons.length > 0);

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
const selectedIcon = ref<{ type: 'icon' | 'emoji'; value: string }>({
	type: 'icon',
	value: props.defaultIcon,
});
const emojis = ref<string[]>([]);

const generateEmojis = () => {
	const emojisArray: string[] = [];
	emojiRanges.forEach(([start, end]) => {
		for (let i = start; i <= end; i++) {
			emojisArray.push(String.fromCodePoint(i));
		}
	});
	emojis.value = emojisArray;
};

onClickOutside(container, () => {
	popupVisible.value = false;
});

const selectIcon = (value: string) => {
	selectedIcon.value = { type: 'icon', value };
	popupVisible.value = false;
};

const selectEmoji = (value: string) => {
	selectedIcon.value = { type: 'emoji', value };
	popupVisible.value = false;
};

onMounted(() => {
	generateEmojis();
});
</script>

<template>
	<div ref="container" :class="$style.container">
		<N8nIconButton
			v-if="selectedIcon.type === 'icon'"
			:icon="selectedIcon.value ?? 'smile'"
			:title="buttonTooltip ?? t('iconPicker.button.tooltip')"
			:class="$style['icon-button']"
			type="tertiary"
			data-test-id="project-settings-back-button"
			@click="popupVisible = !popupVisible"
		/>
		<N8nButton
			v-else-if="selectedIcon.type === 'emoji'"
			type="tertiary"
			:class="$style['emoji-button']"
			@click="popupVisible = !popupVisible"
		>
			{{ selectedIcon.value }}
		</N8nButton>
		<div v-if="popupVisible" :class="$style.popup">
			<div :class="$style.tabs">
				<N8nTabs v-model="selectedTab" :options="tabs" data-test-id="project-tabs" />
			</div>
			<div v-show="selectedTab === 'icons'" :class="$style.content">
				<N8nIcon
					v-for="icon in availableIcons"
					:key="icon"
					:icon="icon"
					:class="$style.icon"
					size="large"
					@click="selectIcon(icon)"
				/>
			</div>
			<div v-show="selectedTab === 'emojis'" :class="$style.content">
				<span
					v-for="emoji in emojis"
					:key="emoji"
					:class="$style.emoji"
					@click="selectEmoji(emoji)"
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
	padding: var(--spacing-2xs);
}

.popup {
	position: absolute;
	width: 400px;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
	background-color: var(--color-background-xlight);
	margin-top: var(--spacing-4xs);
	z-index: 1;
	border-radius: var(--border-radius-base);
	border: var(--border-base);
	border-color: var(--color-foreground-dark);

	.tabs {
		padding: var(--spacing-2xs);
	}

	.content {
		display: flex;
		max-height: 400px;
		flex-wrap: wrap;
		gap: var(--spacing-2xs);
		padding: var(--spacing-2xs);
		overflow-y: auto;
		font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
	}

	.icon,
	.emoji {
		cursor: pointer;
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
