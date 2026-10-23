<script lang="ts" setup>
/**
 * The bar above the composer while a cloud browser task waits for the user: one row per task,
 * whose "Take over" button opens the browser tab. A row goes away once the task stops waiting.
 */
import { N8nButton, N8nIcon, N8nSetupPanel, type SetupPanelItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject } from 'vue';

import { useCloudBrowserTasks } from '../composables/useCloudBrowserTasks';

const i18n = useI18n();
const tasks = useCloudBrowserTasks();
const openCloudBrowserTab = inject<((taskId: string) => void) | undefined>(
	'openCloudBrowserTab',
	undefined,
);

const items = computed<SetupPanelItem[]>(() =>
	tasks.value.flatMap((task) =>
		task.userAction
			? [
					{
						id: task.taskId,
						title: i18n.baseText('instanceAi.cloudBrowser.tabName'),
						completed: false,
						hasAction: true,
					},
				]
			: [],
	),
);
</script>

<template>
	<N8nSetupPanel :items="items" data-test-id="instance-ai-cloud-browser-user-action-panel">
		<template #icon>
			<N8nIcon icon="globe" size="large" />
		</template>
		<template #action="{ item }">
			<N8nButton
				size="small"
				variant="outline"
				data-test-id="instance-ai-cloud-browser-take-over"
				@click="openCloudBrowserTab?.(item.id)"
			>
				{{ i18n.baseText('instanceAi.cloudBrowser.takeOver') }}
			</N8nButton>
		</template>
	</N8nSetupPanel>
</template>
