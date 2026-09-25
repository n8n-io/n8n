<script lang="ts" setup>
import { N8nDropdownMenu, N8nHoverCard, N8nIcon, N8nIconButton } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useI18n } from '@n8n/i18n';
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuPortal,
	ContextMenuRoot,
	ContextMenuTrigger,
	TabsList,
	TabsTrigger,
} from 'reka-ui';
import { computed, nextTick, ref, shallowRef, watch } from 'vue';
import { useTimeoutFn } from '@vueuse/core';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { DEBOUNCE_TIME, HOVER_DELAY } from '@/app/constants/durations';
import type { ArtifactTab } from '../useCanvasPreview';
import { hasTabSummary, useArtifactTabSummaries } from '../useArtifactTabSummaries';
import { useProjectResourceSearch } from '../composables/useProjectResourceSearch';
import { TAB_DRAG_IGNORE_ATTRIBUTE, useTabDragReorder } from '../composables/useTabDragReorder';

// Experiment cleanup: remove with openWorkflowInAssistant.
import ManualEditorButton from '@/experiments/openWorkflowInAssistant/components/ManualEditorButton.vue';

const props = withDefaults(
	defineProps<{
		tabs: ArtifactTab[];
		activeTabId?: string;
		isExpanded?: boolean;
		isExpandDisabled?: boolean;
		previewToggleLabel?: string;
		/** The thread's project. The new tab picker lists its resources. */
		projectId?: string;
	}>(),
	{
		isExpanded: false,
		isExpandDisabled: false,
		previewToggleLabel: undefined,
		projectId: undefined,
	},
);

const emit = defineEmits<{
	togglePreview: [];
	toggleExpanded: [];
	closeTab: [tabId: string];
	openTab: [tab: ArtifactTab];
	reorderTab: [tabId: string, toIndex: number];
}>();

const i18n = useI18n();
const clipboard = useClipboard();
const toast = useToast();
const tabListRef = ref<HTMLElement | null>(null);
const sizeToggleLabel = computed(() =>
	i18n.baseText(
		props.isExpanded ? 'instanceAi.previewTabBar.collapse' : 'instanceAi.previewTabBar.expand',
	),
);

function handleToggleExpanded() {
	if (props.isExpandDisabled) return;
	emit('toggleExpanded');
}

function getTabListElement() {
	const tabList = tabListRef.value;
	if (tabList instanceof HTMLElement) return tabList;
	return (tabList as { $el?: HTMLElement } | null)?.$el ?? null;
}

function scrollTabIntoView(tabId: string) {
	const tabList = getTabListElement();
	if (!tabList) return;

	// Measure the tab item, not the trigger, which is positioned inside it.
	const activeTab = Array.from(tabList.querySelectorAll<HTMLElement>('[data-tab-item-id]')).find(
		(tab) => tab.dataset.tabItemId === tabId,
	);
	if (!activeTab) return;

	const tabLeft = activeTab.offsetLeft;
	const tabRight = tabLeft + activeTab.offsetWidth;
	const visibleLeft = tabList.scrollLeft;
	const visibleRight = visibleLeft + tabList.clientWidth;

	const nextScrollLeft =
		tabLeft < visibleLeft
			? tabLeft
			: tabRight > visibleRight
				? tabRight - tabList.clientWidth
				: undefined;

	if (nextScrollLeft === undefined) return;
	if (typeof tabList.scrollTo === 'function') {
		tabList.scrollTo({ left: nextScrollLeft, behavior: 'smooth' });
	} else {
		tabList.scrollLeft = nextScrollLeft;
	}
}

// Bring the active tab into view when the selection changes (e.g. auto-switch
// on execution), without scrolling any outer app containers.
watch(
	() => props.activeTabId,
	(tabId) => {
		if (!tabId) return;
		void nextTick(() => {
			scrollTabIntoView(tabId);
		});
	},
);

function tabHref(tab: ArtifactTab): string | undefined {
	if (tab.type === 'workflow') return `/workflow/${tab.id}`;
	if (tab.type === 'data-table') {
		return tab.projectId ? `/projects/${tab.projectId}/datatables/${tab.id}` : '/home/datatables';
	}
	if (tab.type === 'agent') {
		return tab.projectId ? `/projects/${tab.projectId}/agents/${tab.id}` : '/home/agents';
	}
	return undefined;
}

function handleOpenInEditor(tab: ArtifactTab) {
	const href = tabHref(tab);
	if (!href) return;
	window.open(href, '_blank', 'noopener');
}

type HoverTarget = { tabId: string; reference: HTMLElement };

const { getSummary, refresh: refreshSummaries } = useArtifactTabSummaries(() => props.tabs);
const hoverTarget = shallowRef<HoverTarget | null>(null);
// Read the tab from the current props, so a rename shows at once while the card is open.
const hoveredTab = computed(() => {
	const target = hoverTarget.value;
	const tab = target && props.tabs.find(({ id }) => id === target.tabId);
	return tab ? { tab, reference: target.reference } : null;
});
const hoveredSummary = computed(() =>
	hoveredTab.value ? getSummary(hoveredTab.value.tab) : undefined,
);
const isHoveredSummaryLoading = computed(
	() =>
		!!hoveredTab.value && hasTabSummary(hoveredTab.value.tab) && hoveredSummary.value === undefined,
);
const hoveredStatus = computed(() => {
	const summary = hoveredSummary.value;
	if (!summary) return undefined;
	if (summary.type === 'workflow') {
		return {
			label: i18n.baseText(
				summary.published ? 'workflows.published' : 'instanceAi.previewTabBar.draft',
			),
			published: summary.published,
		};
	}
	return {
		label: i18n.baseText('dataTable.card.column.count', {
			adjustToNumber: summary.columnCount,
			interpolate: { count: summary.columnCount },
		}),
		published: false,
	};
});

function setHoveredTab(target: HoverTarget) {
	hoverTarget.value = target;
	// The tab can close while the open delay runs.
	if (!hoveredTab.value) {
		hoverTarget.value = null;
		return;
	}
	// Keep the stored details on screen while this refresh runs.
	void refreshSummaries([hoveredTab.value.tab]);
}

const { start: startOpenTimer, stop: stopOpenTimer } = useTimeoutFn(
	setHoveredTab,
	HOVER_DELAY.SHOW,
	{ immediate: false },
);

const { start: startCloseTimer, stop: stopCloseTimer } = useTimeoutFn(
	() => {
		hoverTarget.value = null;
	},
	// The grace lets the pointer cross the gap between tabs, so the open card
	// moves to the next tab instead of closing and waiting to open again.
	HOVER_DELAY.LEAVE,
	{ immediate: false },
);

function showTabHoverCard(tab: ArtifactTab, event: MouseEvent) {
	if (!(event.currentTarget instanceof HTMLElement)) return;
	if (tabDrag.draggedTabId.value !== undefined) return;
	const target = { tabId: tab.id, reference: event.currentTarget };
	stopCloseTimer();

	if (hoveredTab.value) {
		setHoveredTab(target);
	} else {
		startOpenTimer(target);
	}
}

function scheduleHideTabHoverCard() {
	stopOpenTimer();
	if (hoveredTab.value) startCloseTimer();
}

function hideTabHoverCard() {
	stopOpenTimer();
	stopCloseTimer();
	hoverTarget.value = null;
}

// A removed tab fires no mouseleave, so close the card when its tab is gone.
watch(hoveredTab, (tab) => {
	if (!tab && hoverTarget.value) hideTabHoverCard();
});

function handleHoverCardOpenChange(open: boolean) {
	if (!open) hideTabHoverCard();
}

// --- Reordering ---

const tabDrag = useTabDragReorder({
	getTabElements: () => {
		const tabList = getTabListElement();
		return tabList ? Array.from(tabList.querySelectorAll<HTMLElement>('[data-tab-item-id]')) : [];
	},
	onReorder: (tabId, toIndex) => emit('reorderTab', tabId, toIndex),
	onDragStart: () => hideTabHoverCard(),
});

function tabDragStyle(tabId: string) {
	const offset = tabDrag.offsets.value[tabId];
	return offset ? { transform: `translateX(${offset}px)` } : undefined;
}

// --- New tab picker ---

const isPickerOpen = ref(false);
const resourceSearch = useProjectResourceSearch({
	projectId: () => props.projectId,
	excludedTabs: () => props.tabs,
});
const pickerItems = computed(
	(): Array<DropdownMenuItemProps<string>> =>
		resourceSearch.results.value.map((resource) => ({
			id: `${resource.type}:${resource.id}`,
			label: resource.name,
			icon: { type: 'icon', value: resource.icon },
		})),
);

function handlePickerOpenChange(open: boolean) {
	isPickerOpen.value = open;
	if (open) void resourceSearch.search();
}

function handlePickerSelect(itemId: string) {
	const resource = resourceSearch.results.value.find(
		(result) => `${result.type}:${result.id}` === itemId,
	);
	if (resource) emit('openTab', resource);
}

async function handleCopyLink(tab: ArtifactTab) {
	const href = tabHref(tab);
	if (!href) return;
	const url = new URL(href, window.location.origin).toString();
	await clipboard.copy(url);
	toast.showMessage({ title: i18n.baseText('generic.copiedToClipboard'), type: 'success' });
}
</script>

<template>
	<div :class="$style.header">
		<N8nIconButton
			v-if="previewToggleLabel"
			icon="panel-right"
			variant="ghost"
			size="medium"
			:aria-label="previewToggleLabel"
			:title="previewToggleLabel"
			:aria-pressed="true"
			data-test-id="instance-ai-artifacts-preview-toggle"
			@click="emit('togglePreview')"
		/>
		<TabsList
			ref="tabListRef"
			:aria-label="i18n.baseText('instanceAi.artifactsPanel.title')"
			:class="$style.tabList"
		>
			<ContextMenuRoot v-for="tab in tabs" :key="tab.id">
				<ContextMenuTrigger as-child>
					<!-- The close button cannot sit inside the trigger button, so both share a wrapper. -->
					<div
						:class="[
							$style.tab,
							{
								[$style.tabActive]: tab.id === activeTabId,
								[$style.tabDragging]: tab.id === tabDrag.draggedTabId.value,
								[$style.tabMovable]: tabDrag.draggedTabId.value !== undefined,
							},
						]"
						:style="tabDragStyle(tab.id)"
						:data-tab-item-id="tab.id"
						@pointerdown="tabDrag.onPointerDown(tab.id, $event)"
						@mouseenter="showTabHoverCard(tab, $event)"
						@mouseleave="scheduleHideTabHoverCard"
						@contextmenu="hideTabHoverCard"
						@mousedown.middle.prevent
						@auxclick.middle.prevent="emit('closeTab', tab.id)"
					>
						<TabsTrigger
							:value="tab.id"
							:data-tab-id="tab.id"
							:class="$style.tabTrigger"
							@keydown.delete.prevent="emit('closeTab', tab.id)"
						>
							<N8nIcon
								v-if="tab.building"
								icon="spinner"
								size="large"
								spin
								:class="$style.icon"
								data-test-id="instance-ai-tab-building-spinner"
							/>
							<N8nIcon v-else :icon="tab.icon" size="large" :class="$style.icon" />
							<span :class="$style.label">{{ tab.name }}</span>
						</TabsTrigger>
						<span :class="$style.closeSlot">
							<N8nIconButton
								icon="x"
								variant="ghost"
								size="xsmall"
								:class="$style.closeButton"
								v-bind="{ [TAB_DRAG_IGNORE_ATTRIBUTE]: '' }"
								:aria-label="
									i18n.baseText('instanceAi.previewTabBar.closeTab', {
										interpolate: { name: tab.name },
									})
								"
								data-test-id="instance-ai-tab-close"
								@click.stop="emit('closeTab', tab.id)"
							/>
						</span>
					</div>
				</ContextMenuTrigger>
				<ContextMenuPortal>
					<ContextMenuContent :class="$style.contextMenu">
						<ContextMenuItem :class="$style.contextMenuItem" @select="handleOpenInEditor(tab)">
							<N8nIcon icon="external-link" size="small" />
							<span>{{ i18n.baseText('instanceAi.previewTabBar.openInEditor') }}</span>
						</ContextMenuItem>
						<ContextMenuItem :class="$style.contextMenuItem" @select="handleCopyLink(tab)">
							<N8nIcon icon="link" size="small" />
							<span>{{ i18n.baseText('instanceAi.previewTabBar.copyLink') }}</span>
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenuPortal>
			</ContextMenuRoot>
			<N8nDropdownMenu
				v-if="projectId"
				:model-value="isPickerOpen"
				:items="pickerItems"
				:loading="resourceSearch.isLoading.value && pickerItems.length === 0"
				:search-placeholder="i18n.baseText('instanceAi.previewTabBar.searchResources')"
				:search-debounce="getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH)"
				:empty-text="i18n.baseText('instanceAi.previewTabBar.noResources')"
				:extra-popper-class="$style.picker"
				max-height="320px"
				placement="bottom-start"
				content-test-id="instance-ai-tab-picker"
				searchable
				@update:model-value="handlePickerOpenChange"
				@search="resourceSearch.search"
				@select="handlePickerSelect"
			>
				<template #trigger>
					<N8nIconButton
						icon="plus"
						variant="ghost"
						size="small"
						:class="[$style.newTabButton, { [$style.newTabButtonOpen]: isPickerOpen }]"
						:aria-label="i18n.baseText('instanceAi.previewTabBar.newTab')"
						data-test-id="instance-ai-new-tab-button"
					/>
				</template>
			</N8nDropdownMenu>
		</TabsList>
		<!-- One shared card follows the hovered tab, so each tab does not mount its own. -->
		<N8nHoverCard
			:open="!!hoveredTab"
			hide-trigger
			:reference="hoveredTab?.reference"
			side="bottom"
			align="center"
			:side-offset="4"
			:open-delay="0"
			:close-delay="0"
			:content-class="$style.hoverCard"
			@update:open="handleHoverCardOpenChange"
		>
			<template #content>
				<div
					v-if="hoveredTab"
					:class="$style.hoverCardBody"
					data-test-id="instance-ai-tab-hover-card"
				>
					<div :class="$style.hoverCardText">
						<span :class="$style.hoverCardName">{{ hoveredTab.tab.name }}</span>
						<span v-if="hoveredSummary" :class="$style.hoverCardMeta">
							{{ i18n.baseText('instanceAi.previewTabBar.edited') }}
							<TimeAgo :date="hoveredSummary.updatedAt" />
						</span>
						<!-- Placeholders keep the card size stable until the first load ends. -->
						<span
							v-else-if="isHoveredSummaryLoading"
							:class="[$style.hoverCardMeta, $style.placeholder, $style.placeholderMeta]"
							data-test-id="instance-ai-tab-hover-card-placeholder"
						/>
					</div>
					<span
						v-if="isHoveredSummaryLoading"
						:class="[$style.statusTag, $style.placeholder, $style.placeholderTag]"
					/>
					<span
						v-else-if="hoveredStatus"
						:class="[$style.statusTag, { [$style.statusTagPublished]: hoveredStatus.published }]"
						data-test-id="instance-ai-tab-hover-card-status"
					>
						{{ hoveredStatus.label }}
					</span>
				</div>
			</template>
		</N8nHoverCard>
		<!-- Experiment cleanup: remove with openWorkflowInAssistant. -->
		<ManualEditorButton :tabs="tabs" :active-tab-id="activeTabId" />
		<N8nIconButton
			:icon="isExpanded ? 'minimize-2' : 'maximize-2'"
			variant="ghost"
			size="medium"
			:disabled="isExpandDisabled"
			:aria-label="sizeToggleLabel"
			:title="isExpandDisabled ? undefined : sizeToggleLabel"
			data-test-id="instance-ai-preview-expand-toggle"
			@click="handleToggleExpanded"
		/>
	</div>
</template>

<style lang="scss" module>
@property --right--fade {
	syntax: '<length>';
	inherits: false;
	initial-value: 0;
}

@property --label--fade {
	syntax: '<length>';
	inherits: false;
	initial-value: 0;
}

@keyframes scrollfade {
	0%,
	90% {
		--right--fade: 3rem;
	}
	99.9% {
		--right--fade: 0;
	}
}

// Only a label that overflows gets an active scroll timeline, so short labels stay unfaded.
@keyframes labelfade {
	from,
	to {
		--label--fade: var(--spacing--xl);
	}
}

.header {
	flex-shrink: 0;
	height: 49px;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--3xs) 0 var(--spacing--2xs);
	border-bottom: 1px solid var(--border-color--subtle);
	background-color: var(--background--surface);
}

.tabList {
	flex: 1 1 0;
	min-width: 0;
	height: 100%;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	// With the header gap, this leaves 8px between the preview toggle and the first tab.
	padding: 0 var(--spacing--xs) 0 var(--spacing--4xs);
	overflow-x: auto;
	scrollbar-width: none;
	position: relative;

	// Scroll-driven right edge fade only where supported.
	@supports (animation-timeline: scroll()) {
		mask: linear-gradient(to right, #ffff 0 calc(100% - var(--right--fade)), #0000);
		animation: scrollfade;
		animation-timeline: --scrollfade;
		scroll-timeline: --scrollfade x;
	}
}

.tab {
	--tab--background: transparent;

	position: relative;
	flex: 0 1 auto;
	min-width: 64px;
	max-width: 270px;
	height: var(--height--md);
	display: flex;
	border-radius: var(--radius--2xs);
	background-color: var(--tab--background);

	// The dark surface is neutral-900 already, so a fixed neutral would not show on hover.
	&:hover {
		--tab--background: var(--background--hover);
	}

	&.tabActive {
		--tab--background: light-dark(var(--color--neutral-150), var(--color--neutral-800));
	}

	// While a drag runs, the other tabs slide aside. There is no transition after
	// the drop, so the tabs land in their new places at once.
	&.tabMovable {
		transition: transform 150ms ease;
	}

	&.tabDragging {
		z-index: 1;
		transition: none;
		cursor: grabbing;
	}

	// Show the close button on hover and while it has keyboard focus.
	&:hover .closeSlot,
	.closeSlot:focus-within {
		opacity: 1;
	}

	// Only the button takes the pointer. A click on the rest of the cover reaches the trigger below.
	&:hover .closeButton,
	.closeSlot:focus-within .closeButton {
		pointer-events: auto;
	}
}

.tabTrigger {
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0 var(--spacing--xs);
	border: none;
	border-radius: inherit;
	background-color: transparent;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	cursor: pointer;

	&[data-state='active'] {
		color: var(--text-color);
	}

	.label {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;

		@supports (animation-timeline: scroll()) {
			mask: linear-gradient(to left, #0000 0, #ffff var(--label--fade));
			animation: labelfade linear;
			animation-timeline: --labelfade;
			scroll-timeline: --labelfade x;
		}

		@supports not (animation-timeline: scroll()) {
			text-overflow: ellipsis;
		}
	}
}

// Covers the end of the label with the tab background, so the tab keeps its width.
// The hover background is translucent, so it is layered on the surface to hide the label.
.closeSlot {
	--close-slot--background:
		linear-gradient(var(--tab--background), var(--tab--background)), var(--background--surface);

	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	padding-right: var(--spacing--4xs);
	border-radius: 0 var(--radius--2xs) var(--radius--2xs) 0;
	background: var(--close-slot--background);
	opacity: 0;
	pointer-events: none;

	&::before {
		content: '';
		position: absolute;
		top: 0;
		right: 100%;
		bottom: 0;
		width: var(--spacing--sm);
		background: var(--close-slot--background);
		mask-image: linear-gradient(to left, #000, #0000);
	}
}

.icon {
	flex-shrink: 0;
}

.hoverCard {
	width: 238px;
	padding: var(--spacing--2xs);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--xl);
	box-shadow: var(--shadow--sm);
}

.hoverCardBody {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--3xs);
}

.hoverCardText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: 0 var(--spacing--4xs);
	line-height: var(--line-height--lg);
	word-break: break-word;
}

.hoverCardName {
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.hoverCardMeta {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.placeholder {
	border-radius: var(--radius);
	background-color: light-dark(var(--color--neutral-100), var(--color--neutral-800));

	// Keeps the line box of the text it replaces, so the card does not resize.
	&::before {
		content: '\00a0';
	}
}

.placeholderMeta {
	width: 60%;
}

.placeholderTag {
	width: 4rem;
}

// N8nBadge always renders a medium-weight label, but the design uses regular weight.
.statusTag {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	background-color: light-dark(var(--color--neutral-100), var(--color--neutral-700));
	color: light-dark(var(--color--neutral-800), var(--color--neutral-white));
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--lg);
	white-space: nowrap;
}

.statusTagPublished {
	background-color: light-dark(var(--color--green-100), var(--color--green-800));
	color: light-dark(var(--color--green-800), var(--color--neutral-white));
}

.newTabButton {
	flex-shrink: 0;
}

// Keep the hover background while the picker is open, as in the design.
.newTabButtonOpen {
	background-color: var(--background--hover);
}

.picker {
	width: 200px;
}

.contextMenu {
	min-width: 180px;
	background-color: var(--color--foreground--tint-2);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--3xs);
	box-shadow:
		rgba(0, 0, 0, 0.1) 0 10px 15px -3px,
		rgba(0, 0, 0, 0.05) 0 4px 6px -2px;
	z-index: 9999;
}

.contextMenuItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	height: var(--spacing--xl);
	padding: 0 var(--spacing--2xs);
	border-radius: var(--radius);
	cursor: pointer;
	user-select: none;
	font-size: var(--font-size--2xs);
	line-height: 1;
	color: var(--color--text);
	outline: none;

	&[data-highlighted] {
		background-color: var(--color--foreground--tint-1);
	}
}
</style>
