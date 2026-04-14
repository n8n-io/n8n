<script setup lang="ts">
import { N8nCard, N8nText, N8nActionDropdown } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { publishAgent, unpublishAgent, deleteAgent } from '../composables/useAgentApi';
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
const message = useMessage();
const { showMessage } = useToast();

function getActions() {
	const isPublished = props.agent.activeVersionId !== null;
	return [
		isPublished
			? { id: 'unpublish', label: locale.baseText('agents.list.actions.unpublish') }
			: { id: 'publish', label: locale.baseText('agents.list.actions.publish') },
		{ id: 'delete', label: locale.baseText('agents.list.actions.delete'), divided: true },
	];
}

async function onAction(action: string) {
	if (action === 'publish') {
		const updated = await publishAgent(rootStore.restApiContext, props.projectId, props.agent.id);
		emit('published', updated);
		showMessage({ title: locale.baseText('agents.list.toast.published'), type: 'success' });
	} else if (action === 'unpublish') {
		const confirmed = await message.confirm(
			locale.baseText('agents.unpublish.modal.description'),
			locale.baseText('agents.unpublish.modal.title'),
			{
				confirmButtonText: locale.baseText('agents.unpublish.modal.button.unpublish'),
				cancelButtonText: locale.baseText('generic.cancel'),
				type: 'warning',
			},
		);
		if (confirmed !== MODAL_CONFIRM) return;
		const updated = await unpublishAgent(rootStore.restApiContext, props.projectId, props.agent.id);
		emit('unpublished', updated);
		showMessage({ title: locale.baseText('agents.list.toast.unpublished'), type: 'success' });
	} else if (action === 'delete') {
		const confirmed = await message.confirm(
			locale.baseText('agents.builder.deleteConfirmMessage', {
				interpolate: { name: props.agent.name },
			}),
			locale.baseText('agents.builder.deleteAgent'),
			{
				confirmButtonText: locale.baseText('agents.builder.deleteConfirmButton'),
				cancelButtonText: locale.baseText('generic.cancel'),
				type: 'warning',
			},
		);
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
					v-if="agent.activeVersionId !== null && agent.activeVersionId === agent.versionId"
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
	background-color: var(--color--mint-600);
}
</style>
