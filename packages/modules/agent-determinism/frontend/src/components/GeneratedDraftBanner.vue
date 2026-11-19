<script setup lang="ts">
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { WorkflowGeneratedFrom } from 'n8n-workflow';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{ generatedFrom: WorkflowGeneratedFrom; projectId: string }>();

const i18n = useI18n();
const router = useRouter();

const sourcePath = computed(() =>
	props.generatedFrom.type === 'agent'
		? `/projects/${props.projectId}/agents/${props.generatedFrom.id}`
		: `/workflow/${props.generatedFrom.id}`,
);
</script>

<template>
	<N8nCallout theme="warning" icon="info" data-test-id="generated-draft-banner">
		{{ i18n.baseText('agentDeterminism.draftBanner.text') }}
		<template #trailingContent>
			<N8nButton
				type="tertiary"
				size="small"
				data-test-id="generated-draft-banner-open-source"
				:label="i18n.baseText('agentDeterminism.draftBanner.openSource')"
				@click="router.push(sourcePath)"
			/>
		</template>
	</N8nCallout>
</template>
