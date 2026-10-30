<script setup lang="ts">
import { computed } from 'vue';
import type { AgentVersionListItemDto } from '@n8n/api-types';
import type { UserAction } from '@n8n/design-system';
import { N8nActionToggle, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import type { IUser } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import AgentVersionStatusIndicator from './AgentVersionStatusIndicator.vue';
import { getVersionLabel } from '@n8n/composables/useWorkflowVersionLabel';
import { formatTimestamp } from './agentVersionHistory.utils';

export type AgentVersionAction = 'edit' | 'revert' | 'publish' | 'unpublish';

const props = defineProps<{
	item: AgentVersionListItemDto;
	actions: Array<UserAction<IUser>>;
}>();

const emit = defineEmits<{
	action: [value: { action: AgentVersionAction; versionId: string }];
}>();

const i18n = useI18n();

const versionLabel = computed(() =>
	getVersionLabel({
		workflowHistory: props.item,
		currentVersionId: props.item.isCurrent ? props.item.versionId : undefined,
	}),
);

const formattedCreatedAt = computed(() => {
	const { date, time } = formatTimestamp(props.item.createdAt);
	return i18n.baseText('agents.versionHistory.item.createdAt', {
		interpolate: { date, time },
	});
});

const status = computed(() =>
	props.item.isActive ? 'published' : props.item.isCurrent ? 'latest' : 'default',
);

const statusLabel = computed(() => {
	if (props.item.isActive) {
		return i18n.baseText('agents.versionHistory.item.publishedBadge');
	}

	if (props.item.isCurrent) {
		return i18n.baseText('agents.versionHistory.item.currentDraft');
	}

	return i18n.baseText('agents.versionHistory.item.savedVersion');
});

const statusTooltip = computed(() => {
	const publication = props.item.lastPublished;
	if (!publication) return statusLabel.value;
	const { date, time } = formatTimestamp(publication.createdAt);
	return `${statusLabel.value}. ${i18n.baseText('agents.versionHistory.item.lastPublished', {
		interpolate: { author: publication.author, date, time },
	})}`;
});

function onAction(value: string) {
	emit('action', {
		action: value as AgentVersionAction,
		versionId: props.item.versionId,
	});
}
</script>

<template>
	<li
		:class="[$style.item, { [$style.current]: item.isCurrent }]"
		data-test-id="agent-version-history-list-item"
	>
		<N8nTooltip :content="statusTooltip">
			<span :class="$style.timelineColumn" :aria-label="statusLabel" role="img" tabindex="0">
				<AgentVersionStatusIndicator :status="status" />
			</span>
		</N8nTooltip>

		<div :class="$style.content">
			<div :class="$style.mainRow">
				<N8nText
					size="small"
					:bold="true"
					color="text-dark"
					:class="$style.mainLine"
					:title="versionLabel"
				>
					{{ versionLabel }}
				</N8nText>
			</div>
			<N8nText
				v-if="item.description"
				size="small"
				color="text-base"
				:class="$style.description"
				:title="item.description"
			>
				{{ item.description }}
			</N8nText>
			<div :class="$style.metaRow">
				<N8nText size="small" color="text-base" :class="$style.metaAuthor">
					{{ item.author }},
				</N8nText>
				<N8nText tag="time" size="small" color="text-base" :class="$style.metaTime">
					{{ formattedCreatedAt }}
				</N8nText>
			</div>
		</div>

		<N8nActionToggle
			v-if="actions.length > 0"
			:class="$style.actions"
			:actions="actions"
			placement="bottom-end"
			data-test-id="agent-version-history-item-actions"
			@action="onAction"
			@click.stop
		>
			<N8nIconButton
				icon="ellipsis-12"
				variant="ghost"
				size="small"
				:aria-label="
					i18n.baseText('agents.versionHistory.item.actions.label', {
						interpolate: { version: versionLabel },
					})
				"
			/>
		</N8nActionToggle>
	</li>
</template>

<style module lang="scss">
.item {
	display: flex;
	position: relative;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--2xs);
	line-height: var(--line-height--xl);
	border-radius: var(--radius);
	&:not(:last-child)::after {
		content: '';
		position: absolute;
		left: calc(var(--spacing--2xs) + var(--spacing--lg) / 2);
		top: calc(50% + var(--spacing--xs));
		bottom: calc(-50% + var(--spacing--xs));
		border-left: var(--border);
		pointer-events: none;
	}

	& + & {
		margin-top: var(--spacing--xs);
	}
}

.current {
	background: var(--background--subtle);
}

.description {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	overflow-wrap: anywhere;
	white-space: pre-line;
}

.timelineColumn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	min-width: var(--spacing--lg);
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-width: 0;
}

.mainRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.mainLine {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.metaRow {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.metaAuthor {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	max-width: 100%;
}

.metaTime {
	flex-shrink: 0;
}

.actions {
	flex-shrink: 0;
	margin-right: var(--spacing--3xs);
}
</style>
