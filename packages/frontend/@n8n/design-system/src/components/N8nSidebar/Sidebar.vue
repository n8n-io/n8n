<script lang="ts" setup>
import { computed } from 'vue';
import N8nLogo from '../N8nLogo';
import N8nText from '../N8nText';
import SidebarItem from './SidebarItem.vue';
import N8nResizeWrapper from '../N8nResizeWrapper';
import { N8nIcon, N8nIconButton, N8nPopoverReka, N8nTooltip } from '..';
import N8nKeyboardShortcut from '../N8nKeyboardShortcut/N8nKeyboardShortcut.vue';
import { useSidebarLayout } from './useSidebarLayout';
import { IMenuItem, IMenuElement, isCustomMenuItem } from '@n8n/design-system/types';
import SidebarProjectsEmpty from './SidebarProjectsEmpty.vue';
import SidebarTree from './SidebarTree.vue';

const props = defineProps<{
	topItems: IMenuElement[];
	projectItems: IMenuElement[];
	canCreateProject: boolean;
	openProject: (id: string) => Promise<void>;
	showProjects: boolean;
	bottomItems?: IMenuElement[];
	userName: string;
	releaseChannel: 'stable' | 'dev' | 'beta' | 'nightly';
	helpItems: IMenuElement[];
	handleSelect?: (key: string) => void;
	isCollapsed: boolean;
	onToggleSidebar: () => void;
}>();

const emit = defineEmits<{
	createProject: [];
	sidebarToggle: [s: string];
	logout: [];
}>();

const { sidebarWidth, onResizeStart, onResize, onResizeEnd, subMenuOpen } = useSidebarLayout({});

const state = computed(() => (props.isCollapsed ? 'hidden' : 'open'));
const panelIcon = computed(() => {
	return props.isCollapsed ? 'panel-left-open' : 'panel-left-close';
});

function sidebarToggle() {
	console.log('Toggling sidebar');
	// props.onToggleSidebar();
	emit('sidebarToggle', state.value);
}
</script>

<template>
	<N8nResizeWrapper
		:class="{
			resizeWrapper: true,
			resizeWrapperHidden: state === 'hidden',
		}"
		:width="sidebarWidth"
		:style="{ width: state === 'hidden' ? '40px' : `${sidebarWidth}px` }"
		:supported-directions="['right']"
		:min-width="200"
		:max-width="500"
		:grid-size="8"
		@resizestart="onResizeStart"
		@resize="onResize"
		@resizeend="onResizeEnd"
	>
		<N8nTooltip v-if="state === 'hidden'" placement="right">
			<template #content>
				<div class="toggleTooltip">
					<N8nText size="small" class="tooltipText">Toggle sidebar</N8nText>
					<N8nKeyboardShortcut :keys="['[']" />
				</div>
			</template>
			<div class="showSidebarButton">
				<N8nIconButton
					icon-size="large"
					size="mini"
					:icon="panelIcon"
					type="secondary"
					text
					square
					@click="sidebarToggle"
				/>
			</div>
		</N8nTooltip>
		<header class="sidebarHeader" :class="{ sidebarHeaderCollapsed: state === 'hidden' }">
			<N8nPopoverReka v-if="state === 'open'" :enable-scrolling="false" align="start">
				<template #trigger>
					<button class="sidebarHeaderLogo">
						<N8nLogo location="sidebar" :release-channel="props.releaseChannel" />
						<N8nIcon color="text-light" icon="chevron-down" />
					</button>
				</template>
				<template #content>
					<div class="sideHeaderPopover">
						<N8nText class="userName" size="small" bold>{{ userName }}</N8nText>
						<SidebarItem
							:item="{
								id: 'settings',
								label: 'Settings',
								type: 'other',
								route: { to: `/settings` },
								icon: 'settings',
							}"
							:isCollapsed="isCollapsed"
						/>
						<SidebarItem
							@click="$emit('logout')"
							:item="{
								id: 'sign-out',
								label: 'Sign out',
								type: 'other',
								icon: 'door-open',
							}"
							:isCollapsed="isCollapsed"
						/>
					</div>
				</template>
			</N8nPopoverReka>
			<slot name="createButton" />
			<N8nTooltip v-if="state === 'open'" placement="right">
				<template #content>
					<div class="toggleTooltip">
						<N8nText size="small" class="tooltipText">Toggle sidebar</N8nText>
						<N8nKeyboardShortcut :keys="['[']" />
					</div>
				</template>
				<N8nIconButton
					icon-size="large"
					size="mini"
					:icon="panelIcon"
					type="secondary"
					text
					square
					@click="sidebarToggle"
				/>
			</N8nTooltip>
		</header>
		<nav :class="{ sidebar: true }" :style="{ width: `${sidebarWidth}px` }">
			<SidebarTree :items="topItems" :open-project="openProject" :isCollapsed="isCollapsed" />
			<template v-if="showProjects">
				<N8nText
					v-if="state !== 'hidden'"
					size="small"
					color="text-light"
					class="sidebarSubheader"
					bold
					>Projects</N8nText
				>
				<SidebarProjectsEmpty
					v-if="projectItems.length === 0"
					:can-create="canCreateProject"
					@create-project="$emit('createProject')"
				/>
				<template v-else>
					<SidebarTree
						:items="projectItems"
						:open-project="openProject"
						:isCollapsed="isCollapsed"
					/>
				</template>
			</template>
			<div v-if="bottomItems?.length" class="sidebarBottomItems">
				<SidebarItem
					v-for="item in bottomItems"
					:key="item.id"
					:item="item as IMenuItem"
					@click="handleSelect ? handleSelect(item.id) : undefined"
					:level="1"
					:isCollapsed="isCollapsed"
				/>
			</div>
		</nav>
		<slot name="creatorCallout" />
		<slot name="sourceControl" />
		<div class="sidebarHelpArea" :class="{ sidebarHelpAreaHidden: true }">
			<N8nPopoverReka
				@update:open="(state) => (subMenuOpen = state)"
				:open="subMenuOpen"
				align="start"
			>
				<template #trigger>
					<N8nIconButton
						icon-size="large"
						size="xmini"
						icon="circle-help"
						type="secondary"
						text
						square
					/>
				</template>
				<template #content>
					<div class="sidebarSubMenuPopover">
						<div v-for="item in helpItems" :key="item.id" class="sidebarSubMenuSection">
							<N8nText
								v-if="!isCustomMenuItem(item)"
								class="sidebarSubMenuSectionHeader"
								size="small"
								bold
								color="text-light"
								>{{ item.label }}</N8nText
							>
							<div
								v-if="!isCustomMenuItem(item)"
								v-for="subItem in item.children"
								:key="subItem.id"
							>
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
									:isCollapsed="false"
								/>
							</div>
						</div>
					</div>
				</template>
			</N8nPopoverReka>
		</div>
	</N8nResizeWrapper>
</template>

<style scoped>
.resizeWrapper {
	max-height: 100%;
	height: 100%;
	position: relative;
	border-right: var(--border-base);
	border-color: var(--color-foreground-light);
	display: flex;
	flex-direction: column;

	/* Webkit browsers (Chrome, Safari, Edge) */
	::-webkit-scrollbar {
		width: 4px;
		height: 3px;
	}

	::-webkit-scrollbar-track {
		background: transparent;
	}

	::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 3px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: rgba(0, 0, 0, 0.5);
	}

	/* Firefox */
	* {
		scrollbar-width: thin;
		scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
	}

	/* Prevent layout shift by reserving scrollbar space */
	html {
		overflow-y: scroll; /* Always show vertical scrollbar space */
	}

	/* Or use this approach for containers that might need scrollbars */
	.scrollable-container {
		scrollbar-gutter: stable; /* Modern browsers - reserves space */
	}
}

.sidebar {
	padding: var(--spacing-2xs);
	padding-top: var(--spacing-5xs);
	padding-right: var(--spacing-5xs);
	background-color: var(--color-foreground-xlight);
	position: relative;
	max-height: 100%;
	overflow-y: scroll;
	overflow-x: hidden;
	display: flex;
	flex-direction: column;
	flex: 1;
	max-width: 100%;
}

.sidebarHidden {
	padding: 7px;
}

.sidebarHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-2xs);
	padding: var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs) var(--spacing-xs);
	background-color: var(--color-foreground-xlight);
}

.sidebarHeaderCollapsed {
	padding: var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs) 8px;
}

.sidebarHeaderLogo {
	margin-right: auto;
	display: flex;
	gap: var(--spacing-4xs);
	align-items: center;
	padding: var(--spacing-3xs) var(--spacing-4xs);
	background: none;
	outline: none;
	border: none;

	&:hover,
	&:focus-within {
		background-color: var(--color-foreground-light);
		border-radius: var(--border-radius-base);
		cursor: pointer;
	}
}

.sideHeaderPopover {
	padding: var(--spacing-2xs);
	min-width: 200px;
	height: fit-content;
}

.sidebarSubMenuPopover {
	width: 300px;
	padding: var(--spacing-xs);
}

.sidebarSubheader {
	display: block;
	padding-top: var(--spacing-s);
	padding-bottom: var(--spacing-3xs);
	padding-left: var(--spacing-4xs);
}

.sidebarFooter {
	padding-top: var(--spacing-xl);
	position: sticky;
	top: 100%;
	margin-top: auto;
}

.interactiveArea {
	position: fixed;
	left: 14px;
	top: 20px;
	pointer-events: auto;
}

.showSidebarButton {
	padding: 5px;
	position: absolute;
	top: 50%;
	right: -16px;
	transform: translateY(-50%);
	z-index: 1;
}

.toggleTooltip {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.sidebarHelpArea {
	position: relative;
	padding: var(--spacing-2xs);
	background-color: var(--color-foreground-xlight);
	border-top: var(--border-base);
	border-color: var(--color-foreground-light);
	display: flex;
	gap: var(--spacing-2xs);
	justify-content: flex-end;
}

.sidebarHelpAreaHidden {
	padding-right: 5px;
}

.userName {
	margin-right: auto;
	display: block;
	margin-bottom: var(--spacing-4xs);
	padding: var(--spacing-4xs);
}

.sidebarSubMenuSection:first-of-type {
	margin-bottom: var(--spacing-xs);
}

.sidebarSubMenuSectionHeader {
	margin-bottom: var(--spacing-3xs);
	display: block;
}

.sidebarBottomItems {
	margin-top: auto;
	padding-top: var(--spacing-s);
}
</style>
