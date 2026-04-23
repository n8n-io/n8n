<script setup lang="ts">
import { N8nCard, N8nText, N8nActionDropdown } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { MODAL_CONFIRM } from '@/app/constants';
import { deleteAgent } from '../composables/useAgentApi';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useAgentPublish } from '../composables/useAgentPublish';
import type { AgentResource } from '../types';

const props = defineProps<{
	agent: AgentResource;
	projectId: string;
}>();

const emit = defineEmits<{
	select: [agentId: string];
	published: [agent: AgentResource];
	unpublished: [agent: AgentResource];
	deleted: [agentId: string];
}>();

const locale = useI18n();
const rootStore = useRootStore();
const { openAgentConfirmationModal } = useAgentConfirmationModal();
const { publish, unpublish } = useAgentPublish();

function getActions() {
	const isPublished = props.agent.publishedVersion !== null;
	return [
		isPublished
			? { id: 'unpublish', label: locale.baseText('agents.list.actions.unpublish') }
			: { id: 'publish', label: locale.baseText('agents.list.actions.publish') },
		{ id: 'delete', label: locale.baseText('agents.list.actions.delete'), divided: true },
	];
}

async function onAction(action: string) {
	if (action === 'publish') {
		const updated = await publish(props.projectId, props.agent.id);
		if (updated) emit('published', updated);
	} else if (action === 'unpublish') {
		const updated = await unpublish(props.projectId, props.agent.id, props.agent.name);
		if (updated) emit('unpublished', updated);
	} else if (action === 'delete') {
		const confirmed = await openAgentConfirmationModal({
			title: locale.baseText('agents.delete.modal.title', {
				interpolate: { name: props.agent.name },
			}),
			description: locale.baseText('agents.delete.modal.description', {
				interpolate: { name: props.agent.name },
			}),
			confirmButtonText: locale.baseText('agents.delete.modal.button.delete'),
			cancelButtonText: locale.baseText('generic.cancel'),
		});
		if (confirmed !== MODAL_CONFIRM) return;
		await deleteAgent(rootStore.restApiContext, props.projectId, props.agent.id);
		emit('deleted', props.agent.id);
	}
}

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}
</script>

<template>
	<N8nCard
		:class="$style.card"
		hoverable
		data-testid="agent-card"
		@click="emit('select', agent.id)"
	>
		<template #header>
			<div :class="$style.cardHeader">
				<N8nText tag="h2" bold :class="$style.cardName">{{ agent.name }}</N8nText>
			</div>
		</template>
		<div :class="$style.cardDescription">
			<N8nText size="small" color="text-light">
				{{ agent.description || locale.baseText('agents.list.noDescription') }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{
					locale.baseText('agents.list.updatedAt', {
						interpolate: { date: formatDate(agent.updatedAt) },
					})
				}}
			</N8nText>
		</div>
		<template #append>
			<div :class="$style.cardActions" @click.stop>
				<div
					v-if="agent.publishedVersion !== null"
					:class="$style.publishIndicator"
					data-testid="agent-published-indicator"
				>
					<span :class="$style.publishIndicatorDot" />
					<N8nText size="small" color="text-base">
						{{ locale.baseText('agents.list.published') }}
					</N8nText>
				</div>
				<N8nActionDropdown
					:items="getActions()"
					activator-icon="ellipsis-vertical"
					data-testid="agent-card-actions"
					@select="onAction"
				/>
			</div>
		</template>
	</N8nCard>
</template>

<style module>
.card {
	cursor: pointer;
	padding: 0;
	align-items: stretch;
	transition: box-shadow var(--duration--base) var(--easing--ease-out);
	margin-bottom: var(--spacing--2xs);
}

.card:hover {
	box-shadow: var(--shadow--card-hover);
}

.cardHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) 0 0 var(--spacing--sm);
}

.cardName {
	font-size: var(--font-size--sm);
}

.cardDescription {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);
	min-height: var(--spacing--xl);
}

.cardActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--sm) 0 0;
}

.publishIndicator {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--spacing--4xs);
	border: var(--border);
}

.publishIndicatorDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	background-color: var(--color--success);
}
</style>
