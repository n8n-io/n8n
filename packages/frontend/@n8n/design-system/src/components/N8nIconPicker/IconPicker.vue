<script lang="ts" setup>
import { isEmojiSupported } from 'is-emoji-supported';
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nIconButton from '../N8nIconButton';
import N8nInput from '../N8nInput';
import N8nPopover from '../N8nPopover';
import N8nTabs from '../N8nTabs';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';
import type { EmojiSection } from './emojiData';
import IconColorPicker from './IconColorPicker.vue';
import {
	getAdjacentPickerCoordinate,
	getPickerCoordinates,
	getPickerDirection,
	getPickerOptionId,
	humanizeIconName,
	isSamePickerCoordinate,
	type PickerCoordinate,
} from './IconPicker.utils';
import { ICON_PICKER_BLOCKLIST } from './iconPickerBlocklist';
import type { LucideIconMeta } from './lucideIconData';
import SkinTonePicker from './SkinTonePicker.vue';
import type { IconOrEmoji } from './types';
import { useIconPickerSearch } from './useIconPickerSearch';
import {
	buildEmojiRows,
	buildIconBrowseRows,
	buildIconSearchRows,
	type IconPickerVirtualRow,
} from './useIconPickerVirtualRows';

import IconShuffle from '~icons/lucide/shuffle';

/**
 * Icon picker with support for all Lucide icons and emojis.
 * Search metadata (keywords, categories) and emoji data are lazy data modules,
 * prefetched on hover over the trigger button for instant popup open.
 * Icon SVG bodies load on demand in hash-bucketed chunks via the IconBodyLoader
 * injected into N8nIcon (see src/icons/lucide), deduplicated per bucket.
 * Emojis use emojibase-data with categories and skin tone support.
 */
defineOptions({ name: 'N8nIconPicker' });

const SKIN_TONE_STORAGE_KEY = 'n8n-emoji-skin-tone';
const INITIAL_ROW_COUNT = 10;
const ROW_BATCH_SIZE = 10;

type TabType = 'icons' | 'emojis';

type Props = {
	buttonTooltip: string;
	buttonSize?: 'small' | 'large' | 'xlarge';
	isReadOnly?: boolean;
	/** Hide emoji controls and keep the picker on icons. */
	iconsOnly?: boolean;
	/** Show the icon color picker. Only enable for consumers that persist and render the color. */
	showColorPicker?: boolean;
	/** Additional CSS class(es) for the outer container element */
	containerClass?: string | Record<string, boolean> | Array<string | Record<string, boolean>>;
	/** Additional CSS class(es) for the trigger button */
	buttonClass?: string | Record<string, boolean> | Array<string | Record<string, boolean>>;
	/** The default tab to show when the picker is opened */
	defaultTab?: TabType;
};

const { t } = useI18n();

const props = withDefaults(defineProps<Props>(), {
	buttonSize: 'large',
	iconsOnly: false,
	showColorPicker: false,
	containerClass: undefined,
	buttonClass: undefined,
	defaultTab: 'icons',
});

const model = defineModel<IconOrEmoji>({ default: { type: 'icon', value: 'smile' } });

const lucideData = ref<Record<string, LucideIconMeta> | null>(null);
const rawEmojiSections = ref<EmojiSection[]>([]);
const iconsLoaded = ref(false);
const iconsLoading = ref(false);
const emojisLoaded = ref(false);
const emojisLoading = ref(false);
const popupVisible = ref(false);
const selectedTab = ref<TabType>(props.defaultTab);
const searchQuery = ref('');

const supportedEmojiSections = computed<EmojiSection[]>(() => {
	return rawEmojiSections.value
		.map((section) => ({
			...section,
			emojis: section.emojis.filter((e) => isEmojiSupported(e.u)),
		}))
		.filter((section) => section.emojis.length > 0);
});

const availableLucideData = computed<Record<string, LucideIconMeta> | null>(() => {
	if (!lucideData.value) return null;
	return Object.fromEntries(
		Object.entries(lucideData.value).filter(([name]) => !ICON_PICKER_BLOCKLIST.has(name)),
	);
});

/** Load Icons/Emojis seperately so we don't block the thread. Both load on hover so render is instant. */
async function loadIconData() {
	if (iconsLoaded.value || iconsLoading.value) return;
	iconsLoading.value = true;
	try {
		const module = await import('./lucideIconData');
		lucideData.value = module.lucideIcons;
		iconsLoaded.value = true;
	} finally {
		iconsLoading.value = false;
	}
}

async function loadEmojiData() {
	if (props.iconsOnly) return;
	if (emojisLoaded.value || emojisLoading.value) return;
	emojisLoading.value = true;
	try {
		const module = await import('./emojiData');
		rawEmojiSections.value = module.emojiSections;
		emojisLoaded.value = true;
	} finally {
		emojisLoading.value = false;
	}
}

const tabs = computed<Array<{ value: string; label: string }>>(() => [
	{ value: 'icons', label: t('iconPicker.tabs.icons') },
	...(props.iconsOnly ? [] : [{ value: 'emojis', label: t('iconPicker.tabs.emojis') }]),
]);

const selectedCategory = ref<string | null>(null);
const selectedColor = ref<string | undefined>(
	props.showColorPicker && model.value.type === 'icon' ? model.value.color : undefined,
);
const buttonIconName = computed<IconName>(() =>
	model.value.type === 'icon' ? (model.value.value as IconName) : 'smile',
);
const selectedSkinTone = ref<number>(
	parseInt(localStorage.getItem(SKIN_TONE_STORAGE_KEY) ?? '0', 10) || 0,
);

const searchInputRef = ref<InstanceType<typeof N8nInput>>();
const popupRef = ref<HTMLElement>();
const colorPickerRef = ref<InstanceType<typeof IconColorPicker>>();
const skinTonePickerRef = ref<InstanceType<typeof SkinTonePicker>>();
const itemTooltip = ref<{ label: string; left: number; top: number } | null>(null);

const { filteredIcons, filteredIconSections, filteredEmojiSections } = useIconPickerSearch(
	availableLucideData,
	supportedEmojiSections,
	searchQuery,
	selectedCategory,
	selectedSkinTone,
);

const isSearching = computed(() => searchQuery.value.trim().length > 0);
const iconRows = computed<IconPickerVirtualRow[]>(() =>
	isSearching.value
		? buildIconSearchRows(filteredIcons.value)
		: buildIconBrowseRows(filteredIconSections.value),
);
const emojiRows = computed<IconPickerVirtualRow[]>(() =>
	buildEmojiRows(filteredEmojiSections.value),
);

/** Progressively render first set of rows for instant view. Alternative to virtualisation which breaks key navigation and adds overhead/deps. */
const activeRows = computed(function getActiveRows() {
	return selectedTab.value === 'icons' ? iconRows.value : emojiRows.value;
});
const activeDataLoaded = computed(function getActiveDataLoaded() {
	return selectedTab.value === 'icons' ? iconsLoaded.value : emojisLoaded.value;
});
const activeDataLoading = computed(function getActiveDataLoading() {
	return selectedTab.value === 'icons' ? iconsLoading.value : emojisLoading.value;
});
const renderedRowCount = ref(INITIAL_ROW_COUNT);
const activeCoordinate = ref<PickerCoordinate | null>(null);
const activeDescendantId = computed(function getActiveDescendantId() {
	if (!activeCoordinate.value) return undefined;
	return getPickerOptionId(activeCoordinate.value);
});
const visibleRows = computed(function getVisibleRows() {
	return activeRows.value.slice(0, renderedRowCount.value);
});
let renderFrame: number | undefined;

function renderNextBatch() {
	if (!popupVisible.value) return;

	renderedRowCount.value = Math.min(
		renderedRowCount.value + ROW_BATCH_SIZE,
		activeRows.value.length,
	);

	if (renderedRowCount.value < activeRows.value.length) {
		renderFrame = requestAnimationFrame(renderNextBatch);
	}
}

function startProgressiveRender() {
	if (renderFrame !== undefined) cancelAnimationFrame(renderFrame);
	renderedRowCount.value = INITIAL_ROW_COUNT;

	if (renderedRowCount.value < activeRows.value.length) {
		renderFrame = requestAnimationFrame(renderNextBatch);
	}
}

function loadActiveTabData() {
	if (selectedTab.value === 'icons') {
		void loadIconData();
	} else {
		void loadEmojiData();
	}
}

function handleTabsPointerOver(event: PointerEvent) {
	const target = event.target;
	if (target instanceof Element && target.closest('[data-test-id="tab-emojis"]')) {
		void loadEmojiData();
	} else {
		void loadIconData();
	}
}

const selectIcon = (value: IconOrEmoji) => {
	model.value = value;
	popupVisible.value = false;
};

async function handlePopupOpen() {
	activeCoordinate.value = null;
	selectedTab.value = !props.iconsOnly && model.value.type === 'emoji' ? 'emojis' : 'icons';
	searchQuery.value = '';
	selectedCategory.value = null;
	selectedColor.value =
		props.showColorPicker && model.value.type === 'icon' ? model.value.color : undefined;
	loadActiveTabData();
	startProgressiveRender();
	await nextTick();
	focusSearchInput();
}

function focusSearchInput() {
	searchInputRef.value?.focus();
}

/** Custom tooltip is needed so we don't render 1,000+ N8nToolips. Instead we render a custom element and position it over the focused element. */
function showItemTooltip(event: MouseEvent | FocusEvent, label: string) {
	const target = event.currentTarget;
	if (!(target instanceof HTMLElement)) return;
	showItemTooltipForElement(target, label);
}

function showItemTooltipForElement(target: HTMLElement, label: string) {
	const rect = target.getBoundingClientRect();
	itemTooltip.value = {
		label,
		left: rect.left + rect.width / 2,
		top: rect.top,
	};
}

function hideItemTooltip() {
	itemTooltip.value = null;
}

watch(popupVisible, (isOpen) => {
	if (isOpen) void handlePopupOpen();
});

watch(selectedSkinTone, (tone) => {
	localStorage.setItem(SKIN_TONE_STORAGE_KEY, String(tone));
});

watch(selectedTab, async () => {
	loadActiveTabData();
	await nextTick();
	focusSearchInput();
});

watch(activeRows, function handleActiveRowsChange() {
	activeCoordinate.value = null;
	hideItemTooltip();
	if (popupVisible.value) startProgressiveRender();
});

onBeforeUnmount(function cancelProgressiveRender() {
	if (renderFrame !== undefined) cancelAnimationFrame(renderFrame);
});

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

/** Finds the correct item from key events */
async function activatePickerItem(coordinate: PickerCoordinate) {
	activeCoordinate.value = coordinate;
	renderedRowCount.value = Math.max(renderedRowCount.value, coordinate.row + 1);
	await nextTick();

	const item = popupRef.value?.querySelector<HTMLElement>(`#${getPickerOptionId(coordinate)}`);
	const scrollArea = item?.closest<HTMLElement>('[data-icon-picker-scroll-area]');
	if (!item || !scrollArea) return;

	const itemRect = item.getBoundingClientRect();
	const scrollAreaRect = scrollArea.getBoundingClientRect();
	if (itemRect.top < scrollAreaRect.top || itemRect.bottom > scrollAreaRect.bottom) {
		item.scrollIntoView({ block: 'nearest' });
	}
}

function selectActiveItem() {
	if (!activeCoordinate.value) return;

	const row = activeRows.value[activeCoordinate.value.row];
	if (row?.type === 'icon-row') {
		const name = row.iconNames[activeCoordinate.value.column];
		if (name) selectIcon({ type: 'icon', value: name, color: selectedColor.value });
	} else if (row?.type === 'emoji-row') {
		const emoji = row.emojis[activeCoordinate.value.column];
		if (emoji) selectIcon({ type: 'emoji', value: emoji.display });
	}
}

function handlePickerKeydown(event: KeyboardEvent) {
	const target = event.target;
	if (!(target instanceof HTMLElement)) return;
	if (!target.closest('[data-test-id="icon-picker-search"]')) return;

	if (event.key === 'Enter' && activeCoordinate.value) {
		event.preventDefault();
		selectActiveItem();
		return;
	}

	if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

	hideItemTooltip();
	const coordinates = getPickerCoordinates(activeRows.value);
	if (coordinates.length === 0) return;

	event.preventDefault();
	if (!activeCoordinate.value) {
		const coordinate =
			event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? coordinates.at(-1) : coordinates[0];
		if (coordinate) void activatePickerItem(coordinate);
		return;
	}

	const direction = getPickerDirection(event.key);
	if (!direction) return;

	const nextCoordinate = getAdjacentPickerCoordinate(
		activeRows.value,
		activeCoordinate.value,
		direction,
	);
	if (nextCoordinate) void activatePickerItem(nextCoordinate);
}

async function handlePickerKeyup(event: KeyboardEvent) {
	if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
	if (!activeCoordinate.value) return;

	await nextTick();
	const item = popupRef.value?.querySelector<HTMLElement>(
		`#${getPickerOptionId(activeCoordinate.value)}`,
	);
	if (item) showItemTooltipForElement(item, item.getAttribute('aria-label') ?? '');
}
</script>

<template>
	<N8nPopover
		v-model:open="popupVisible"
		:content-class="[$style.popup, props.iconsOnly ? $style.iconsOnly : ''].join(' ')"
		:enable-scrolling="false"
		:suppress-auto-focus="true"
		width="400px"
	>
		<template #trigger>
			<div
				:class="[
					{
						[$style.container]: true,
						[$style.isReadOnly]: isReadOnly,
						[$style[props.buttonSize]]: true,
					},
					containerClass,
				]"
				@pointerenter="loadIconData"
			>
				<N8nTooltip placement="top" data-test-id="icon-picker-tooltip" :disabled="isReadOnly">
					<template #content>
						{{ props.buttonTooltip ?? t('iconPicker.button.defaultToolTip') }}
					</template>
					<N8nIconButton
						v-if="model.type === 'icon'"
						:class="[$style['icon-button'], buttonClass]"
						:icon="buttonIconName"
						:size="buttonSize"
						icon-only
						:disabled="isReadOnly"
						variant="subtle"
						:aria-label="props.buttonTooltip ?? t('iconPicker.button.defaultToolTip')"
						:aria-expanded="popupVisible"
						aria-haspopup="true"
						data-test-id="icon-picker-button"
						:style="
							model.type === 'icon' && model.color ? { color: `var(${model.color})` } : undefined
						"
						@click.stop="popupVisible = !popupVisible"
					/>
					<N8nButton
						v-else-if="model.type === 'emoji'"
						:class="[$style['emoji-button'], buttonClass]"
						:size="buttonSize"
						icon-only
						variant="subtle"
						:aria-label="props.buttonTooltip ?? t('iconPicker.button.defaultToolTip')"
						:aria-expanded="popupVisible"
						aria-haspopup="true"
						data-test-id="icon-picker-button"
						:disabled="isReadOnly"
						@click.stop="popupVisible = !popupVisible"
					>
						{{ model.value }}
					</N8nButton>
				</N8nTooltip>
			</div>
		</template>
		<template #content>
			<div
				v-if="popupVisible"
				ref="popupRef"
				:class="{ [$style.iconsOnly]: props.iconsOnly }"
				data-test-id="icon-picker-popup"
				@keydown="handlePickerKeydown"
				@keyup="handlePickerKeyup"
			>
				<Teleport to="body">
					<div
						v-if="itemTooltip"
						role="tooltip"
						:class="$style.itemTooltip"
						:style="{ left: `${itemTooltip.left}px`, top: `${itemTooltip.top}px` }"
					>
						{{ itemTooltip.label }}
					</div>
				</Teleport>
				<div v-if="!props.iconsOnly" :class="$style.tabs" @pointerover="handleTabsPointerOver">
					<N8nTabs v-model="selectedTab" :options="tabs" data-test-id="icon-picker-tabs" />
				</div>

				<!-- Search row -->
				<div :class="$style.searchRow">
					<N8nInput
						ref="searchInputRef"
						v-model="searchQuery"
						:placeholder="t('iconPicker.search.placeholder')"
						clearable
						size="medium"
						role="combobox"
						aria-autocomplete="list"
						aria-controls="icon-picker-options"
						:aria-expanded="popupVisible"
						:aria-activedescendant="activeDescendantId"
						data-test-id="icon-picker-search"
					>
						<template #prefix>
							<N8nIcon icon="search" :size="14" />
						</template>
					</N8nInput>
					<N8nTooltip
						v-if="selectedTab === 'icons' && showColorPicker"
						placement="top"
						:disabled="colorPickerRef?.isOpen"
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
						v-if="!props.iconsOnly && selectedTab === 'emojis'"
						placement="top"
						:disabled="skinTonePickerRef?.isOpen"
					>
						<template #content>
							{{ t('iconPicker.skinTone.selectSkinTone') }}
						</template>
						<SkinTonePicker ref="skinTonePickerRef" v-model="selectedSkinTone" />
					</N8nTooltip>
					<N8nTooltip placement="top">
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
				<div
					v-if="activeDataLoading"
					:class="$style.loadingState"
					data-test-id="icon-picker-loading"
				>
					{{ t('iconPicker.loading') }}
				</div>

				<!-- Icons tab -->
				<div v-else-if="selectedTab === 'icons' && activeDataLoaded" :class="$style.content">
					<div
						v-if="visibleRows.length > 0"
						id="icon-picker-options"
						role="grid"
						:class="$style.scrollArea"
						data-icon-picker-scroll-area
					>
						<template v-for="(item, rowIndex) in visibleRows" :key="item.id">
							<div v-if="item.type === 'header'" :class="$style.sectionHeaderRow">
								<N8nText step="xs" bold color="text-light">
									{{ t(item.labelKey) }}
								</N8nText>
							</div>
							<div v-else-if="item.type === 'icon-row'" role="row" :class="$style.iconGridRow">
								<N8nButton
									v-for="(name, columnIndex) in item.iconNames"
									:key="name"
									variant="ghost"
									size="medium"
									icon-only
									:style="selectedColor ? { color: `var(${selectedColor})` } : undefined"
									:id="getPickerOptionId({ row: rowIndex, column: columnIndex })"
									role="gridcell"
									tabindex="-1"
									data-test-id="icon-picker-icon"
									:data-active="
										isSamePickerCoordinate(activeCoordinate, {
											row: rowIndex,
											column: columnIndex,
										}) || undefined
									"
									:data-picker-row="rowIndex"
									:data-picker-column="columnIndex"
									:aria-label="humanizeIconName(name)"
									@mouseenter="showItemTooltip($event, humanizeIconName(name))"
									@mouseleave="hideItemTooltip"
									@focus="showItemTooltip($event, humanizeIconName(name))"
									@blur="hideItemTooltip"
									@click="selectIcon({ type: 'icon', value: name, color: selectedColor })"
								>
									<N8nIcon :icon="name" :size="20" />
								</N8nButton>
							</div>
						</template>
					</div>
					<div v-else :class="$style.emptyState" data-test-id="icon-picker-no-results">
						{{ t('iconPicker.search.noResults') }}
					</div>
				</div>

				<!-- Emojis tab -->
				<div
					v-else-if="!props.iconsOnly && selectedTab === 'emojis' && activeDataLoaded"
					:class="$style.content"
				>
					<div
						v-if="visibleRows.length > 0"
						id="icon-picker-options"
						role="grid"
						:class="$style.scrollArea"
						data-icon-picker-scroll-area
					>
						<template v-for="(item, rowIndex) in visibleRows" :key="item.id">
							<div v-if="item.type === 'header'" :class="$style.sectionHeaderRow">
								<N8nText step="xs" bold color="text-light">
									{{ t(item.labelKey) }}
								</N8nText>
							</div>
							<div v-else-if="item.type === 'emoji-row'" role="row" :class="$style.emojiGridRow">
								<N8nButton
									v-for="(emoji, columnIndex) in item.emojis"
									:key="emoji.u"
									variant="ghost"
									size="medium"
									icon-only
									:id="getPickerOptionId({ row: rowIndex, column: columnIndex })"
									role="gridcell"
									tabindex="-1"
									data-test-id="icon-picker-emoji"
									:data-active="
										isSamePickerCoordinate(activeCoordinate, {
											row: rowIndex,
											column: columnIndex,
										}) || undefined
									"
									:data-picker-row="rowIndex"
									:data-picker-column="columnIndex"
									:aria-label="emoji.l"
									@mouseenter="showItemTooltip($event, emoji.l)"
									@mouseleave="hideItemTooltip"
									@focus="showItemTooltip($event, emoji.l)"
									@blur="hideItemTooltip"
									@click="selectIcon({ type: 'emoji', value: emoji.display })"
								>
									<span :class="$style.emoji">{{ emoji.display }}</span>
								</N8nButton>
							</div>
						</template>
					</div>
					<div v-else :class="$style.emptyState" data-test-id="icon-picker-no-results">
						{{ t('iconPicker.search.noResults') }}
					</div>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style module lang="scss">
@use '../../css/common/var';
@use '../../css/mixins/focus';
@use '../../css/mixins/mixins' as scrollbar-mixins;

.container {
	position: relative;
	width: fit-content;
}

.itemTooltip {
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
	position: fixed;
	z-index: var.$index-tooltip;
	transform: translate(-50%, calc(-100% - var(--spacing--2xs)));
	max-width: 180px;
	min-height: var(--height--sm);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border-radius: var(--radius--xs);
	background: var(--color--neutral-black);
	color: var(--color--neutral-100);
	box-shadow: var(--shadow--sm);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	text-align: center;
	overflow-wrap: anywhere;
	pointer-events: none;
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

		.xlarge & {
			width: 24px;
			height: 24px;
		}

		.xxlarge & {
			width: 32px;
			height: 32px;
		}
	}
}

.emoji-button {
	padding: 0;
	font-size: 24px;

	.small & {
		font-size: 18px;
	}

	.xlarge & {
		font-size: 32px;
	}

	.xxlarge & {
		font-size: 40px;
	}
}

.popup {
	display: flex;
	flex-direction: column;
	overflow: hidden;

	.tabs {
		display: flex;
		justify-content: flex-end;
		flex-direction: column;
		padding-inline: var(--spacing--2xs);
		border-bottom: var(--border);
		height: var(--height--lg);
	}

	.searchRow {
		display: flex;
		align-items: center;
		gap: var(--spacing--2xs);
		padding: var(--spacing--2xs);

		> :first-child {
			flex: 1;
			min-width: 0;
		}
	}

	.content {
		height: 400px;
		overflow: hidden;
	}

	.scrollArea {
		height: 100%;
		padding: 0 var(--spacing--2xs);
		overflow-x: hidden;
		overflow-y: auto;
		@include scrollbar-mixins.scroll-mask(bottom);
		@include scrollbar-mixins.hoverable-scroll-bar;
	}

	.sectionHeaderRow {
		padding-block: var(--spacing--2xs);
	}

	.iconGridRow,
	.emojiGridRow {
		display: grid;
		grid-template-columns: repeat(14, minmax(0, 1fr));
	}

	[data-active='true'] {
		@include focus.focus-ring;
		--button--border-color: var(--focus--border-color) !important;
		background-color: var(--button--color--background-hover);
		box-shadow:
			inset var(--button--border--shadow--hover),
			var(--button--shadow--hover);
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
