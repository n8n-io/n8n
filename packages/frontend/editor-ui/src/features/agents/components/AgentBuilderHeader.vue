<script setup lang="ts">
/**
 * Top header bar for the agent builder. Hosts breadcrumb navigation,
 * agent switcher, publish button, and the existing action-menu dropdown.
 *
 * Navigation intents are emitted as events, except for the project breadcrumb
 * which links back to the owning project/personal page.
 */
import { computed, onMounted } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import {
	N8nActionDropdown,
	N8nBreadcrumbs,
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
} from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types/action-dropdown';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';

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
	beforeRevertToPublished?: () => Promise<void> | void;
}>();

const emit = defineEmits<{
	'header-action': [item: string];
	published: [agent: AgentResource];
	unpublished: [agent: AgentResource];
	reverted: [agent: AgentResource];
	'switch-agent': [agentId: string];
}>();

const i18n = useI18n();
const router = useRouter();

const { list: agentsList, ensureLoaded } = useProjectAgentsList(computed(() => props.projectId));

onMounted(() => {
	void ensureLoaded();
});

const projectRoute = computed<RouteLocationRaw>(() => ({
	name: VIEWS.PROJECTS_WORKFLOWS,
	params: { projectId: props.projectId },
}));

const breadcrumbItems = computed<PathItem[]>(() => [
	{
		id: props.projectId,

		label: props.projectName ?? i18n.baseText('agents.builder.header.projectFallback'),
		href: router.resolve(projectRoute.value).href,
	},
]);

const agentDisplayName = computed(() => props.agent?.name ?? '…');

const switcherOptions = computed<Array<DropdownMenuItemProps<string>>>(() => {
	const list = agentsList.value ?? [];
	const others = list.filter((a) => a.id !== props.agentId);
	if (others.length === 0) {
		return [
			{
				id: '__empty__',
				label: i18n.baseText('agents.builder.header.switcher.empty'),
				disabled: true,
			},
		];
	}
	return others.map((a) => ({
		id: a.id,
		label: a.name,
	}));
});

function onSwitcherSelect(id: string) {
	if (id === '__empty__') return;
	emit('switch-agent', id);
}

function onBreadcrumbSelect(item: PathItem) {
	if (item.id !== props.projectId) return;
	void router.push(projectRoute.value);
}
</script>

<template>
	<header :class="$style.header" data-testid="agent-builder-header">
		<div :class="$style.left">
			<N8nBreadcrumbs :items="breadcrumbItems" theme="medium" @item-selected="onBreadcrumbSelect">
				<template #append>
					<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
					<N8nDropdownMenu
						:items="switcherOptions"
						data-testid="agent-header-switcher"
						@select="onSwitcherSelect"
					>
						<template #trigger>
							<N8nButton
								variant="ghost"
								size="xsmall"
								:class="$style.switcherButton"
								:aria-label="i18n.baseText('agents.builder.header.switcher.ariaLabel')"
							>
								<span :class="$style.switcherLabel">{{ agentDisplayName }}</span>
								<N8nIcon icon="chevron-down" :size="12" />
							</N8nButton>
						</template>
					</N8nDropdownMenu>
				</template>
			</N8nBreadcrumbs>
		</div>
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
				:before-revert-to-published="beforeRevertToPublished"
				@published="(a: AgentResource) => emit('published', a)"
				@unpublished="(a: AgentResource) => emit('unpublished', a)"
				@reverted="(a: AgentResource) => emit('reverted', a)"
			/>
			<N8nActionDropdown
				:items="headerActions"
				activator-icon="ellipsis"
				activator-size="medium"
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
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	height: var(--height--4xl);
}

.left {
	display: flex;
	align-items: center;
}

.crumbSeparator {
	color: var(--border-color);
	margin: 0 var(--spacing--4xs);
	user-select: none;
}

.switcherButton {
	font-size: var(--font-size--sm);
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--5xs);
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
	color: var(--text-color--subtle);
	user-select: none;
}
</style>
