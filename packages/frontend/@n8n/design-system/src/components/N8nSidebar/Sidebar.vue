<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import { TreeItemType } from '.';
import { IconName } from '../N8nIcon/icons';
import N8nLogo from '../N8nLogo';
import N8nText from '../N8nText';
import SidebarItem from './SidebarItem.vue';
import SidebarSection from './SidebarSection.vue';
import N8nResizeWrapper from '../N8nResizeWrapper';
import { N8nButton, N8nIconButton, N8nTooltip } from '..';
import N8nKeyboardShortcut from '../N8nKeyboardShortcut/N8nKeyboardShortcut.vue';
import { useSidebarLayout } from './useSidebarLayout';

const props = defineProps<{
	personal: { id: string; items: TreeItemType[] };
	shared: TreeItemType[];
	projects: { title: string; id: string; icon: IconName; items: TreeItemType[] }[];
	releaseChannel: 'stable' | 'dev' | 'beta' | 'nightly';
	localStorageWidthKey: string;
	localStorageStateKey: string;
}>();

defineEmits<{
	(createProject: void): void;
}>();

const {
	state,
	sidebarWidth,
	panelIcon,
	toggleSidebar,
	peakSidebar,
	onResizeStart,
	onResize,
	onResizeEnd,
	peakMouseOver,
} = useSidebarLayout({});

onMounted(() => {
	window.addEventListener('keydown', (event) => {
		if (event.key === ']') {
			const target = event.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
				return;
			}
			toggleSidebar();
		}
	});
});

onUnmounted(() => {
	window.removeEventListener('keydown', toggleSidebar);
});
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
				<N8nTooltip placement="right">
					<template #content>
						<div class="toggleTooltip">
							<N8nText size="small" class="tooltipText">Toggle sidebar</N8nText>
							<N8nKeyboardShortcut :keys="[']']" />
						</div>
					</template>
					<N8nIconButton
						icon-size="large"
						size="mini"
						:icon="panelIcon"
						type="secondary"
						text
						square
						@click="toggleSidebar"
					/>
				</N8nTooltip>
			</header>
			<SidebarItem
				title="Overview"
				id="home"
				icon="house"
				link="/home/workflows"
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
				v-if="props.projects.length"
				v-for="project in props.projects"
				:title="project.title"
				:id="project.id"
				:icon="project.icon"
				:key="project.id"
				:items="project.items"
				:selectable="false"
				:collapsible="false"
			/>
			<div class="sidebarProjectsEmpty" v-else>
				<N8nButton
					text
					size="small"
					icon="plus"
					type="secondary"
					label="Create project"
					@click="$emit('createProject')"
				/>
			</div>
			<footer class="sidebarFooter">
				<SidebarItem title="Admin panel" id="templates" icon="cloud" type="other" />
				<SidebarItem title="Templates" id="templates" icon="box" type="other" />
				<SidebarItem title="Variables" id="templates" icon="variable" type="other" />
				<SidebarItem title="Insights" id="templates" icon="chart-column-decreasing" type="other" />
				<SidebarItem title="What's new" id="templates" icon="bell" type="other" />
				<SidebarItem title="Help" id="templates" icon="circle-help" type="other" />
			</footer>
		</nav>

		<slot name="creatorCallout" />
		<slot name="sourceControl" />
		<div class="sidebarUserArea">
			<N8nText class="userName" size="small" bold>Rob Squires</N8nText>
			<N8nTooltip placement="top">
				<template #content>
					<N8nText size="small">Sign out</N8nText>
				</template>
				<N8nIconButton
					icon-size="large"
					size="mini"
					icon="door-open"
					type="secondary"
					text
					square
				/>
			</N8nTooltip>
			<N8nTooltip placement="top">
				<template #content>
					<N8nText size="small">Settings</N8nText>
				</template>
				<N8nIconButton icon-size="large" size="mini" icon="settings" type="secondary" text square />
			</N8nTooltip>
			<N8nTooltip placement="top">
				<template #content>
					<N8nText size="small">Help</N8nText>
				</template>
				<N8nIconButton
					icon-size="large"
					size="mini"
					icon="circle-help"
					type="secondary"
					text
					square
				/>
			</N8nTooltip>
		</div>
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
	overflow-y: auto;
	border-right: var(--border-base);
	display: flex;
	flex-direction: column;
}

.resizeWrapperHidden,
.resizeWrapperPeak {
	position: fixed;
	height: calc(100vh - var(--spacing-3xl));
	top: var(--spacing-l);
	z-index: 1000;
	border-bottom-right-radius: var(--border-radius-large);
	border-top-right-radius: var(--border-radius-large);
	border-top: var(--border-base);
	border-bottom: var(--border-base);
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
	padding: var(--spacing-2xs);
	background-color: var(--color-foreground-xlight);
	position: relative;
	max-height: 100%;
	overflow-y: auto;
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
	margin-bottom: var(--spacing-2xs);
	gap: var(--spacing-2xs);
}

.sidebarHeaderLogo {
	margin-right: auto;
}

.sidebarSubheader {
	margin: var(--spacing-s) 0 var(--spacing-2xs);
	display: block;
}

.sidebarFooter {
	padding-top: var(--spacing-xl);
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

.toggleTooltip {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.sidebarUserArea {
	position: relative;
	padding: var(--spacing-2xs);
	background-color: var(--color-foreground-xlight);
	border-top: var(--border-base);
	display: flex;
	gap: var(--spacing-2xs);

	align-items: center;
}

.userName {
	margin-right: auto;
}

.sidebarProjectsEmpty {
	padding: var(--spacing-l) var(--spacing-2xs);
	text-align: center;
	border: dashed 1px var(--color-foreground-base);
	border-radius: var(--border-radius-small);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing-2xs);
}
</style>
