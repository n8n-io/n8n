<script setup lang="ts">
import { computed } from 'vue';
import type { AgentVersionListItemDto } from '@n8n/api-types';
import type { UserAction } from '@n8n/design-system';
import { N8nActionToggle, N8nText } from '@n8n/design-system';
import type { IUser } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import AgentVersionStatusIndicator from './AgentVersionStatusIndicator.vue';
import { formatTimestamp, generateVersionLabel } from './agentVersionHistory.utils';

export type AgentVersionAction = 'revert' | 'publish' | 'unpublish';

const props = defineProps<{
	item: AgentVersionListItemDto;
	actions: Array<UserAction<IUser>>;
}>();

const emit = defineEmits<{
	action: [value: { action: AgentVersionAction; versionId: string }];
}>();

const i18n = useI18n();

const versionLabel = computed(() => generateVersionLabel(props.item.versionId));

const formattedCreatedAt = computed(() => {
	const { date, time } = formatTimestamp(props.item.createdAt);
	return i18n.baseText('agents.versionHistory.item.createdAt', {
		interpolate: { date, time },
	});
});

const status = computed<'published' | 'default'>(() =>
	props.item.isActive ? 'published' : 'default',
);

function onAction(value: string) {
	emit('action', {
		action: value as AgentVersionAction,
		versionId: props.item.versionId,
	});
}
</script>

<template>
	<li :class="$style.item" data-test-id="agent-version-history-list-item">
		<span :class="$style.timelineColumn">
			<AgentVersionStatusIndicator :status="status" />
		</span>

		<div :class="$style.content">
			<div :class="$style.mainRow">
				<N8nText size="small" :bold="true" color="text-dark" :class="$style.mainLine">
					{{ versionLabel }}
					<template v-if="item.isActive">
						({{ i18n.baseText('agents.versionHistory.item.publishedBadge') }})
					</template>
				</N8nText>
			</div>
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
		/>
	</li>
</template>

<style module lang="scss">
.item {
	display: flex;
	position: relative;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	line-height: var(--line-height--xl);
	border-radius: var(--radius);
	user-select: none;

	& + & {
		margin-top: var(--spacing--xs);
	}
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
	align-items: baseline;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.metaAuthor {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	max-width: 130px;
}

.metaTime {
	flex-shrink: 0;
}

.actions {
	flex-shrink: 0;
	margin-right: var(--spacing--3xs);
}
</style>
