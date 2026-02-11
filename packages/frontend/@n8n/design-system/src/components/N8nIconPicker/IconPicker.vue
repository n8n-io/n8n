<script lang="ts" setup>
// vueuse is a peer dependency
// eslint-disable import-x/no-extraneous-dependencies
import { onClickOutside } from '@vueuse/core';
import { isEmojiSupported } from 'is-emoji-supported';
import { ref, computed, watch, nextTick } from 'vue';

import type { EmojiSection } from './emojiData';
import { ICON_PICKER_BLOCKLIST } from './iconPickerBlocklist';
import type { LucideIcon } from './lucideIconData';
import SkinTonePicker from './SkinTonePicker.vue';
import type { IconOrEmoji } from './types';
import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nIconButton from '../N8nIconButton';
import N8nInput from '../N8nInput';
import N8nTabs from '../N8nTabs';
import N8nTooltip from '../N8nTooltip';
import IconColorPicker from './IconColorPicker.vue';
import { useIconPickerSearch } from './useIconPickerSearch';

/**
 * Icon picker with support for all Lucide icons and emojis.
 * Icon and emoji data is lazy-loaded on first popup open.
 * Icons render as raw SVGs from a generated data file.
 * Emojis use emojibase-data with categories and skin tone support.
 */
defineOptions({ name: 'N8nIconPicker' });

const SKIN_TONE_STORAGE_KEY = 'n8n-emoji-skin-tone';

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
const lucideData = ref<Record<string, LucideIcon> | null>(null);
const rawEmojiSections = ref<EmojiSection[]>([]);
const dataLoaded = ref(false);
const dataLoading = ref(false);

// Filter emoji sections for browser support (cached)
const supportedEmojiSections = computed<EmojiSection[]>(() => {
	return rawEmojiSections.value.map((section) => ({
		...section,
		emojis: section.emojis.filter((e) => isEmojiSupported(e.u)),
	})).filter((section) => section.emojis.length > 0);
});

// Filter out blocklisted icons that are used in n8n navigation/settings UI
const availableLucideData = computed<Record<string, LucideIcon> | null>(() => {
	if (!lucideData.value) return null;
	return Object.fromEntries(
		Object.entries(lucideData.value).filter(([name]) => !ICON_PICKER_BLOCKLIST.has(name)),
	);
});

async function loadData() {
	if (dataLoaded.value || dataLoading.value) return;
	dataLoading.value = true;
	try {
		const [lucideMod, emojiMod] = await Promise.all([
			import('./lucideIconData'),
			import('./emojiData'),
		]);
		lucideData.value = lucideMod.lucideIcons;
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
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const searchInputRef = ref<InstanceType<typeof N8nInput> | null>(null);
const colorPickerRef = ref<InstanceType<typeof IconColorPicker> | null>(null);
const skinTonePickerRef = ref<InstanceType<typeof SkinTonePicker> | null>(null);

onClickOutside(container, () => {
	popupVisible.value = false;
});

// --- Search ---
const { filteredIcons, filteredIconSections, filteredEmojiSections, debouncedQuery } = useIconPickerSearch(
	availableLucideData,
	supportedEmojiSections,
	searchQuery,
	selectedCategory,
	selectedSkinTone,
);

// Show flat search results when a query is active, categorized sections otherwise
const isSearching = computed(() => debouncedQuery.value.trim().length > 0);

// --- Actions ---
const selectIcon = (value: IconOrEmoji) => {
	model.value = value;
	popupVisible.value = false;
};

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
		await nextTick();
		focusSearchInput();
	}
};

function focusSearchInput() {
	// N8nInput exposes focus method or we can access the inner input
	const inputEl = searchInputRef.value;
	if (inputEl) {
		// Try the component's focus method first
		if (typeof (inputEl as unknown as { focus: () => void }).focus === 'function') {
			(inputEl as unknown as { focus: () => void }).focus();
		}
	}
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
		<div :class="$style['icon-picker-button']">
			<N8nTooltip placement="right" data-test-id="icon-picker-tooltip" :disabled="isReadOnly">
				<template #content>
					{{ props.buttonTooltip ?? t('iconPicker.button.defaultToolTip') }}
				</template>
				<N8nIconButton
					v-if="model.type === 'icon'"
					:class="$style['icon-button']"
					:icon="(model.value as unknown as IconName)"
					:size="buttonSize"
					icon-only
					:disabled="isReadOnly"
					variant="subtle"
					:aria-label="props.buttonTooltip ?? t('iconPicker.button.defaultToolTip')"
					data-test-id="icon-picker-button"
					:style="model.type === 'icon' && model.color ? { color: `var(${model.color})` } : undefined"
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
				<SkinTonePicker
					ref="skinTonePickerRef"
					v-model="selectedSkinTone"
				/>
			</N8nTooltip>
			<N8nTooltip placement="top" :teleported="false">
				<template #content>
					{{ selectedTab === 'icons' ? t('iconPicker.random.icon') : t('iconPicker.random.emoji') }}
				</template>
				<N8nButton
					:class="$style.shuffleButton"
					type="tertiary"
					size="medium"
					:square="true"
					:aria-label="selectedTab === 'icons' ? t('iconPicker.random.icon') : t('iconPicker.random.emoji')"
					data-test-id="icon-picker-random"
					@click="selectedTab === 'icons' ? selectRandomIcon() : selectRandomEmoji()"
				>
					<svg
						:class="$style.shuffleIcon"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="m18 14l4 4l-4 4m0-20l4 4l-4 4" />
						<path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22M2 6h1.972a4 4 0 0 1 3.6 2.2M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
					</svg>
				</N8nButton>
			</N8nTooltip>
			</div>

			<!-- Loading state -->
			<div v-if="dataLoading" :class="$style.loadingState" data-test-id="icon-picker-loading">
				{{ t('iconPicker.loading') }}
			</div>

			<!-- Icons tab -->
			<!-- eslint-disable vue/no-v-html -- SVG body from trusted generated data -->
			<div v-else-if="selectedTab === 'icons' && dataLoaded" :class="$style.content">
				<!-- Search active: flat filtered grid (no section headers) -->
				<template v-if="isSearching">
					<div v-if="filteredIcons.length > 0" :class="$style.iconGrid">
						<svg
							v-for="[name, icon] in filteredIcons"
							:key="name"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							:class="$style.icon"
							:style="selectedColor ? { color: `var(${selectedColor})` } : undefined"
							data-test-id="icon-picker-icon"
							:title="humanizeIconName(name)"
							:aria-label="humanizeIconName(name)"
							role="button"
							@click="selectIcon({ type: 'icon', value: name, color: selectedColor })"
							v-html="icon.body"
						/>
					</div>
					<div v-else :class="$style.emptyState" data-test-id="icon-picker-no-results">
						{{ t('iconPicker.search.noResults') }}
					</div>
				</template>
				<!-- Browse mode: icons grouped by category with section headers -->
				<template v-else>
					<template v-if="filteredIconSections.length > 0">
						<div
							v-for="section in filteredIconSections"
							:key="section.key"
							:class="$style.iconSection"
							role="group"
							:aria-labelledby="`icon-section-${section.key}`"
						>
							<div
								:id="`icon-section-${section.key}`"
								:class="$style.sectionHeader"
							>
								{{ t(section.labelKey) }}
							</div>
							<div :class="$style.iconGrid">
								<svg
									v-for="[name, icon] in section.icons"
									:key="name"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-linecap="round"
									stroke-linejoin="round"
									:class="$style.icon"
									:style="selectedColor ? { color: `var(${selectedColor})` } : undefined"
									data-test-id="icon-picker-icon"
									:title="humanizeIconName(name)"
									:aria-label="humanizeIconName(name)"
									role="button"
									@click="selectIcon({ type: 'icon', value: name, color: selectedColor })"
									v-html="icon.body"
								/>
							</div>
						</div>
					</template>
					<div v-else :class="$style.emptyState" data-test-id="icon-picker-no-results">
						{{ t('iconPicker.search.noResults') }}
					</div>
				</template>
			</div>

			<!-- Emojis tab -->
			<div v-else-if="selectedTab === 'emojis' && dataLoaded" :class="$style.content">
				<template v-if="filteredEmojiSections.length > 0">
					<div
						v-for="section in filteredEmojiSections"
						:key="section.key"
						:class="$style.emojiSection"
						role="group"
						:aria-labelledby="`emoji-section-${section.key}`"
					>
						<div
							:id="`emoji-section-${section.key}`"
							:class="$style.sectionHeader"
						>
							{{ t(section.labelKey) }}
						</div>
						<div :class="$style.emojiGrid">
							<span
								v-for="emoji in section.emojis"
								:key="emoji.u"
								:class="$style.emoji"
								data-test-id="icon-picker-emoji"
								role="button"
								:title="emoji.l"
								:aria-label="emoji.l"
								@click="selectIcon({ type: 'emoji', value: emoji.display })"
							>
								{{ emoji.display }}
							</span>
						</div>
					</div>
				</template>
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
		width: 20px;
		height: 20px;
	}
}

.emoji-button {
	padding: 0;
	font-size: 20px;
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
		display: flex;
		flex-direction: column;
		padding: 0 var(--spacing--2xs) var(--spacing--2xs);
		overflow-y: auto;
		max-height: 280px;
	}

	.iconGrid,
	.emojiGrid {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
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
		width: 20px;
		height: 20px;
		box-sizing: content-box;
		color: var(--color--text--tint-1);
		stroke-width: 1.5;

		&:hover {
			color: var(--color--text--shade-1);
		}
	}

	.emoji {
		font-size: 20px;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		overflow: hidden;
		font-family:
			'Segoe UI Emoji', 'Segoe UI Symbol', 'Segoe UI', 'Apple Color Emoji', 'Twemoji Mozilla',
			'Noto Color Emoji', 'Android Emoji', sans-serif;
	}

	.iconSection,
	.emojiSection {
		margin-bottom: var(--spacing--2xs);
	}

	.sectionHeader {
		position: sticky;
		top: 0;
		z-index: 1;
		padding: var(--spacing--4xs) 0;
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--bold);
		color: var(--color--text--tint-1);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background-color: var(--color--background--light-3);
	}

	.shuffleButton {
		display: inline-flex !important;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0 !important;
	}

	.shuffleIcon {
		width: 16px;
		height: 16px;
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
