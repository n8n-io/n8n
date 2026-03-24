<script lang="ts" setup>
// vueuse is a peer dependency
// eslint-disable import-x/no-extraneous-dependencies
import { onClickOutside } from '@vueuse/core';
import { isEmojiSupported } from 'is-emoji-supported';
import { ref, computed, watch, nextTick } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import { loadLucideIconBodies } from '../N8nIcon/lucideIconLoader';
import N8nIconButton from '../N8nIconButton';
import N8nInput from '../N8nInput';
import N8nRecycleScroller from '../N8nRecycleScroller';
import N8nTabs from '../N8nTabs';
import N8nTooltip from '../N8nTooltip';
import type { EmojiSection } from './emojiData';
import IconColorPicker from './IconColorPicker.vue';
import { ICON_PICKER_BLOCKLIST } from './iconPickerBlocklist';
import type { LucideIconMeta } from './lucideIconData';
import SkinTonePicker from './SkinTonePicker.vue';
import type { IconOrEmoji } from './types';
import { useIconPickerSearch } from './useIconPickerSearch';
import {
	buildEmojiRows,
	buildIconBrowseRows,
	buildIconSearchRows,
	type IconPickerIconRow,
	type IconPickerVirtualRow,
} from './useIconPickerVirtualRows';

import IconShuffle from '~icons/lucide/shuffle';

/**
 * Icon picker with support for all Lucide icons and emojis.
 * Data is prefetched on hover over the trigger button and cached for instant popup open.
 * Icons render as raw SVGs sourced from @iconify/json (via unplugin-icons ecosystem).
 * Search metadata (keywords, categories) comes from a generated data file.
 * Emojis use emojibase-data with categories and skin tone support.
 */
defineOptions({ name: 'N8nIconPicker' });

const SKIN_TONE_STORAGE_KEY = 'n8n-emoji-skin-tone';
const VIRTUAL_ROW_SIZE = 32;
const PREFETCH_ICON_ROW_COUNT = 3;

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

// --- Lazy-loaded data ---
const lucideData = ref<Record<string, LucideIconMeta> | null>(null);
const rawEmojiSections = ref<EmojiSection[]>([]);
const dataLoaded = ref(false);
const dataLoading = ref(false);

// Filter emoji sections for browser support (cached)
const supportedEmojiSections = computed<EmojiSection[]>(() => {
	return rawEmojiSections.value
		.map((section) => ({
			...section,
			emojis: section.emojis.filter((e) => isEmojiSupported(e.u)),
		}))
		.filter((section) => section.emojis.length > 0);
});

// Filter out blocklisted icons that are used in n8n navigation/settings UI
const availableLucideData = computed<Record<string, LucideIconMeta> | null>(() => {
	if (!lucideData.value) return null;
	return Object.fromEntries(
		Object.entries(lucideData.value).filter(([name]) => !ICON_PICKER_BLOCKLIST.has(name)),
	);
});

async function loadData() {
	if (dataLoaded.value || dataLoading.value) return;
	dataLoading.value = true;
	try {
		const [metaMod, emojiMod] = await Promise.all([
			import('./lucideIconData'),
			import('./emojiData'),
		]);
		lucideData.value = metaMod.lucideIcons;
		rawEmojiSections.value = emojiMod.emojiSections;
		dataLoaded.value = true;
	} finally {
		dataLoading.value = false;
	}
}

// --- UI state ---
const popupVisible = ref(false);
const tabs: Array<{ value: string; label: string }> = [
	{ value: 'icons', label: t('iconPicker.tabs.icons') },
	{ value: 'emojis', label: t('iconPicker.tabs.emojis') },
];
const selectedTab = ref<string>(tabs[0].value);
const searchQuery = ref('');
const selectedCategory = ref<string | null>(null);
const selectedColor = ref<string | undefined>(
	model.value.type === 'icon' ? model.value.color : undefined,
);
const selectedSkinTone = ref<number>(
	parseInt(localStorage.getItem(SKIN_TONE_STORAGE_KEY) ?? '0', 10) || 0,
);

const container = ref<HTMLDivElement>();
const searchInputRef = ref<InstanceType<typeof N8nInput>>();
const colorPickerRef = ref<InstanceType<typeof IconColorPicker>>();
const skinTonePickerRef = ref<InstanceType<typeof SkinTonePicker>>();
const iconScrollerRef = ref<{ visibleItems: IconPickerVirtualRow[] }>();

onClickOutside(container, () => {
	popupVisible.value = false;
});

// --- Search ---
const { filteredIcons, filteredIconSections, filteredEmojiSections, debouncedQuery } =
	useIconPickerSearch(
		availableLucideData,
		supportedEmojiSections,
		searchQuery,
		selectedCategory,
		selectedSkinTone,
	);

// Show flat search results when a query is active, categorized sections otherwise
const isSearching = computed(() => debouncedQuery.value.trim().length > 0);
const iconRows = computed<IconPickerVirtualRow[]>(() =>
	isSearching.value
		? buildIconSearchRows(filteredIcons.value)
		: buildIconBrowseRows(filteredIconSections.value),
);
const emojiRows = computed<IconPickerVirtualRow[]>(() =>
	buildEmojiRows(filteredEmojiSections.value),
);

// --- Actions ---
const selectIcon = (value: IconOrEmoji) => {
	model.value = value;
	popupVisible.value = false;
};

function getPrefetchIconNames(rows: IconPickerVirtualRow[]): string[] {
	return rows
		.filter((row): row is IconPickerIconRow => row.type === 'icon-row')
		.slice(0, PREFETCH_ICON_ROW_COUNT)
		.flatMap((row) => row.iconNames);
}

async function prefetchVisibleIconBodies(rows = iconRows.value) {
	const iconNames = getPrefetchIconNames(rows);
	if (iconNames.length === 0) return;
	await loadLucideIconBodies(iconNames);
}

async function prefetchPickerData() {
	await loadData();
	await prefetchVisibleIconBodies();
}

const togglePopup = async () => {
	popupVisible.value = !popupVisible.value;
	if (popupVisible.value) {
		selectedTab.value = model.value.type === 'emoji' ? 'emojis' : 'icons';
		searchQuery.value = '';
		selectedCategory.value = null;
		// Initialize color from current model value
		selectedColor.value = model.value.type === 'icon' ? model.value.color : undefined;
		// Load data on first open
		await loadData();
		if (selectedTab.value === 'icons') {
			await prefetchVisibleIconBodies();
		}
		await nextTick();
		focusSearchInput();
	}
};

function focusSearchInput() {
	searchInputRef.value?.focus();
}

// Persist skin tone preference
watch(selectedSkinTone, (tone) => {
	localStorage.setItem(SKIN_TONE_STORAGE_KEY, String(tone));
});

// Re-focus search input on tab switch
watch(selectedTab, async () => {
	await nextTick();
	focusSearchInput();
});

watch([popupVisible, selectedTab, iconRows], async ([visible, tab, rows]) => {
	if (!visible || tab !== 'icons') return;
	await prefetchVisibleIconBodies(rows);
});

// Batch-load icon bodies for newly visible rows as the user scrolls
watch(
	() => iconScrollerRef.value?.visibleItems,
	async (currentVisible, previousVisible) => {
		if (!currentVisible || !popupVisible.value || selectedTab.value !== 'icons') return;

		const previousKeys = new Set((previousVisible ?? []).map((item) => item.id));
		const newlyVisible = currentVisible.filter((item) => !previousKeys.has(item.id));

		const iconNames = newlyVisible
			.filter((row): row is IconPickerIconRow => row.type === 'icon-row')
			.flatMap((row) => row.iconNames);

		if (iconNames.length > 0) {
			await loadLucideIconBodies(iconNames);
		}
	},
);

// --- Random selection ---
const selectRandomIcon = () => {
	if (!availableLucideData.value) return;
	const entries = Object.keys(availableLucideData.value);
	if (entries.length === 0) return;
	const name = entries[Math.floor(Math.random() * entries.length)];
	selectIcon({ type: 'icon', value: name, color: selectedColor.value });
};

const selectRandomEmoji = () => {
	const allEmojis = supportedEmojiSections.value.flatMap((section) => section.emojis);
	if (allEmojis.length === 0) return;
	const emoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
	const tone = selectedSkinTone.value;
	const display = tone > 0 && emoji.s ? emoji.s[tone - 1] : emoji.u;
	selectIcon({ type: 'emoji', value: display });
};

// Humanize icon name for display
function humanizeIconName(name: string): string {
	return name.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
</script>

<template>
	<div
		ref="container"
		:class="{ [$style.container]: true, [$style.isReadOnly]: isReadOnly }"
		:aria-expanded="popupVisible"
		role="button"
		aria-haspopup="true"
	>
		<div :class="$style['icon-picker-button']" @pointerenter="prefetchPickerData">
			<N8nTooltip placement="top" data-test-id="icon-picker-tooltip" :disabled="isReadOnly">
				<template #content>
					{{ props.buttonTooltip ?? t('iconPicker.button.defaultToolTip') }}
				</template>
				<N8nIconButton
					v-if="model.type === 'icon'"
					:class="$style['icon-button']"
					:icon="model.value as IconName"
					:size="buttonSize"
					icon-only
					:disabled="isReadOnly"
					variant="subtle"
					:aria-label="props.buttonTooltip ?? t('iconPicker.button.defaultToolTip')"
					data-test-id="icon-picker-button"
					:style="
						model.type === 'icon' && model.color ? { color: `var(${model.color})` } : undefined
					"
					@click="togglePopup"
				/>
				<N8nButton
					v-else-if="model.type === 'emoji'"
					:class="$style['emoji-button']"
					:size="buttonSize"
					icon-only
					variant="subtle"
					:aria-label="props.buttonTooltip ?? t('iconPicker.button.defaultToolTip')"
					data-test-id="icon-picker-button"
					:disabled="isReadOnly"
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

			<!-- Search row -->
			<div :class="$style.searchRow">
				<N8nInput
					ref="searchInputRef"
					v-model="searchQuery"
					:placeholder="t('iconPicker.search.placeholder')"
					clearable
					size="small"
					data-test-id="icon-picker-search"
				>
					<template #prefix>
						<N8nIcon icon="search" :size="14" />
					</template>
				</N8nInput>
				<N8nTooltip
					v-if="selectedTab === 'icons'"
					placement="top"
					:disabled="colorPickerRef?.isOpen"
					:teleported="false"
				>
					<template #content>
						{{ t('iconPicker.colorPicker.selectColor') }}
					</template>
					<IconColorPicker
						ref="colorPickerRef"
						v-model="selectedColor"
						data-test-id="icon-color-picker"
					/>
				</N8nTooltip>
				<N8nTooltip
					v-if="selectedTab === 'emojis'"
					placement="top"
					:disabled="skinTonePickerRef?.isOpen"
					:teleported="false"
				>
					<template #content>
						{{ t('iconPicker.skinTone.selectSkinTone') }}
					</template>
					<SkinTonePicker ref="skinTonePickerRef" v-model="selectedSkinTone" />
				</N8nTooltip>
				<N8nTooltip placement="top" :teleported="false">
					<template #content>
						{{
							selectedTab === 'icons' ? t('iconPicker.random.icon') : t('iconPicker.random.emoji')
						}}
					</template>
					<N8nButton
						:class="$style.shuffleButton"
						variant="outline"
						size="medium"
						icon-only
						:aria-label="
							selectedTab === 'icons' ? t('iconPicker.random.icon') : t('iconPicker.random.emoji')
						"
						data-test-id="icon-picker-random"
						@click="selectedTab === 'icons' ? selectRandomIcon() : selectRandomEmoji()"
					>
						<IconShuffle :class="$style.shuffleIcon" />
					</N8nButton>
				</N8nTooltip>
			</div>

			<!-- Loading state -->
			<div v-if="dataLoading" :class="$style.loadingState" data-test-id="icon-picker-loading">
				{{ t('iconPicker.loading') }}
			</div>

			<!-- Icons tab -->
			<div v-else-if="selectedTab === 'icons' && dataLoaded" :class="$style.content">
				<N8nRecycleScroller
					ref="iconScrollerRef"
					v-if="iconRows.length > 0"
					:items="iconRows"
					item-key="id"
					:item-size="VIRTUAL_ROW_SIZE"
				>
					<template #default="{ item }">
						<div v-if="item.type === 'header'" :class="$style.sectionHeaderRow">
							<div :class="$style.sectionHeader">
								{{ t(item.labelKey) }}
							</div>
						</div>
						<div v-else-if="item.type === 'icon-row'" :class="$style.iconGridRow">
							<button
								v-for="name in item.iconNames"
								:key="name"
								type="button"
								:class="$style.iconButton"
								:style="selectedColor ? { color: `var(${selectedColor})` } : undefined"
								data-test-id="icon-picker-icon"
								:title="humanizeIconName(name)"
								:aria-label="humanizeIconName(name)"
								@click="selectIcon({ type: 'icon', value: name, color: selectedColor })"
							>
								<N8nIcon :icon="name" :size="20" :class="$style.icon" />
							</button>
						</div>
					</template>
				</N8nRecycleScroller>
				<div v-else :class="$style.emptyState" data-test-id="icon-picker-no-results">
					{{ t('iconPicker.search.noResults') }}
				</div>
			</div>

			<!-- Emojis tab -->
			<div v-else-if="selectedTab === 'emojis' && dataLoaded" :class="$style.content">
				<N8nRecycleScroller
					v-if="emojiRows.length > 0"
					:items="emojiRows"
					item-key="id"
					:item-size="VIRTUAL_ROW_SIZE"
				>
					<template #default="{ item }">
						<div v-if="item.type === 'header'" :class="$style.sectionHeaderRow">
							<div :class="$style.sectionHeader">
								{{ t(item.labelKey) }}
							</div>
						</div>
						<div v-else-if="item.type === 'emoji-row'" :class="$style.emojiGridRow">
							<button
								v-for="emoji in item.emojis"
								:key="emoji.u"
								type="button"
								:class="$style.emojiButton"
								data-test-id="icon-picker-emoji"
								:title="emoji.l"
								:aria-label="emoji.l"
								@click="selectIcon({ type: 'emoji', value: emoji.display })"
							>
								<span :class="$style.emoji">{{ emoji.display }}</span>
							</button>
						</div>
					</template>
				</N8nRecycleScroller>
				<div v-else :class="$style.emptyState" data-test-id="icon-picker-no-results">
					{{ t('iconPicker.search.noResults') }}
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	position: relative;
	width: fit-content;
}

.icon-button,
.emoji-button {
	.isReadOnly & {
		pointer-events: none;
		background-color: var(--input--color--background--disabled);
	}
}

.icon-button {
	svg {
		width: var(--spacing--md);
		height: var(--spacing--md);
		stroke-width: 1.5;
	}
}

.emoji-button {
	padding: 0;
	font-size: var(--font-size--xl);
}

.popup {
	position: absolute;
	z-index: 9999;
	width: 296px;
	max-height: 400px;
	display: flex;
	flex-direction: column;
	margin-top: var(--spacing--4xs);
	background-color: var(--color--background--light-3);
	border-radius: var(--radius);
	border: var(--border);
	border-color: var(--color--foreground--shade-1);

	.tabs {
		padding: var(--spacing--2xs);
		padding-bottom: var(--spacing--2xs);
	}

	.searchRow {
		display: flex;
		align-items: center;
		gap: var(--spacing--4xs);
		padding: 0 var(--spacing--2xs) var(--spacing--2xs);

		> :first-child {
			flex: 1;
			min-width: 0;
		}
	}

	.content {
		height: 280px;
		padding: 0 var(--spacing--2xs) var(--spacing--2xs);
	}

	.sectionHeaderRow {
		padding-top: var(--spacing--2xs);
	}

	.iconGridRow,
	.emojiGridRow {
		display: grid;
		grid-template-columns: repeat(10, minmax(0, 1fr));
	}

	.iconButton,
	.emojiButton {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing--4xs);
		border: none;
		background: transparent;
		border-radius: var(--radius--sm);
		cursor: pointer;

		&:hover {
			background-color: var(--color--background--shade-1);
		}
	}

	.iconButton {
		color: var(--color--text--tint-1);

		&:hover {
			color: var(--color--text--shade-1);
		}
	}

	.icon {
		display: block;
		stroke-width: 1.5;
	}

	.emojiButton {
		width: var(--icon-picker--emoji-cell--size, 28px);
		height: var(--icon-picker--emoji-cell--size, 28px);
	}

	.emoji {
		font-size: var(--font-size--xl);
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		font-family:
			'Segoe UI Emoji', 'Segoe UI Symbol', 'Segoe UI', 'Apple Color Emoji', 'Twemoji Mozilla',
			'Noto Color Emoji', 'Android Emoji', sans-serif;
	}

	.sectionHeader {
		padding: var(--spacing--4xs) 0;
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--bold);
		color: var(--color--text--tint-1);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background-color: var(--color--background--light-3);
	}

	.shuffleButton {
		flex-shrink: 0;
	}

	.shuffleIcon {
		width: var(--spacing--sm);
		height: var(--spacing--sm);
		color: var(--color--text--tint-1);
		stroke-width: 1.5;
	}

	.loadingState,
	.emptyState {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing--xl);
		color: var(--color--text--tint-2);
		font-size: var(--font-size--sm);
	}
}
</style>
