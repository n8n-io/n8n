<script lang="ts" setup>
import { onClickOutside, type VueInstance } from '@vueuse/core';
import { ref, type Ref } from 'vue';
import { I18nT } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import {
	N8nButton,
	N8nLogo,
	N8nTooltip,
	N8nLink,
	N8nIcon,
	N8nIconButton,
	N8nNavigationDropdown,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useGlobalEntityCreation } from '@/app/composables/useGlobalEntityCreation';
import BetaTag from '@n8n/design-system/components/BetaTag/BetaTag.vue';

defineProps<{
	isCollapsed: boolean;
	isBeta?: boolean;
	hideCreate?: boolean;
}>();

const emit = defineEmits<{
	collapse: [];
	openCommandBar: [event: MouseEvent];
}>();

const i18n = useI18n();
const sourceControlStore = useSourceControlStore();
const settingsStore = useSettingsStore();

const createBtn = ref<InstanceType<typeof N8nNavigationDropdown>>();

onClickOutside(createBtn as Ref<VueInstance>, () => {
	createBtn.value?.close();
});

function toggleCollapse() {
	emit('collapse');
}

function openCommandBar(event: MouseEvent) {
	emit('openCommandBar', event);
}

const {
	menu,
	handleSelect: handleMenuSelect,
	createProjectAppendSlotName,
	createWorkflowsAppendSlotName,
	createCredentialsAppendSlotName,
	projectsLimitReachedMessage,
	upgradeLabel,
	hasPermissionToCreateProjects,
} = useGlobalEntityCreation();
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
				<BetaTag v-if="isBeta" :class="$style.beta" data-test-id="beta-icon" />
				<N8nTooltip
					v-if="sourceControlStore.preferences.branchReadOnly && !isCollapsed"
					placement="bottom"
				>
					<template #content>
						<I18nT keypath="readOnlyEnv.tooltip" scope="global">
							<template #link>
								<N8nLink
									to="https://docs.n8n.io/source-control-environments/setup/#step-4-connect-n8n-and-configure-your-instance"
									size="small"
								>
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
		<N8nNavigationDropdown
			v-if="!hideCreate"
			ref="createBtn"
			data-test-id="universal-add"
			:menu="menu"
			@select="handleMenuSelect"
		>
			<N8nIconButton
				size="small"
				type="highlight"
				icon="plus"
				icon-size="large"
				aria-label="Add new item"
			/>
			<template #[createWorkflowsAppendSlotName]>
				<N8nTooltip
					v-if="sourceControlStore.preferences.branchReadOnly"
					placement="right"
					:content="i18n.baseText('readOnlyEnv.cantAdd.workflow')"
				>
					<N8nIcon :class="$style.iconButton" icon="lock" size="xsmall" />
				</N8nTooltip>
			</template>
			<template #[createCredentialsAppendSlotName]>
				<N8nTooltip
					v-if="sourceControlStore.preferences.branchReadOnly"
					placement="right"
					:content="i18n.baseText('readOnlyEnv.cantAdd.credential')"
				>
					<N8nIcon :class="$style.iconButton" icon="lock" size="xsmall" />
				</N8nTooltip>
			</template>
			<template #[createProjectAppendSlotName]="{ item }">
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
						v-else
						:size="'mini'"
						:class="$style.upgradeButton"
						type="tertiary"
						@click="handleMenuSelect(item.id)"
					>
						{{ upgradeLabel }}
					</N8nButton>
				</N8nTooltip>
			</template>
		</N8nNavigationDropdown>
		<KeyboardShortcutTooltip
			:placement="isCollapsed ? 'right' : 'bottom'"
			:show-after="500"
			:label="i18n.baseText('nodeView.openCommandBar')"
			:shortcut="{ keys: ['k'], metaKey: true }"
		>
			<N8nIconButton
				size="small"
				type="highlight"
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
				size="small"
				type="highlight"
				icon="panel-left"
				icon-size="large"
				aria-label="Toggle sidebar"
				@click="toggleCollapse"
			/>
		</KeyboardShortcutTooltip>
	</div>
</template>

<style lang="scss" module>
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
}

.beta {
	margin-top: var(--spacing--3xs);
	margin-left: var(--spacing--3xs);
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

.upgradeButton {
	margin-left: auto;
}
</style>
