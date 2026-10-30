<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import dateformat from 'dateformat';
import {
	N8nActionToggle,
	N8nBadge,
	N8nCard,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { MODAL_CONFIRM } from '@/app/constants';
import PublicationIndicator from '@/app/components/PublicationIndicator.vue';
import TimeAgo from '@/app/components/TimeAgo.vue';
import ResourceListRow from '@/app/components/layouts/ResourceListRow.vue';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useMcp, useMCPStore } from '@n8n/frontend-module-mcp';
import { deleteAgent } from '../composables/useAgentApi';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import { useAgentPublish } from '../composables/useAgentPublish';
import { removeProjectAgentFromListCache } from '../composables/useProjectAgentsList';
import type { AgentResource } from '../types';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import type { ActionToggleItem } from '@n8n/design-system/components/N8nActionToggle/ActionToggle.types';

const props = defineProps<{
	agent: AgentResource;
	projectId: string;
}>();

const emit = defineEmits<{
	select: [agentId: string];
	published: [agent: AgentResource];
	unpublished: [agent: AgentResource];
	deleted: [agentId: string];
	'new-chat': [agentId: string, projectId: string];
	duplicate: [agentId: string];
}>();

const locale = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const mcpStore = useMCPStore();
const mcp = useMcp();
const { openAgentConfirmationModal } = useAgentConfirmationModal();
const { publish, unpublish } = useAgentPublish();
const { canCreate, canUpdate, canDelete, canPublish, canUnpublish } = useAgentPermissions(
	() => props.projectId,
);

const isPublished = computed(() => props.agent.activeVersionId !== null);

// Saving a draft bumps `versionId`, so a mismatch means unpublished edits.
const hasUnpublishedChanges = computed(
	() => isPublished.value && props.agent.versionId !== props.agent.activeVersionId,
);
const isUntitled = computed(() => props.agent.name === locale.baseText('agents.new.defaultName'));

const isMcpEnabled = computed(
	() => settingsStore.isModuleActive('mcp') && !!settingsStore.moduleSettings.mcp?.mcpAccessEnabled,
);

// Optimistic state so the action label flips without refetching the list
// (same pattern as the workflow card's 3-dot menu).
const mcpToggleStatus = ref<boolean | null>(null);

const isAvailableInMCP = computed(
	() => mcpToggleStatus.value ?? props.agent.availableInMCP ?? false,
);

watch([() => props.agent, () => props.agent.availableInMCP], () => {
	mcpToggleStatus.value = null;
});

const showMcpIndicator = computed(() => isMcpEnabled.value && isAvailableInMCP.value);

const favoriteStore = useFavoritesStore();
const isFavorite = computed(() => favoriteStore.isFavorite(props.agent.id, 'agent'));

const actions = computed(() => {
	const items: ActionToggleItem[] = [];

	items.push({
		value: 'toggleFavorite',
		label: locale.baseText(isFavorite.value ? 'favorites.remove' : 'favorites.add'),
		divided: !isPublished.value ? !canPublish.value : !canUnpublish.value,
	});

	if (canCreate.value) {
		items.push({
			value: 'duplicate',
			label: locale.baseText('agents.list.actions.duplicate'),
		});
	}

	if (isPublished.value && canUnpublish.value) {
		items.push({
			value: 'unpublish',
			label: locale.baseText('agents.list.actions.unpublish'),
		});
	} else if (!isPublished.value && canPublish.value) {
		items.push({
			value: 'publish',
			label: locale.baseText('agents.list.actions.publish'),
		});
	}

	if (isMcpEnabled.value && canUpdate.value) {
		items.push({
			value: 'toggleMCPAccess',
			label: locale.baseText(
				isAvailableInMCP.value
					? 'agents.list.actions.disableMCPAccess'
					: 'agents.list.actions.enableMCPAccess',
			),
			divided: true,
		});
	}

	if (canDelete.value) {
		items.push({
			value: 'delete',
			label: locale.baseText('agents.list.actions.delete'),
			divided: true,
			destructive: true,
		});
	}

	return items;
});

const showActions = computed(() => actions.value.length > 0);

const formattedCreatedAtDate = computed(() => {
	const currentYear = new Date().getFullYear().toString();

	return dateformat(
		props.agent.createdAt,
		`d mmmm${String(props.agent.createdAt).startsWith(currentYear) ? '' : ', yyyy'}`,
	);
});

async function onAction(action: string) {
	if (action === 'publish') {
		const updated = await publish(props.projectId, props.agent.id);
		if (updated) emit('published', updated);
	} else if (action === 'unpublish') {
		const updated = await unpublish(props.projectId, props.agent.id, props.agent.name);
		if (updated) emit('unpublished', updated);
	} else if (action === 'toggleFavorite') {
		await favoriteStore.toggleFavorite(props.agent.id, 'agent');
	} else if (action === 'toggleMCPAccess') {
		await toggleMCPAccess(!isAvailableInMCP.value);
	} else if (action === 'delete') {
		const confirmed = await openAgentConfirmationModal({
			title: locale.baseText('agents.delete.modal.title', {
				interpolate: { name: props.agent.name },
			}),
			description: locale.baseText('agents.delete.modal.description', {
				interpolate: { name: props.agent.name },
			}),
			isDestructive: true,
			confirmButtonText: locale.baseText('agents.delete.modal.button.delete'),
			cancelButtonText: locale.baseText('generic.cancel'),
		});
		if (confirmed !== MODAL_CONFIRM) return;
		await deleteAgent(rootStore.restApiContext, props.projectId, props.agent.id);
		removeProjectAgentFromListCache(props.projectId, props.agent.id);
		favoriteStore.removeFavoriteLocally(props.agent.id, 'agent');
		emit('deleted', props.agent.id);
	} else if (action === 'duplicate') {
		emit('duplicate', props.agent.id);
	}
}

async function toggleMCPAccess(enabled: boolean) {
	try {
		await mcpStore.toggleAgentMcpAccess(props.agent.id, enabled);
		mcpToggleStatus.value = enabled;
		if (enabled) {
			mcp.trackMcpAccessEnabledForAgent(props.agent.id);
		}
	} catch (error) {
		toast.showError(error, locale.baseText('agents.toggleMCP.error.title'));
	}
}
</script>

<template>
	<N8nCard data-test-id="agent-card" @click="emit('select', agent.id)">
		<ResourceListRow>
			<template #name>
				<N8nIcon :class="$style.cardIcon" icon="bot" size="large" data-test-id="agent-card-icon" />
				<N8nText
					tag="h2"
					:bold="!isUntitled"
					:color="isUntitled ? 'text-light' : undefined"
					:class="[$style.cardHeading, { [$style.untitledName]: isUntitled }]"
					data-test-id="agent-card-name"
				>
					{{ agent.name }}
				</N8nText>
				<span v-if="isPublished" :class="$style.mcpIndicator" @click.stop>
					<PublicationIndicator
						:label="
							locale.baseText(
								hasUnpublishedChanges ? 'agents.list.changesToPublish' : 'agents.list.published',
							)
						"
						:variant="hasUnpublishedChanges ? 'warning' : 'success'"
						:data-state="hasUnpublishedChanges ? 'changes-to-publish' : 'published'"
						data-test-id="agent-card-publish-indicator"
					/>
				</span>
				<N8nBadge
					v-if="!canUpdate"
					:class="$style.readonlyBadge"
					variant="outline"
					data-test-id="agent-card-readonly-badge"
				>
					{{ locale.baseText('agents.list.readonly') }}
				</N8nBadge>
				<span v-if="showMcpIndicator" :class="$style.mcpIndicator" data-test-id="agent-card-mcp">
					<N8nTooltip placement="right" :content="locale.baseText('agents.list.availableInMCP')">
						<N8nIcon icon="mcp" size="medium" />
					</N8nTooltip>
				</span>
			</template>
			<template #updated>
				<N8nText size="small" color="text-light" :class="$style.meta">
					<TimeAgo :date="String(agent.updatedAt)" />
				</N8nText>
			</template>
			<template #created>
				<N8nText size="small" color="text-light" :class="$style.meta">
					{{ formattedCreatedAtDate }}
				</N8nText>
			</template>
			<template #actions>
				<span :class="$style.cellContent" @click.stop>
					<N8nTooltip :content="locale.baseText('agents.list.actions.newChat')">
						<N8nIconButton
							icon="message-circle-plus"
							variant="ghost"
							size="medium"
							:aria-label="locale.baseText('agents.list.actions.newChat')"
							data-test-id="agent-card-new-chat"
							@click="emit('new-chat', agent.id, projectId)"
						/>
					</N8nTooltip>
					<span v-if="showActions" data-row-menu>
						<N8nActionToggle
							:actions="actions"
							theme="dark"
							data-test-id="agent-card-actions"
							@action="onAction"
						/>
					</span>
				</span>
			</template>
		</ResourceListRow>
	</N8nCard>
</template>

<style lang="scss" module>
.cardIcon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.cardHeading {
	min-width: 0;
	font-size: var(--font-size--sm);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.untitledName {
	font-style: italic;
}

.readonlyBadge {
	flex-shrink: 0;
}

.mcpIndicator {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
}

.meta {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

// Controls in a cell must not open the agent.
.cellContent {
	display: contents;
}
</style>
