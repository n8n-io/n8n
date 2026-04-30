<script setup lang="ts">
/**
 * Top header bar for the agent builder. Hosts breadcrumb navigation,
 * agent switcher, publish button, and the existing action-menu dropdown.
 *
 * Navigation intents are emitted as events — the parent view owns routing.
 */
import { computed, onMounted } from 'vue';
import {
	N8nActionDropdown,
	N8nBreadcrumbs,
	N8nButton,
	N8nIcon,
	N8nNavigationDropdown,
} from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import type { ActionDropdownItem } from '@n8n/design-system/types/action-dropdown';
import { useI18n } from '@n8n/i18n';

import AgentPublishButton from './AgentPublishButton.vue';
import { useProjectAgentsList } from '../composables/useProjectAgentsList';
import type { AgentResource } from '../types';

const props = defineProps<{
	agent: AgentResource | null;
	projectId: string;
	agentId: string;
	projectName: string | null;
	headerActions: Array<ActionDropdownItem<string>>;
	saveStatus?: 'idle' | 'saving' | 'saved';
}>();

const emit = defineEmits<{
	'header-action': [item: string];
	published: [agent: AgentResource];
	unpublished: [agent: AgentResource];
	'switch-agent': [agentId: string];
}>();

const i18n = useI18n();

const { list: agentsList, ensureLoaded } = useProjectAgentsList(computed(() => props.projectId));

onMounted(() => {
	void ensureLoaded();
});

const breadcrumbItems = computed<PathItem[]>(() => [
	{
		id: props.projectId,
		label: props.projectName ?? i18n.baseText('agents.builder.header.projectFallback'),
	},
]);

const agentDisplayName = computed(() => props.agent?.name ?? '…');

type SwitcherMenuItem = {
	id: string;
	title: string;
	disabled?: boolean;
	isDivider?: false;
};

const switcherMenu = computed<SwitcherMenuItem[]>(() => {
	const list = agentsList.value ?? [];
	const others = list.filter((a) => a.id !== props.agentId);
	if (others.length === 0) {
		return [
			{
				id: '__empty__',
				title: i18n.baseText('agents.builder.header.switcher.empty'),
				disabled: true,
			},
		];
	}
	return others.map((a) => ({
		id: a.id,
		title: a.name,
	}));
});

function onSwitcherSelect(id: string) {
	if (id === '__empty__') return;
	emit('switch-agent', id);
}
</script>

<template>
	<header :class="$style.header" data-testid="agent-builder-header">
		<N8nBreadcrumbs :items="breadcrumbItems" theme="small">
			<template #append>
				<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
				<N8nNavigationDropdown
					:menu="switcherMenu"
					submenu-class="agent-header-switcher-menu"
					data-testid="agent-header-switcher"
					@select="onSwitcherSelect"
				>
					<N8nButton
						variant="ghost"
						size="xsmall"
						:class="$style.switcherButton"
						:aria-label="i18n.baseText('agents.builder.header.switcher.ariaLabel')"
					>
						<span :class="$style.switcherLabel">{{ agentDisplayName }}</span>
						<N8nIcon icon="chevron-down" :size="12" />
					</N8nButton>
				</N8nNavigationDropdown>
			</template>
		</N8nBreadcrumbs>
		<div :class="$style.right">
			<span
				v-if="saveStatus === 'saving' || saveStatus === 'saved'"
				:class="$style.saveStatus"
				data-testid="agent-header-save-status"
			>
				{{
					saveStatus === 'saving'
						? i18n.baseText('agents.builder.header.saving')
						: i18n.baseText('agents.builder.header.saved')
				}}
			</span>
			<AgentPublishButton
				:agent="agent"
				:project-id="projectId"
				:agent-id="agentId"
				:is-saving="saveStatus === 'saving'"
				@published="(a: AgentResource) => emit('published', a)"
				@unpublished="(a: AgentResource) => emit('unpublished', a)"
			/>
			<N8nActionDropdown
				:items="headerActions"
				activator-icon="ellipsis"
				activator-size="small"
				data-testid="agent-header-actions"
				@select="(item: string) => emit('header-action', item)"
			/>
		</div>
	</header>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	background-color: var(--color--background--light-3);
	border-bottom: var(--border);
	flex-shrink: 0;
	box-sizing: content-box;
	height: var(--height--sm);
}

.crumbSeparator {
	color: var(--color--text--tint-2);
	margin: 0 var(--spacing--4xs);
	user-select: none;
}

/* N8nButton owns chrome/hover/focus; we just override the breadcrumb-bold weight
   and add gap between the label and chevron. */
.switcherButton {
	gap: var(--spacing--4xs);
	font-weight: var(--font-weight--bold);
}

.switcherLabel {
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.right {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.saveStatus {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	user-select: none;
}

/* Scope the scroll behavior to the inner el-menu — element-plus renders the
   popper as `.agent-header-switcher-menu > .el-menu`. Putting overflow on the
   outer popper produced a second nested scroll area. */
:global(.agent-header-switcher-menu) :global(.el-menu) {
	max-height: calc(5 * 36px);
	overflow-y: auto;
}
</style>
