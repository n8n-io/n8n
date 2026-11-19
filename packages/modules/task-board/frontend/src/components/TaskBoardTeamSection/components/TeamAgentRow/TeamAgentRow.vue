<script setup lang="ts">
import { N8nBadge, N8nButton, N8nCard, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { RouteLocationRaw } from 'vue-router';

import type { TeamAgent } from '../../../../task-board.types';

defineProps<{
	agent: TeamAgent;
	editorRoute: RouteLocationRaw;
	canEdit: boolean;
	publishing: boolean;
}>();
const emit = defineEmits<{ edit: []; publish: [] }>();
const i18n = useI18n();
</script>

<template>
	<N8nCard :class="$style.row" data-test-id="task-board-team-agent">
		<template #prepend>
			<N8nIcon icon="bot" size="xlarge" color="primary" />
		</template>
		<template #header>
			<div :class="$style.title">
				<N8nText bold>{{ agent.name }}</N8nText>
				<N8nBadge v-if="agent.isPublished" variant="success" size="xsmall">
					{{ i18n.baseText('taskBoard.team.agent.publishedBadge') }}
				</N8nBadge>
				<N8nBadge v-else variant="warning" size="xsmall" data-test-id="task-board-team-agent-draft">
					{{ i18n.baseText('taskBoard.team.agent.draftBadge') }}
				</N8nBadge>
			</div>
		</template>
		<div :class="$style.details">
			<N8nText v-if="agent.description" size="small" color="text-base">
				{{ agent.description }}
			</N8nText>
			<div :class="$style.meta">
				<N8nBadge variant="subtle" size="xsmall" leading-icon="brain">
					{{ agent.model ?? i18n.baseText('taskBoard.team.agent.noModel') }}
				</N8nBadge>
				<N8nBadge variant="subtle" size="xsmall" leading-icon="wrench">
					{{
						i18n.baseText('taskBoard.team.agent.skillCount', {
							adjustToNumber: agent.skillCount,
							interpolate: { count: String(agent.skillCount) },
						})
					}}
				</N8nBadge>
			</div>
			<N8nText v-if="!agent.isPublished" size="small" color="warning">
				{{ i18n.baseText('taskBoard.team.agent.draftWarning') }}
				<template v-if="agent.publishError">
					{{
						i18n.baseText('taskBoard.team.agent.draftReason', {
							interpolate: { reason: agent.publishError },
						})
					}}
				</template>
			</N8nText>
		</div>
		<template #append>
			<div :class="$style.actions">
				<N8nButton
					v-if="!agent.isPublished && canEdit"
					variant="solid"
					size="small"
					:label="i18n.baseText('taskBoard.team.agent.publish')"
					:loading="publishing"
					data-test-id="task-board-team-agent-publish"
					data-attr="task-board-team-agent-publish"
					@click="emit('publish')"
				/>
				<N8nButton
					v-if="canEdit"
					variant="outline"
					size="small"
					:label="i18n.baseText('taskBoard.team.agent.edit')"
					data-test-id="task-board-team-agent-edit"
					data-attr="task-board-team-agent-edit"
					@click="emit('edit')"
				/>
				<N8nLink :to="editorRoute" size="small" data-test-id="task-board-team-agent-open">
					{{ i18n.baseText('taskBoard.team.agent.openEditor') }}
				</N8nLink>
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.row {
	align-items: flex-start;
	gap: var(--spacing--sm);
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.meta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.actions {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
