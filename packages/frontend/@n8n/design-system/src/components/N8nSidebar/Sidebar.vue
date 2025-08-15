<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import N8nLogo from '../N8nLogo';
import N8nText from '../N8nText';
import SidebarItem from './SidebarItem.vue';
import N8nResizeWrapper from '../N8nResizeWrapper';
import { N8nIconButton, N8nRoute, N8nTooltip } from '..';
import N8nKeyboardShortcut from '../N8nKeyboardShortcut/N8nKeyboardShortcut.vue';
import { useSidebarLayout } from './useSidebarLayout';
import { IMenuItem, IMenuElement, isCustomMenuItem } from '@n8n/design-system/types';
import SidebarSubMenu from './SidebarSubMenu.vue';
import { TreeItem, TreeItemToggleEvent, TreeRoot, TreeVirtualizer } from 'reka-ui';

const props = defineProps<{
	items: IMenuElement[];
	userName: string;
	releaseChannel: 'stable' | 'dev' | 'beta' | 'nightly';
	helpItems: IMenuElement[];
	handleSelect?: (key: string) => void;
}>();

defineEmits<{
	createProject: void;
	logout: void;
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

function preventDefault<T>(event: TreeItemToggleEvent<T>) {
	if (event.detail.originalEvent.type === 'click') {
		event.detail.originalEvent.preventDefault();
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
			<TreeRoot :items :get-key="(item: IMenuElement) => item.id">
				<TreeVirtualizer v-slot="{ item }" :text-content="(opt) => opt.name">
					<TreeItem
						as-child
						:key="item.value.id"
						v-slot="{ isExpanded, handleToggle }"
						@toggle="preventDefault"
						@select="preventDefault"
						@click="preventDefault"
						class="item"
						v-bind="item.bind"
					>
						<N8nText
							v-if="item.value.type === 'subtitle'"
							class="sidebarSubheader"
							size="small"
							color="text-light"
							bold
						>
							{{ item.value.label }}
						</N8nText>
						<component
							v-else-if="isCustomMenuItem(item.value as IMenuElement)"
							:is="item.value.component"
							v-bind="item.value.props || {}"
						/>
						<SidebarItem
							v-else
							:key="item.value.id"
							:click="handleToggle"
							:open="isExpanded"
							:level="item.level"
							:ariaLabel="`Open ${item.value.label}`"
							:item="item.value as IMenuItem"
						/>
					</TreeItem>
				</TreeVirtualizer>
			</TreeRoot>
		</nav>
		<slot name="creatorCallout" />
		<slot name="sourceControl" />
		<div class="sidebarUserArea">
			<N8nText class="userName" size="small" bold>{{ userName }}</N8nText>
			<N8nTooltip placement="top">
				<template #content>
					<N8nText size="small">Sign out</N8nText>
				</template>
				<N8nIconButton
					@click="$emit('logout')"
					aria-label="Sign out"
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
				<N8nRoute to="/settings">
					<N8nIconButton
						icon-size="large"
						size="mini"
						icon="settings"
						type="secondary"
						text
						square
					/>
				</N8nRoute>
			</N8nTooltip>
			<SidebarSubMenu>
				<template #trigger>
					<N8nIconButton
						icon-size="large"
						size="mini"
						icon="circle-help"
						type="secondary"
						text
						square
					/>
				</template>
				<template #content>
					<div v-for="item in helpItems" :key="item.id" class="sidebarSubMenuSection">
						<N8nText
							v-if="!isCustomMenuItem(item)"
							class="sidebarSubMenuSectionHeader"
							size="small"
							bold
							color="text-light"
							>{{ item.label }}</N8nText
						>
						<div v-if="!isCustomMenuItem(item)" v-for="subItem in item.children" :key="subItem.id">
							<component
								v-if="isCustomMenuItem(subItem)"
								:is="subItem.component"
								v-bind="subItem.props || {}"
							/>
							<SidebarItem
								v-else
								:item="subItem"
								@click="handleSelect ? handleSelect(subItem.id) : undefined"
								:ariaLabel="`Go to ${subItem.label}`"
							/>
						</div>
					</div>
				</template>
			</SidebarSubMenu>
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
	padding: var(--spacing-s) 0 var(--spacing-xs);
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

.sidebarSubMenuSection:first-of-type {
	margin-bottom: var(--spacing-xs);
}

.sidebarSubMenuSectionHeader {
	margin-bottom: var(--spacing-3xs);
	display: block;
}

.item {
	position: relative;
	display: flex;
	align-items: center;
	max-width: 100%;
	overflow: hidden;
}
</style>
