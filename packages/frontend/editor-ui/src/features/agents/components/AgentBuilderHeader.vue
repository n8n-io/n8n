<script setup lang="ts">
/**
 * Top header bar for the agent builder. Hosts breadcrumb navigation,
 * agent switcher, chat-column collapse toggle, publish button, and the
 * existing action-menu dropdown.
 *
 * Navigation intents are emitted as events — the parent view owns routing.
 */
import { computed, onMounted } from 'vue';
import {
	N8nActionDropdown,
	N8nBreadcrumbs,
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
	headerActions: ActionDropdownItem<string>[];
	chatColumnCollapsed: boolean;
}>();

const emit = defineEmits<{
	back: [];
	'toggle-chat-column': [];
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
		id: 'workspace',
		label: i18n.baseText('agents.builder.header.workspaceCrumb'),
	},
	{
		id: props.projectId,
		label: props.projectName ?? i18n.baseText('agents.builder.header.projectFallback'),
	},
	{
		id: props.agentId,
		label: props.agent?.name ?? '…',
	},
]);

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
		<button
			type="button"
			:class="$style.iconBtn"
			:aria-label="i18n.baseText('agents.builder.header.backToAgents')"
			data-testid="agent-header-back"
			@click="emit('back')"
		>
			<N8nIcon icon="arrow-left" :size="16" />
		</button>
		<button
			type="button"
			:class="[$style.iconBtn, chatColumnCollapsed && $style.iconBtnActive]"
			:aria-label="i18n.baseText('agents.builder.header.toggleChat')"
			:aria-pressed="chatColumnCollapsed"
			data-testid="agent-header-toggle-chat"
			@click="emit('toggle-chat-column')"
		>
			<N8nIcon icon="panel-left" :size="16" />
		</button>
		<N8nBreadcrumbs :items="breadcrumbItems" theme="small">
			<template #append>
				<N8nNavigationDropdown
					:menu="switcherMenu"
					data-testid="agent-header-switcher"
					@select="onSwitcherSelect"
				>
					<button
						type="button"
						:class="$style.switcherTrigger"
						:aria-label="i18n.baseText('agents.builder.header.switcher.ariaLabel')"
					>
						<N8nIcon icon="chevron-down" :size="12" />
					</button>
				</N8nNavigationDropdown>
			</template>
		</N8nBreadcrumbs>
		<div :class="$style.right">
			<AgentPublishButton
				:agent="agent"
				:project-id="projectId"
				:agent-id="agentId"
				:is-saving="false"
				@published="(a: AgentResource) => emit('published', a)"
				@unpublished="(a: AgentResource) => emit('unpublished', a)"
			/>
			<N8nActionDropdown
				:items="headerActions"
				activator-icon="ellipsis-vertical"
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
	border-bottom: var(--border);
	min-height: 44px;
}

.iconBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	background: transparent;
	border: var(--border);
	border-color: transparent;
	border-radius: var(--radius);
	color: var(--color--text);
	cursor: pointer;

	&:hover {
		background: var(--color--background--light-2);
	}
}

.iconBtnActive {
	background: var(--color--background--light-3);
	border-color: var(--color--foreground);
}

.switcherTrigger {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	padding: 0;
	margin-left: var(--spacing--4xs);
	background: transparent;
	border: none;
	border-radius: var(--radius);
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:hover {
		background: var(--color--background--light-2);
		color: var(--color--text);
	}
}

.right {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
