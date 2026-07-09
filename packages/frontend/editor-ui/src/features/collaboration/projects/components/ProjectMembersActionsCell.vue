<script lang="ts" setup>
import type { ProjectMemberData } from '../projects.types';
import type { UserAction } from '@n8n/design-system';

import { N8nActionToggle } from '@n8n/design-system';
const props = defineProps<{
	data: ProjectMemberData;
	actions: Array<UserAction<ProjectMemberData>>;
}>();

const emit = defineEmits<{
	action: [value: { action: string; userId: string }];
}>();

const onAction = (action: string) => {
	emit('action', { action, userId: props.data.id });
};
</script>

<template>
	<N8nActionToggle
		v-if="props.actions.length > 0"
		placement="bottom"
		:actions="props.actions"
		theme="dark"
		@action="onAction"
	/>
</template>
