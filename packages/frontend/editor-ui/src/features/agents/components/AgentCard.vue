<script setup lang="ts">
import { computed } from 'vue';
import dateformat from 'dateformat';
import { N8nActionToggle, N8nCard, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { MODAL_CONFIRM } from '@/app/constants';
import TimeAgo from '@/app/components/TimeAgo.vue';
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

const isPublished = computed(() => props.agent.publishedVersion !== null);

const actions = computed(() => {
	return [
		isPublished.value
			? { value: 'unpublish', label: locale.baseText('agents.list.actions.unpublish') }
			: { value: 'publish', label: locale.baseText('agents.list.actions.publish') },
		{ value: 'delete', label: locale.baseText('agents.list.actions.delete'), divided: true },
	];
});

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
</script>

<template>
	<N8nCard :class="$style.cardLink" data-test-id="agent-card" @click="emit('select', agent.id)">
		<template #header>
			<N8nText tag="h2" bold :class="$style.cardHeading" data-test-id="agent-card-name">
				{{ agent.name }}
			</N8nText>
		</template>
		<div :class="$style.cardDescription">
			<span>
				{{ locale.baseText('agents.list.updated') }}
				<TimeAgo :date="String(agent.updatedAt)" /> |
			</span>
			<span> {{ locale.baseText('agents.list.created') }} {{ formattedCreatedAtDate }} </span>
		</div>
		<template #append>
			<div :class="$style.cardActions" @click.stop>
				<div
					v-if="isPublished"
					:class="$style.publishIndicator"
					data-test-id="agent-card-publish-indicator"
				>
					<span :class="$style.publishIndicatorDot" />
					<N8nText size="small" color="text-base">
						{{ locale.baseText('agents.list.published') }}
					</N8nText>
				</div>
				<N8nActionToggle
					:actions="actions"
					theme="dark"
					data-test-id="agent-card-actions"
					@action="onAction"
				/>
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.cardLink {
	transition: box-shadow 0.3s ease;
	cursor: pointer;
	padding: 0;
	align-items: stretch;

	&:hover {
		box-shadow: var(--shadow--card-hover);
	}
}

.cardHeading {
	display: flex;
	align-items: center;
	font-size: var(--font-size--sm);
	word-break: break-word;
	padding: var(--spacing--sm) 0 0 var(--spacing--sm);
}

.cardDescription {
	min-height: var(--spacing--xl);
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	gap: var(--spacing--2xs);
}

.cardActions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-direction: row;
	justify-content: center;
	align-items: center;
	align-self: stretch;
	padding: 0 var(--spacing--sm) 0 0;
	cursor: default;
}

.publishIndicator {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--spacing--4xs);
	border: var(--border);

	* {
		// This is needed to line height up with ownership badge
		line-height: calc(var(--font-size--sm) + 1px);
	}
}

.publishIndicatorDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	background-color: var(--color--mint-600);
}

@include mixins.breakpoint('sm-and-down') {
	.cardLink {
		--card--padding: 0 var(--spacing--sm) var(--spacing--sm);
		--card--append--width: 100%;

		flex-direction: column;
	}

	.cardActions {
		width: 100%;
		padding: 0 var(--spacing--sm) var(--spacing--sm);
		justify-content: end;
	}
}
</style>
