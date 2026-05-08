<script lang="ts" setup>
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuPortal,
	ContextMenuRoot,
	ContextMenuTrigger,
	TabsIndicator,
	TabsList,
	TabsTrigger,
} from 'reka-ui';
import { nextTick, watch } from 'vue';
import { useClipboard } from '@/app/composables/useClipboard';
import { useToast } from '@/app/composables/useToast';
import type { ArtifactTab } from '../useCanvasPreview';

const props = defineProps<{
	tabs: ArtifactTab[];
	activeTabId?: string;
}>();

const emit = defineEmits<{
	close: [];
}>();

const i18n = useI18n();
const clipboard = useClipboard();
const toast = useToast();

// Bring the active tab into view when the selection changes (e.g. auto-switch
// on execution). scrollIntoView walks up to the nearest scroll container.
watch(
	() => props.activeTabId,
	(tabId) => {
		if (!tabId) return;
		void nextTick(() => {
			const el = document.querySelector<HTMLElement>(`[data-tab-id="${tabId}"]`);
			el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
		});
	},
);

function tabHref(tab: ArtifactTab): string | undefined {
	if (tab.type === 'workflow') return `/workflow/${tab.id}`;
	if (tab.type === 'data-table') {
		return tab.projectId ? `/projects/${tab.projectId}/datatables/${tab.id}` : '/home/datatables';
	}
	return undefined;
}

function handleOpenInEditor(tab: ArtifactTab) {
	const href = tabHref(tab);
	if (!href) return;
	window.open(href, '_blank', 'noopener');
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
			icon="chevrons-right"
			variant="ghost"
			size="medium"
			:aria-label="i18n.baseText('instanceAi.previewTabBar.collapse')"
			:title="i18n.baseText('instanceAi.previewTabBar.collapse')"
			data-test-id="instance-ai-preview-close"
			@click="emit('close')"
		/>
		<TabsList
			:aria-label="i18n.baseText('instanceAi.artifactsPanel.title')"
			:class="$style.tabList"
		>
			<TabsIndicator :class="$style.tabsIndicator">
				<div :class="$style.tabsIndicatorBar" />
			</TabsIndicator>
			<ContextMenuRoot v-for="tab in tabs" :key="tab.id">
				<ContextMenuTrigger as-child>
					<TabsTrigger :value="tab.id" :data-tab-id="tab.id" :class="$style.tab">
						<N8nIcon :icon="tab.icon" size="large" />
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
	</div>
</template>

<style lang="scss" module>
@property --left--fade {
	syntax: '<length>';
	inherits: false;
	initial-value: 0;
}

@property --right--fade {
	syntax: '<length>';
	inherits: false;
	initial-value: 0;
}

@keyframes scrollfade {
	0% {
		--left--fade: 0;
	}
	10%,
	100% {
		--left--fade: 3rem;
	}
	0%,
	90% {
		--right--fade: 3rem;
	}
	100% {
		--right--fade: 0;
	}
}

.header {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding-left: var(--spacing--4xs);
	border-bottom: var(--border);
}

.tabList {
	flex: 1 1 0;
	min-width: 0;
	display: flex;
	overflow-x: auto;
	scrollbar-width: none;
	position: relative;
	mask: linear-gradient(
		to right,
		#0000,
		#ffff var(--left--fade) calc(100% - var(--right--fade)),
		#0000
	);
	animation: scrollfade;
	animation-timeline: --scrollfade;
	scroll-timeline: --scrollfade x;
}

.tab {
	flex: 0 1 auto;
	min-width: 64px;
	max-width: 270px;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	/* stylelint-disable-next-line @n8n/css-var-naming -- design-system token */
	color: var(--text-color--subtle);
	background-color: transparent;
	border: none;
	font-size: var(--font-size--2xs);
	padding: var(--spacing--sm) var(--spacing--xs);
	cursor: pointer;

	&:hover {
		background-color: light-dark(var(--color--black-alpha-100), var(--color--white-alpha-100));
	}

	:global(.n8n-icon) {
		flex-shrink: 0;
	}

	&[data-state='active'] {
		/* stylelint-disable-next-line @n8n/css-var-naming -- design-system token */
		color: var(--text-color);
	}

	.label {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.tabsIndicator {
	position: absolute;
	left: 0;
	height: 2px;
	bottom: 0;
	width: var(--reka-tabs-indicator-size);
	transform: translateX(var(--reka-tabs-indicator-position));
	transition-property: width, transform;
	transition-duration: 200ms;
}

.tabsIndicatorBar {
	width: 100%;
	height: 100%;
	/* stylelint-disable-next-line @n8n/css-var-naming -- design-system token */
	background: var(--text-color);
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
