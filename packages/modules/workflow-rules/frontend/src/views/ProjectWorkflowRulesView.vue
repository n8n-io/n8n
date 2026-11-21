<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import WorkflowRulesEditor from '../admin/WorkflowRulesEditor.vue';

const i18n = useI18n();
const route = useRoute();

const projectId = computed(() =>
	typeof route.params.projectId === 'string' ? route.params.projectId : null,
);
</script>

<template>
	<div :class="$style.page" data-test-id="project-workflow-rules">
		<N8nText size="small" color="text-light" tag="p" :class="$style.intro">
			{{ i18n.baseText('workflowRules.project.intro') }}
		</N8nText>
		<WorkflowRulesEditor v-if="projectId" :key="projectId" :project-id="projectId" />
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--md) 0;
	// Matches the width of the instance settings page; no layout token exists for it.
	max-width: 960px;
}

.intro {
	margin: 0;
}
</style>
