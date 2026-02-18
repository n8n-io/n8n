<script lang="ts" setup>
// vueuse is a peer dependency
// eslint-disable import-x/no-extraneous-dependencies
import { onClickOutside } from '@vueuse/core';
import { isEmojiSupported } from 'is-emoji-supported';
import { ref, computed, nextTick } from 'vue';

import { ALL_ICON_PICKER_ICONS } from './constants';
import type { IconOrEmoji } from './types';
import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nInput from '../N8nInput';
import N8nTabs from '../N8nTabs';
import N8nTooltip from '../N8nTooltip';

/**
 * Simple n8n icon picker component with support for font icons and emojis.
 * In order to keep this component as dependency-free as possible, it only renders externally provided font icons.
 * Emojis are rendered from `emojiRanges` array with searchable metadata from emojibase-data.
 */
defineOptions({ name: 'N8nIconPicker' });

// Create a searchable mapping of emojis to their metadata
const emojiMetadataMap = ref<
	'loading' | Map<string, { label: string; tags: string[]; hexcode: string }>
>();

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
	isReadOnly?: boolean;
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
const searchQuery = ref('');

const container = ref<HTMLDivElement>();
const searchInput = ref<InstanceType<typeof N8nInput>>();

const filteredIcons = computed(() => {
	if (!searchQuery.value) {
		return ALL_ICON_PICKER_ICONS;
	}
	const query = searchQuery.value.toLowerCase();
	return ALL_ICON_PICKER_ICONS.filter((icon) => icon.toLowerCase().includes(query));
});

const filteredEmojis = computed(() => {
	if (!searchQuery.value) {
		return emojis.value;
	}

	const query = searchQuery.value.toLowerCase();
	return emojis.value.filter((emoji) => {
		const metadata =
			emojiMetadataMap.value === 'loading' ? undefined : emojiMetadataMap.value?.get(emoji);

		if (!metadata) {
			return false;
		}

		// Search in label and tags
		return (
			metadata.label.toLowerCase().includes(query) ||
			metadata.tags.some((tag) => tag.toLowerCase().includes(query))
		);
	});
});

const searchResults = computed(() => [
	...filteredIcons.value.map<IconOrEmoji>((value) => ({ type: 'icon', value })),
	...filteredEmojis.value.map<IconOrEmoji>((value) => ({ type: 'emoji', value })),
]);

onClickOutside(container, () => {
	popupVisible.value = false;
});

function selectIcon(value: IconOrEmoji) {
	model.value = value;
	popupVisible.value = false;
}

function selectRandom() {
	if (searchResults.value.length === 0) {
		return;
	}

	model.value = searchResults.value[Math.floor(Math.random() * searchResults.value.length)];
}

function togglePopup() {
	void loadEmojiMetadataMap();
	popupVisible.value = !popupVisible.value;
	if (popupVisible.value) {
		selectedTab.value = tabs[0].value;
		searchQuery.value = '';
		// Focus the search input after the popup is rendered
		void nextTick(() => {
			searchInput.value?.focus();
		});
	}
}

async function loadEmojiMetadataMap() {
	if (emojiMetadataMap.value) {
		return;
	}

	emojiMetadataMap.value = 'loading';

	const emojibaseData = await import('emojibase-data/en/compact.json');

	emojiMetadataMap.value = new Map(
		emojibaseData.default.map((emoji) => [
			emoji.unicode,
			{
				label: emoji.label,
				tags: emoji.tags || [],
				hexcode: emoji.hexcode,
			},
		]),
	);
}
</script>

<template>
	<div
		ref="container"
		:class="{
			[$style.container]: true,
			[$style.isReadOnly]: isReadOnly,
			[$style[props.buttonSize]]: true,
		}"
		:aria-expanded="popupVisible"
		role="button"
		aria-haspopup="true"
	>
		<div :class="$style['icon-picker-button']">
			<N8nTooltip placement="right" data-test-id="icon-picker-tooltip" :disabled="isReadOnly">
				<template #content>
					{{ props.buttonTooltip ?? t('iconPicker.button.defaultToolTip') }}
				</template>
				<N8nIconButton
					v-if="model.type === 'icon'"
					:class="$style['icon-button']"
					:icon="model.value"
					:size="buttonSize"
					icon-only
					:disabled="isReadOnly"
					variant="subtle"
					data-test-id="icon-picker-button"
					@click="togglePopup"
				/>
				<N8nButton
					v-else-if="model.type === 'emoji'"
					:class="$style['emoji-button']"
					:size="buttonSize"
					icon-only
					variant="subtle"
					data-test-id="icon-picker-button"
					:disabled="isReadOnly"
					@click="togglePopup"
				>
					{{ model.value }}
				</N8nButton>
			</N8nTooltip>
		</div>
		<div v-if="popupVisible" :class="$style.popup" data-test-id="icon-picker-popup">
			<div :class="$style.search">
				<N8nInput
					ref="searchInput"
					v-model="searchQuery"
					:placeholder="t('iconPicker.search.placeholder')"
					:clearable="true"
					size="small"
					data-test-id="icon-picker-search"
					@input="loadEmojiMetadataMap"
				>
					<template #prefix>
						<N8nIcon icon="search" :size="16" />
					</template>
				</N8nInput>
				<N8nButton icon="refresh-cw" size="small" type="secondary" @click="selectRandom">{{
					t('iconPicker.random')
				}}</N8nButton>
			</div>
			<div v-if="!searchQuery" :class="$style.tabs">
				<N8nTabs v-model="selectedTab" :options="tabs" data-test-id="icon-picker-tabs" />
			</div>
			<div :class="$style.content">
				<template v-if="searchQuery">
					<template v-for="(iconOrEmoji, index) in searchResults" :key="index">
						<N8nIcon
							v-if="iconOrEmoji.type === 'icon'"
							:icon="iconOrEmoji.value"
							:class="$style.icon"
							:size="24"
							data-test-id="icon-picker-icon"
							@click="selectIcon(iconOrEmoji)"
						/>
						<span
							v-else
							:key="iconOrEmoji.value"
							:class="$style.emoji"
							data-test-id="icon-picker-emoji"
							@click="selectIcon(iconOrEmoji)"
						>
							{{ iconOrEmoji.value }}
						</span>
					</template>
				</template>
				<template v-else-if="selectedTab === 'icons'">
					<N8nIcon
						v-for="icon in ALL_ICON_PICKER_ICONS"
						:key="icon"
						:icon="icon"
						:class="$style.icon"
						:size="24"
						data-test-id="icon-picker-icon"
						@click="selectIcon({ type: 'icon', value: icon })"
					/>
				</template>
				<template v-else>
					<span
						v-for="emoji in emojis"
						:key="emoji"
						:class="$style.emoji"
						data-test-id="icon-picker-emoji"
						@click="selectIcon({ type: 'emoji', value: emoji })"
					>
						{{ emoji }}
					</span>
				</template>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	position: relative;
}

.icon-button,
.emoji-button {
	.isReadOnly & {
		pointer-events: none;
		background-color: var(--input--color--background--disabled);
	}
}

.icon-button svg {
	width: 20px;
	height: 20px;

	.small & {
		width: 18px;
		height: 18px;
	}
}

.emoji-button {
	padding: 0;
	font-size: 24px;

	.small & {
		font-size: 18px;
	}
}

.popup {
	position: absolute;
	z-index: 9999;
	width: 426px;
	max-height: 300px;
	display: flex;
	flex-direction: column;
	margin-top: var(--spacing--4xs);
	background-color: var(--color--background--light-3);
	border-radius: var(--radius);
	border: var(--border);
	border-color: var(--color--foreground--shade-1);

	.search {
		padding: var(--spacing--2xs);
		padding-bottom: var(--spacing--2xs);
		display: flex;
		gap: var(--spacing--4xs);
	}

	.tabs {
		padding: 0 var(--spacing--2xs) var(--spacing--5xs);
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
