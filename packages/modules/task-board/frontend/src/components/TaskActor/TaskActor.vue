<script setup lang="ts">
import type { TaskBoardActorRef } from '@n8n/api-types';
import { N8nAvatar, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { splitName } from '../../task-board.utils';

/** Shows a person with an avatar, and an agent or a workflow with an icon. */
const props = defineProps<{
	actor: TaskBoardActorRef | null;
	size: 'xsmall' | 'small';
}>();
const i18n = useI18n();

const personName = computed(() => splitName(props.actor?.name ?? ''));
const icon = computed(() => (props.actor?.type === 'workflow' ? 'workflow' : 'bot'));
</script>

<template>
	<span :class="$style.actor" data-test-id="task-board-actor">
		<template v-if="actor">
			<N8nAvatar
				v-if="actor.type === 'user'"
				:first-name="personName.firstName"
				:last-name="personName.lastName"
				:size="size"
			/>
			<N8nIcon v-else :icon="icon" :size="size === 'xsmall' ? 'small' : 'medium'" color="primary" />
			<N8nText :size="size" color="text-base" :class="$style.name">{{ actor.name }}</N8nText>
		</template>
		<N8nText v-else :size="size" color="text-light">
			{{ i18n.baseText('taskBoard.assignee.unassigned') }}
		</N8nText>
	</span>
</template>

<style lang="scss" module>
.actor {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
