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
import { N8nIconButton } from '..';

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

	const target = event.relatedTarget as Element;

	const isSidebar = target.closest('.sidebar') || target.closest('.resizeWrapper');
	const isInteractiveArea = target.closest('.interactiveArea');

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
				<N8nLogo
					class="sidebarHeaderLogo"
					location="sidebar"
					:release-channel="props.releaseChannel"
				/>
				<slot name="createButton" />
				<N8nIconButton
					icon-size="large"
					size="mini"
					:icon="panelIcon"
					type="secondary"
					text
					square
					@click="toggleSidebar"
				/>
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
			<footer class="sidebarFooter">
				<SidebarItem title="Admin panel" id="templates" icon="cloud" type="other" />
				<SidebarItem title="Templates" id="templates" icon="box" type="other" />
				<SidebarItem title="Variables" id="templates" icon="variable" type="other" />
				<SidebarItem title="Insights" id="templates" icon="chart-column-decreasing" type="other" />
				<SidebarItem title="Settings" id="templates" icon="settings" type="other" />
			</footer>
		</nav>
		<slot name="creatorCallout" />
		<slot name="sourceControl" />
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
.resizeWrapper {
	max-height: 100%;
	height: 100%;
	overflow-x: hidden;
	overflow-y: scroll;
	border-right: 1px solid var(--color-foreground-base);
	display: flex;
	flex-direction: column;
}

.resizeWrapperHidden,
.resizeWrapperPeak {
	position: fixed;
	height: calc(100vh - 64px);
	top: 20px;
	z-index: 1000;
	border-bottom-right-radius: 8px;
	border-top-right-radius: 8px;
	border-top: 1px solid var(--color-foreground-base);
	border-bottom: 1px solid var(--color-foreground-base);
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

.sidebar {
	padding: 12px;
	background-color: var(--color-foreground-xlight);
	position: relative;
	max-height: 100%;
	overflow-y: scroll;
	flex-grow: 1;
}

.sidebarHidden,
.sidebarPeak {
	overflow: auto;
}

.sidebarHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
	gap: 8px;
}

.sidebarHeaderLogo {
	margin-right: auto;
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

.interactiveArea {
	position: absolute;
	left: 0;
	top: 0;
	height: 100%;
	pointer-events: auto;
}
</style>
