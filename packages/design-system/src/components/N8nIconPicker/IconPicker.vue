<script lang="ts" setup>
// vueuse is a peer dependency
// eslint-disable import/no-extraneous-dependencies
import { onClickOutside } from '@vueuse/core';
import { isEmojiSupported } from 'is-emoji-supported';
import { ref, defineProps, onMounted, computed } from 'vue';

import { emojiRanges } from './constants';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();

defineOptions({ name: 'N8nIconPicker' });

const props = withDefaults(
	defineProps<{
		defaultIcon: { type: 'icon' | 'emoji'; value: string };
		buttonTooltip: string;
		availableIcons: string[];
	}>(),
	{
		defaultIcon: () => ({ type: 'icon', value: 'smile' }),
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
	type: props.defaultIcon.type,
	value: props.defaultIcon.value,
});
const emojis = ref<string[]>([]);

const generateEmojis = () => {
	const emojisArray: string[] = [];
	emojiRanges.forEach(([start, end]) => {
		for (let i = start; i <= end; i++) {
			const emoji = String.fromCodePoint(i);
			if (isEmojiSupported(emoji)) {
				emojisArray.push(emoji);
			}
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
			:class="$style['icon-button']"
			:icon="selectedIcon.value ?? 'smile'"
			:title="buttonTooltip ?? t('iconPicker.button.tooltip')"
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
		<div v-if="popupVisible" :class="$style.popup">
			<div :class="$style.tabs">
				<N8nTabs v-model="selectedTab" :options="tabs" data-test-id="icon-picker-tabs" />
			</div>
			<div v-if="selectedTab === 'icons'" :class="$style.content">
				<N8nIcon
					v-for="icon in availableIcons"
					:key="icon"
					:icon="icon"
					:class="$style.icon"
					size="large"
					data-test-id="icon-picker-icon"
					@click="selectIcon(icon)"
				/>
			</div>
			<div v-if="selectedTab === 'emojis'" :class="$style.content">
				<span
					v-for="emoji in emojis"
					:key="emoji"
					:class="$style.emoji"
					data-test-id="icon-picker-emoji"
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
