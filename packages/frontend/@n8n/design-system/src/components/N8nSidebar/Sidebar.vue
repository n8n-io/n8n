<script lang="ts" setup>
import { computed, ref } from 'vue';
import { TreeItemType } from '.';
import { IconName } from '../N8nIcon/icons';
import N8nLogo from '../N8nLogo';
import N8nText from '../N8nText';
import SidebarItem from './SidebarItem.vue';
import SidebarSection from './SidebarSection.vue';
import N8nIcon from '../N8nIcon';
import N8nResizeWrapper from '../N8nResizeWrapper';
import type { ResizeData } from '@n8n/design-system/types';

const props = defineProps<{
	personal: { id: string; items: TreeItemType[] };
	shared: TreeItemType[];
	projects: { title: string; id: string; icon: IconName; items: TreeItemType[] }[];
	releaseChannel: 'stable' | 'dev' | 'beta' | 'nightly';
}>();

const state = ref<'open' | 'hidden' | 'peak'>('open');
const sidebarWidth = ref(300);
const isResizing = ref(false);

function toggleSidebar() {
	if (state.value === 'open') {
		state.value = 'hidden';
	} else {
		state.value = 'open';
	}
}

function peakSidebar() {
	state.value = 'peak';
}

const panelIcon = computed(() => {
	return state.value === 'open' ? 'panel-left-close' : 'panel-left-open';
});

function onResizeStart() {
	isResizing.value = true;
}

function onResize(event: ResizeData) {
	if (event.x < 30) {
		state.value = 'hidden';
		return;
	}

	sidebarWidth.value = event.width;
}

function onResizeEnd() {
	isResizing.value = false;
}

function peakMouseOver(event: MouseEvent) {
	if (event.relatedTarget == null) {
		return;
	}

	console.log('peakMouseOver', event.relatedTarget);

	const target = event.relatedTarget as Element;

	// Check if the mouse is moving to the sidebar or interactive area
	const isSidebar = target.closest('.sidebar') || target.closest('.resizeWrapper');
	const isInteractiveArea = target.closest('.interactiveArea');

	// Only hide if we're moving to neither the sidebar nor interactive area
	if (state.value === 'peak' && !isSidebar && !isInteractiveArea && !isResizing.value) {
		state.value = 'hidden';
	}
}
</script>

<template>
	<N8nResizeWrapper
		:class="{
			resizeWrapper: true,
			resizeWrapperHidden: state === 'hidden',
			resizeWrapperPeak: state === 'peak',
		}"
		:width="sidebarWidth"
		:style="{ width: `${sidebarWidth}px` }"
		:supported-directions="['right']"
		:min-width="200"
		:max-width="500"
		:grid-size="8"
		:outset="state === 'peak'"
		@resizestart="onResizeStart"
		@resize="onResize"
		@resizeend="onResizeEnd"
	>
		<nav
			:class="{ sidebar: true, sidebarHidden: state === 'hidden', sidebarPeak: state === 'peak' }"
			class="sidebar"
			:style="{ width: `${sidebarWidth}px` }"
			@mouseleave="peakMouseOver"
		>
			<header class="sidebarHeader">
				<N8nLogo location="sidebar" :release-channel="props.releaseChannel" />
				<button class="sidebarStateButton" @click="toggleSidebar">
					<N8nIcon
						class="sidebarStateButtonIcon"
						:icon="panelIcon"
						color="foreground-xdark"
						aria-label="Toggle sidebar"
					/>
				</button>
			</header>
			<SidebarItem
				title="Overview"
				id="home"
				icon="house"
				link="/"
				ariaLabel="Go to Home"
				type="other"
			/>
			<SidebarSection
				title="Personal"
				:id="personal.id"
				icon="user"
				:items="personal.items"
				:selectable="false"
				:collapsible="false"
			/>

			<SidebarSection
				title="Shared with me"
				id="shared"
				icon="share"
				:items="shared"
				:selectable="false"
				:collapsible="false"
			/>
			<N8nText size="small" bold color="text-light" class="sidebarSubheader">Projects</N8nText>
			<SidebarSection
				v-for="project in props.projects"
				:title="project.title"
				:id="project.id"
				:icon="project.icon"
				:key="project.id"
				:items="project.items"
				:selectable="false"
				:collapsible="false"
			/>
			<slot name="sourceControl" />
			<footer class="sidebarFooter">
				<SidebarItem title="Admin panel" id="templates" icon="cloud" type="other" />
				<SidebarItem title="Templates" id="templates" icon="box" type="other" />
				<SidebarItem title="Variables" id="templates" icon="variable" type="other" />
				<SidebarItem title="Insights" id="templates" icon="chart-column-decreasing" type="other" />
				<SidebarItem title="Settings" id="templates" icon="settings" type="other" />
			</footer>
		</nav>
	</N8nResizeWrapper>
	<div
		v-if="state === 'hidden' || state === 'peak'"
		:style="{ width: `${state === 'peak' ? sidebarWidth + 30 : 30}px` }"
		class="interactiveArea"
		@mouseenter="peakSidebar"
		@mouseleave="peakMouseOver"
	></div>
</template>

<style scoped>
.sidebar {
	padding: 12px;
	background-color: var(--color-foreground-xlight);
	position: relative;
	height: 100%;
	max-height: 100%;
	overflow-y: scroll;
	border-right: 1px solid var(--color-foreground-base);
}

.resizeWrapperHidden,
.resizeWrapperPeak {
	position: fixed;
	height: calc(100vh - 64px);
	top: 20px;
	z-index: 1000;
}

/* exit */
.resizeWrapperHidden {
	transform: translateX(-100%);
	transition: transform 0.25s ease-in;
}

/* entrance */
.resizeWrapperPeak {
	transform: translateX(0%);
	transition: transform 0.21s ease-out;
}

.sidebarHidden,
.sidebarPeak {
	border-bottom-right-radius: 8px;
	border-top-right-radius: 8px;
	overflow: auto;
	border-top: 1px solid var(--color-foreground-base);
	border-bottom: 1px solid var(--color-foreground-base);
	height: 100%;
}

.sidebarHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.sidebarSubheader {
	margin: 16px 0 8px;
	display: block;
}

.sidebarFooter {
	padding-top: 32px;
	position: sticky;
	top: 100%;
	margin-top: auto;
}

.sidebarStateButton {
	background: none;
	border: none;
	cursor: pointer;
	width: 16px;
	height: 16px;
	padding: 0;
}

.sidebarStateButtonIcon {
	width: 100%;
	height: 100%;
}

.interactiveArea {
	position: absolute;
	left: 0;
	top: 0;
	height: 100%;
	pointer-events: auto;
}
</style>
