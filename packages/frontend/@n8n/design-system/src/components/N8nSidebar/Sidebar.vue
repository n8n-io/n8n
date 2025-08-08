<script lang="ts" setup>
import { computed, ref } from 'vue';
import { TreeItemType } from '.';
import { IconName } from '../N8nIcon/icons';
import N8nLogo from '../N8nLogo';
import N8nText from '../N8nText';
import SidebarItem from './SidebarItem.vue';
import SidebarSection from './SidebarSection.vue';
import N8nIcon from '../N8nIcon';

const props = defineProps<{
	personal: { id: string; items: TreeItemType[] };
	shared: TreeItemType[];
	projects: { title: string; id: string; icon: IconName; items: TreeItemType[] }[];
	releaseChannel: 'stable' | 'dev' | 'beta' | 'nightly';
}>();

const state = ref<'open' | 'hidden' | 'peak'>('open');

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

function handleLeave() {
	if (state.value === 'peak') {
		state.value = 'hidden';
	}
}

const panelIcon = computed(() => {
	return state.value === 'open' ? 'panel-left-close' : 'panel-left-open';
});
</script>

<template>
	<nav
		:class="{ sidebar: true, sidebarHidden: state === 'hidden', sidebarPeak: state === 'peak' }"
		class="sidebar"
		@mouseleave="handleLeave"
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
		<footer class="sidebarFooter">
			<SidebarItem title="Admin panel" id="templates" icon="cloud" type="other" />
			<SidebarItem title="Templates" id="templates" icon="box" type="other" />
			<SidebarItem title="Variables" id="templates" icon="variable" type="other" />
			<SidebarItem title="Insights" id="templates" icon="chart-column-decreasing" type="other" />
			<SidebarItem title="Settings" id="templates" icon="settings" type="other" />
		</footer>
	</nav>
	<div v-if="state === 'hidden'" class="interactiveArea" @mouseenter="peakSidebar"></div>
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
	width: 300px;
}

.sidebarHidden,
.sidebarPeak {
	position: fixed;
	height: calc(100vh - 64px);
	top: 20px;
	border-bottom-right-radius: 8px;
	border-top-right-radius: 8px;
	overflow: auto;
	border-top: 1px solid var(--color-foreground-base);
	border-bottom: 1px solid var(--color-foreground-base);
}

/* exit */
.sidebarHidden {
	transform: translateX(-100%);
	position: fixed;
	transition: transform 0.25s ease-in;
}

/* entrance */
.sidebarPeak {
	transform: translateX(0%);
	transition: transform 0.21s ease-out;
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
	width: 30px;
	opacity: 0;
}
</style>
