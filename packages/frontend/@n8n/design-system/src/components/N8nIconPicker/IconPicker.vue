<script lang="ts" setup>
// vueuse is a peer dependency
// eslint-disable import-x/no-extraneous-dependencies
import { onClickOutside } from '@vueuse/core';
import { isEmojiSupported } from 'is-emoji-supported';
import { ref, computed } from 'vue';

import { ALL_ICON_PICKER_ICONS } from './constants';
import type { IconOrEmoji } from './types';
import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nTabs from '../N8nTabs';
import N8nTooltip from '../N8nTooltip';

/**
 * Simple n8n icon picker component with support for font icons and emojis.
 * In order to keep this component as dependency-free as possible, it only renders externally provided font icons.
 * Emojis are rendered from `emojiRanges` array.
 * If we want to introduce advanced features like search, we need to use libraries like `emojilib`.
 */
defineOptions({ name: 'N8nIconPicker' });

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

type Props = {
	buttonTooltip: string;
	buttonSize?: 'small' | 'large';
};

const { t } = useI18n();

const props = withDefaults(defineProps<Props>(), {
	buttonSize: 'large',
});

const model = defineModel<IconOrEmoji>({ default: { type: 'icon', value: 'smile' } });

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
const tabs: Array<{ value: string; label: string }> = [
	{ value: 'icons', label: t('iconPicker.tabs.icons') },
	{ value: 'emojis', label: t('iconPicker.tabs.emojis') },
];
const selectedTab = ref<string>(tabs[0].value);

const container = ref<HTMLDivElement>();

onClickOutside(container, () => {
	popupVisible.value = false;
});

const selectIcon = (value: IconOrEmoji) => {
	model.value = value;
	popupVisible.value = false;
};

const togglePopup = () => {
	popupVisible.value = !popupVisible.value;
	if (popupVisible.value) {
		selectedTab.value = tabs[0].value;
	}
};
</script>

<template>
	<div
		ref="container"
		:class="$style.container"
		:aria-expanded="popupVisible"
		role="button"
		aria-haspopup="true"
	>
		<div :class="$style['icon-picker-button']">
			<N8nTooltip placement="right" data-test-id="icon-picker-tooltip">
				<template #content>
					{{ props.buttonTooltip ?? t('iconPicker.button.defaultToolTip') }}
				</template>
				<N8nIconButton
					v-if="model.type === 'icon'"
					:class="$style['icon-button']"
					:icon="model.value"
					:size="buttonSize"
					:square="true"
					type="tertiary"
					data-test-id="icon-picker-button"
					@click="togglePopup"
				/>
				<N8nButton
					v-else-if="model.type === 'emoji'"
					:class="$style['emoji-button']"
					:size="buttonSize"
					:square="true"
					type="tertiary"
					data-test-id="icon-picker-button"
					@click="togglePopup"
				>
					{{ model.value }}
				</N8nButton>
			</N8nTooltip>
		</div>
		<div v-if="popupVisible" :class="$style.popup" data-test-id="icon-picker-popup">
			<div :class="$style.tabs">
				<N8nTabs v-model="selectedTab" :options="tabs" data-test-id="icon-picker-tabs" />
			</div>
			<div v-if="selectedTab === 'icons'" :class="$style.content">
				<N8nIcon
					v-for="icon in ALL_ICON_PICKER_ICONS"
					:key="icon"
					:icon="icon"
					:class="$style.icon"
					:size="24"
					data-test-id="icon-picker-icon"
					@click="selectIcon({ type: 'icon', value: icon })"
				/>
			</div>
			<div v-if="selectedTab === 'emojis'" :class="$style.content">
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
	padding: 0;
}
.popup {
	position: absolute;
	z-index: 1;
	width: 426px;
	max-height: 300px;
	display: flex;
	flex-direction: column;
	margin-top: var(--spacing--4xs);
	background-color: var(--color--background--light-3);
	border-radius: var(--radius);
	border: var(--border);
	border-color: var(--color--foreground--shade-1);

	.tabs {
		padding: var(--spacing--2xs);
		padding-bottom: var(--spacing--5xs);
	}

	.content {
		display: flex;
		flex-wrap: wrap;
		padding: var(--spacing--2xs);
		overflow-y: auto;
	}

	.icon,
	.emoji {
		cursor: pointer;
		padding: var(--spacing--4xs);
		border-radius: var(--radius--sm);

		&:hover {
			background-color: var(--color--background--shade-1);
		}
	}

	.icon {
		color: var(--color--text--tint-1);

		&:hover {
			color: var(--color--text--shade-1);
		}
	}

	.emoji {
		font-family:
			'Segoe UI Emoji', 'Segoe UI Symbol', 'Segoe UI', 'Apple Color Emoji', 'Twemoji Mozilla',
			'Noto Color Emoji', 'Android Emoji', sans-serif;
	}
}
</style>
