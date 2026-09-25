<script lang="ts" setup>
import { N8nHoverCard, N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuPortal,
	ContextMenuRoot,
	ContextMenuTrigger,
	TabsList,
	TabsTrigger,
} from 'reka-ui';
import { computed, nextTick, reactive, ref, shallowRef, watch } from 'vue';
import { useTimeoutFn } from '@vueuse/core';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import { getWorkflow } from '@/app/api/workflows';
import TimeAgo from '@/app/components/TimeAgo.vue';
import type { ArtifactTab } from '../useCanvasPreview';

// Experiment cleanup: remove with openWorkflowInAssistant.
import ManualEditorButton from '@/experiments/openWorkflowInAssistant/components/ManualEditorButton.vue';

const props = withDefaults(
	defineProps<{
		tabs: ArtifactTab[];
		activeTabId?: string;
		isExpanded?: boolean;
		isExpandDisabled?: boolean;
		previewToggleLabel?: string;
	}>(),
	{
		isExpanded: false,
		isExpandDisabled: false,
		previewToggleLabel: undefined,
	},
);

const emit = defineEmits<{
	togglePreview: [];
	toggleExpanded: [];
}>();

const i18n = useI18n();
const clipboard = useClipboard();
const toast = useToast();
const rootStore = useRootStore();
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

	const activeTab = Array.from(tabList.querySelectorAll<HTMLElement>('[data-tab-id]')).find(
		(tab) => tab.dataset.tabId === tabId,
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

type WorkflowSummary = { updatedAt: string; published: boolean };
type HoverTarget = { tab: ArtifactTab; reference: HTMLElement };

// The AI and the user can both edit a workflow while its tab is open, so each
// hover refetches. The cached value shows until the fresh one arrives.
const workflowSummaries = reactive(new Map<string, WorkflowSummary>());
const hoveredTab = shallowRef<HoverTarget | null>(null);
const hoveredSummary = computed(() =>
	hoveredTab.value ? workflowSummaries.get(hoveredTab.value.tab.id) : undefined,
);

async function loadWorkflowSummary(workflowId: string) {
	try {
		const workflow = await getWorkflow(rootStore.restApiContext, workflowId);
		workflowSummaries.set(workflowId, {
			updatedAt: String(workflow.updatedAt),
			published: workflow.activeVersionId !== null,
		});
	} catch {
		// The card still shows the full name without the metadata.
	}
}

const TAB_HOVER_CARD_OPEN_DELAY_MS = 250;
// Long enough to cross the gap between two tabs, so the open card moves to the
// next tab instead of closing and waiting for the open delay again.
const TAB_HOVER_CARD_CLOSE_GRACE_MS = 100;

function setHoveredTab(target: HoverTarget) {
	hoveredTab.value = target;
	if (target.tab.type === 'workflow' && !target.tab.pending) {
		void loadWorkflowSummary(target.tab.id);
	}
}

const { start: startOpenTimer, stop: stopOpenTimer } = useTimeoutFn(
	setHoveredTab,
	TAB_HOVER_CARD_OPEN_DELAY_MS,
	{ immediate: false },
);

const { start: startCloseTimer, stop: stopCloseTimer } = useTimeoutFn(
	() => {
		hoveredTab.value = null;
	},
	TAB_HOVER_CARD_CLOSE_GRACE_MS,
	{ immediate: false },
);

function showTabHoverCard(tab: ArtifactTab, event: MouseEvent) {
	if (!(event.currentTarget instanceof HTMLElement)) return;
	const target = { tab, reference: event.currentTarget };
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
	hoveredTab.value = null;
}

function handleHoverCardOpenChange(open: boolean) {
	if (!open) hideTabHoverCard();
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
					<TabsTrigger
						:value="tab.id"
						:data-tab-id="tab.id"
						:class="$style.tab"
						@mouseenter="showTabHoverCard(tab, $event)"
						@mouseleave="scheduleHideTabHoverCard"
						@contextmenu="hideTabHoverCard"
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
					</div>
					<span
						v-if="hoveredSummary"
						:class="[$style.statusTag, { [$style.statusTagPublished]: hoveredSummary.published }]"
						data-test-id="instance-ai-tab-hover-card-status"
					>
						{{
							hoveredSummary.published
								? i18n.baseText('workflows.published')
								: i18n.baseText('instanceAi.previewTabBar.draft')
						}}
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
	padding: 0 var(--spacing--xs) 0 var(--spacing--2xs);
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
	--tab--background--hover: light-dark(var(--color--neutral-100), var(--color--neutral-900));
	--tab--background--active: light-dark(var(--color--neutral-150), var(--color--neutral-800));

	flex: 0 1 auto;
	min-width: 64px;
	max-width: 270px;
	height: var(--height--md);
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0 var(--spacing--xs);
	border: none;
	border-radius: var(--radius--2xs);
	background-color: transparent;
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	cursor: pointer;

	&:hover {
		background-color: var(--tab--background--hover);
	}

	&[data-state='active'] {
		color: var(--text-color);
		background-color: var(--tab--background--active);
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

.icon {
	flex-shrink: 0;

	.tab:not([data-state='active']) & {
		opacity: 0.6;
	}
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
