<script setup lang="ts">
import { N8nAvatar, N8nBadge, N8nCard, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { TaskBoardPersonOption } from '../../../../task-board.types';
import { splitName } from '../../../../task-board.utils';
import { projectRoleKey } from '../../team.utils';

const props = defineProps<{ person: TaskBoardPersonOption }>();
const i18n = useI18n();

const name = computed(() => splitName(props.person.name));
const roleLabel = computed(() => {
	const key = projectRoleKey(props.person.role);
	// A custom role has no i18n key. Its slug without the prefix is the closest readable name.
	return key ? i18n.baseText(key) : props.person.role.replace(/^project:/, '');
});
</script>

<template>
	<N8nCard :class="$style.row" data-test-id="task-board-team-person">
		<template #prepend>
			<N8nAvatar :first-name="name.firstName" :last-name="name.lastName" size="small" />
		</template>
		<template #header>
			<div :class="$style.title">
				<N8nText bold>{{ person.name }}</N8nText>
				<N8nBadge variant="subtle" size="xsmall">{{ roleLabel }}</N8nBadge>
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.row {
	align-items: center;
	gap: var(--spacing--sm);
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}
</style>
