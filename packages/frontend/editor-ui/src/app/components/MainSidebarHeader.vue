<script lang="ts" setup>
import { computed } from 'vue';
// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { useClaudeCreateMenu } from '@/experiments/surfaceMcpToClaudeTrialUsers/useClaudeCreateMenu';
import ClaudeLogo from '@/experiments/surfaceMcpToClaudeTrialUsers/ClaudeLogo.vue';
// EOF Experiment cleanup
import { I18nT } from 'vue-i18n';
import { RouterLink, useRouter, type RouteLocationRaw } from 'vue-router';
import {
	N8nButton,
	N8nLogo,
	N8nTooltip,
	N8nLink,
	N8nIcon,
	N8nIconButton,
	N8nDropdownMenu,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { PROTECTED_INSTANCE_DOCS_URL } from '@/features/integrations/sourceControl.ee/sourceControl.constants';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useGlobalEntityCreation } from '@/app/composables/useGlobalEntityCreation';
defineProps<{
	isCollapsed: boolean;
	hideCreate?: boolean;
}>();

const emit = defineEmits<{
	collapse: [];
	openCommandBar: [event: MouseEvent];
}>();

const i18n = useI18n();
const sourceControlStore = useSourceControlStore();
const settingsStore = useSettingsStore();

const router = useRouter();

function toggleCollapse() {
	emit('collapse');
}

function openCommandBar(event: MouseEvent) {
	emit('openCommandBar', event);
}

const {
	menu,
	handleSelect: handleMenuSelect,
	projectsLimitReachedMessage,
	upgradeLabel,
	hasPermissionToCreateProjects,
} = useGlobalEntityCreation();
// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
const { claudeMenu, selectItem, trackOpen } = useClaudeCreateMenu(menu, handleMenuSelect);
// EOF Experiment cleanup
type CreationMenuItem = DropdownMenuItemProps<string, { route?: RouteLocationRaw }>;
type SourceMenuItem = (typeof menu.value)[number];

function toDropdownItem(item: SourceMenuItem): CreationMenuItem {
	return {
		id: item.id,
		label: item.title,
		disabled: item.disabled,
		icon: typeof item.icon === 'string' ? { type: 'icon', value: item.icon } : item.icon,
		data: { route: item.route },
		children: item.submenu?.map(toDropdownItem),
	};
}

const creationMenu = computed(() => {
	const items: CreationMenuItem[] = [];
	let divided = false;
	for (const item of claudeMenu.value) {
		if ('isDivider' in item && item.isDivider) {
			divided = true;
			continue;
		}
		items.push({ ...toDropdownItem(item), divided });
		divided = false;
	}

	const workflowIndex = items.findIndex((item) => item.id === 'workflow');
	const agentIndex = items.findIndex((item) => item.id === 'agent');
	if (workflowIndex !== -1 && agentIndex !== -1 && agentIndex !== workflowIndex + 1) {
		const [agentItem] = items.splice(agentIndex, 1);
		items.splice(items.findIndex((item) => item.id === 'workflow') + 1, 0, agentItem);
	}
	return items;
});

function handleSelect(id: string) {
	const item = creationMenu.value
		.flatMap((item) => [item, ...(item.children ?? [])])
		.find((item) => item.id === id);
	if (item?.data?.route) void router.push(item.data.route);
	selectItem(id);
}

function handleLinkClick(event: MouseEvent) {
	if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
		event.stopPropagation();
	} else {
		event.preventDefault();
	}
}
</script>

<template>
	<div
		:class="{
			[$style.header]: true,
			[$style.collapsed]: isCollapsed,
		}"
	>
		<RouterLink v-if="!isCollapsed" :to="{ name: VIEWS.HOMEPAGE }" :class="$style.logo">
			<N8nLogo
				size="small"
				:collapsed="isCollapsed"
				:release-channel="settingsStore.settings.releaseChannel"
			>
				<N8nTooltip
					v-if="sourceControlStore.preferences.branchReadOnly && !isCollapsed"
					placement="bottom"
				>
					<template #content>
						<I18nT keypath="readOnlyEnv.tooltip" scope="global">
							<template #link>
								<N8nLink :to="PROTECTED_INSTANCE_DOCS_URL" size="small">
									{{ i18n.baseText('readOnlyEnv.tooltip.link') }}
								</N8nLink>
							</template>
						</I18nT>
					</template>
					<N8nIcon
						data-test-id="read-only-env-icon"
						icon="lock"
						:class="$style.readOnlyEnvironmentIcon"
					/>
				</N8nTooltip>
			</N8nLogo>
		</RouterLink>
		<!-- Experiment cleanup (123_surface_mcp_to_claude_trial_users): map menu instead of claudeMenu. Remove the Claude leading icon and trackOpen. -->
		<N8nDropdownMenu
			v-if="!hideCreate"
			data-test-id="universal-add"
			:items="creationMenu"
			content-test-id="creation-menu"
			placement="bottom-start"
			:modal="false"
			@select="handleSelect"
		>
			<template #trigger>
				<N8nIconButton
					class="n8n-button--highlight"
					variant="ghost"
					size="small"
					icon="plus"
					icon-size="large"
					aria-label="Add new item"
					@click="trackOpen"
				/>
			</template>
			<template #item-leading="{ item, ui }">
				<!-- Experiment cleanup (123_surface_mcp_to_claude_trial_users) -->
				<ClaudeLogo v-if="item.id === 'claude-mcp'" :class="ui.class" />
				<!-- EOF Experiment cleanup -->
				<N8nIcon
					v-else-if="item.icon?.type === 'icon'"
					:icon="item.icon.value"
					:class="ui.class"
					size="large"
				/>
				<span v-else-if="item.icon?.type === 'emoji'" :class="ui.class">{{ item.icon.value }}</span>
			</template>
			<template #item-label="{ item, ui }">
				<a
					v-if="item.data?.route && !item.disabled"
					:href="router.resolve(item.data.route).href"
					:class="[ui.class, $style.creationLink]"
					tabindex="-1"
					@click="handleLinkClick"
					>{{ item.label }}</a
				>
				<span v-else :class="ui.class">{{ item.label }}</span>
			</template>
			<template #item-trailing="{ item }">
				<template v-if="item.id === 'workflow'">
					<N8nTooltip
						v-if="sourceControlStore.preferences.branchReadOnly"
						placement="right"
						:content="i18n.baseText('readOnlyEnv.cantAdd.workflow')"
					>
						<N8nIcon :class="$style.iconButton" icon="lock" size="xsmall" />
					</N8nTooltip>
				</template>
				<template v-else-if="item.id === 'credential'">
					<N8nTooltip
						v-if="sourceControlStore.preferences.branchReadOnly"
						placement="right"
						:content="i18n.baseText('readOnlyEnv.cantAdd.credential')"
					>
						<N8nIcon :class="$style.iconButton" icon="lock" size="xsmall" />
					</N8nTooltip>
				</template>
				<template v-else-if="item.id === 'create-project'">
					<N8nTooltip
						v-if="sourceControlStore.preferences.branchReadOnly"
						placement="right"
						:content="i18n.baseText('readOnlyEnv.cantAdd.project')"
					>
						<N8nIcon :class="$style.iconButton" icon="lock" size="xsmall" />
					</N8nTooltip>
					<N8nTooltip
						v-else-if="item.disabled"
						placement="right"
						:content="projectsLimitReachedMessage"
					>
						<N8nIcon
							v-if="!hasPermissionToCreateProjects"
							:class="$style.iconButton"
							icon="lock"
							size="xsmall"
						/>
						<N8nButton
							variant="outline"
							v-else
							:size="'mini'"
							:class="$style.upgradeButton"
							@click.stop="handleMenuSelect(item.id)"
						>
							{{ upgradeLabel }}
						</N8nButton>
					</N8nTooltip>
				</template>
			</template>
		</N8nDropdownMenu>
		<KeyboardShortcutTooltip
			v-if="!settingsStore.isCanvasOnly"
			:placement="isCollapsed ? 'right' : 'bottom'"
			:show-after="500"
			:label="i18n.baseText('nodeView.openCommandBar')"
			:shortcut="{ keys: ['k'], metaKey: true }"
		>
			<N8nIconButton
				class="n8n-button--highlight"
				variant="ghost"
				size="small"
				icon="search"
				icon-size="large"
				aria-label="Open command palette"
				@click="openCommandBar"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
			:placement="isCollapsed ? 'right' : 'bottom'"
			:label="
				isCollapsed
					? i18n.baseText('mainSidebar.state.expand')
					: i18n.baseText('mainSidebar.state.collapse')
			"
			:show-after="500"
			:shortcut="{ keys: ['['] }"
		>
			<N8nIconButton
				id="toggle-sidebar-button"
				class="n8n-button--highlight"
				variant="ghost"
				size="small"
				icon="panel-left"
				icon-size="large"
				aria-label="Toggle sidebar"
				@click="toggleCollapse"
			/>
		</KeyboardShortcutTooltip>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus' as focus;

.header {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--3xs);
	justify-content: space-between;
	gap: var(--spacing--4xs);

	img {
		position: relative;
		left: 1px;
		height: 20px;
		margin-right: auto;
	}

	&.collapsed {
		flex-direction: column;
		border-bottom: var(--border);
	}
}

.logo {
	margin-right: auto;
	padding-inline-start: var(--spacing--3xs);

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.readOnlyEnvironmentIcon {
	display: inline-block;
	color: white;
	background-color: var(--color--warning);
	align-self: center;
	padding: 2px;
	border-radius: var(--radius--sm);
	margin: 0 var(--spacing--xs) 0 var(--spacing--3xs);
}

.iconButton {
	margin-left: auto;
	margin-right: 5px;
}

.creationLink {
	color: inherit;
}

.upgradeButton {
	margin-left: auto;
}
</style>
