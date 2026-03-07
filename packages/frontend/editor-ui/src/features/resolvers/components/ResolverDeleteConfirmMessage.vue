<script lang="ts" setup>
import type { CredentialResolverAffectedWorkflow } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const MAX_DISPLAYED_WORKFLOWS = 5;

const props = defineProps<{
	resolverName: string;
	affectedWorkflows: CredentialResolverAffectedWorkflow[];
}>();

const i18n = useI18n();

const displayed = computed(() => props.affectedWorkflows.slice(0, MAX_DISPLAYED_WORKFLOWS));
const remaining = computed(() => props.affectedWorkflows.length - displayed.value.length);
</script>

<template>
	<div :class="$style.container">
		<N8nText>
			{{
				i18n.baseText('credentialResolverEdit.confirmMessage.deleteResolver.messageWithWorkflows', {
					interpolate: { savedResolverName: props.resolverName },
				})
			}}
		</N8nText>
		<ul :class="$style.workflowList">
			<li v-for="workflow in displayed" :key="workflow.id" :class="$style.workflowItem">
				<N8nText bold>{{ workflow.name }}</N8nText>
			</li>
		</ul>
		<N8nText v-if="remaining > 0" size="small" color="text-light">
			{{
				i18n.baseText('credentialResolverEdit.confirmMessage.deleteResolver.andMore', {
					interpolate: { count: String(remaining) },
				})
			}}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.workflowList {
	margin: 0;
	padding-left: var(--spacing--md);
	list-style: disc;
}

.workflowItem {
	padding: var(--spacing--4xs) 0;
}
</style>
