<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

import type { SetupTask, SetupTaskId } from './agentSetupTasks.registry';

defineProps<{
	tasks: Array<SetupTask<SetupTaskId>>;
}>();

const i18n = useI18n();
</script>

<template>
	<div data-testid="agent-setup-tasks">
		<p v-for="task in tasks" :key="task.id">{{ i18n.baseText(task.titleKey) }}: {{ task.state }}</p>
	</div>
</template>
