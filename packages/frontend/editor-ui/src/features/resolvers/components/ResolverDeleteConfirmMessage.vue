<script lang="ts" setup>
import type { CredentialResolverAffectedWorkflow } from '@n8n/api-types';
import { N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';

const MAX_DISPLAYED_WORKFLOWS = 5;

const props = defineProps<{
	resolverName: string;
	affectedWorkflows: CredentialResolverAffectedWorkflow[];
}>();

const i18n = useI18n();
const router = useRouter();

const displayed = computed(() => props.affectedWorkflows.slice(0, MAX_DISPLAYED_WORKFLOWS));
const remaining = computed(() => props.affectedWorkflows.length - displayed.value.length);

const messageKey = computed(() =>
	props.affectedWorkflows.length > 0
		? 'credentialResolverEdit.confirmMessage.deleteResolver.messageWithWorkflows'
		: 'credentialResolverEdit.confirmMessage.deleteResolver.message',
);

const messageParts = computed(() => {
	const full = i18n.baseText(messageKey.value, {
		interpolate: { savedResolverName: '{{RESOLVER_NAME}}' },
	});
	const [before, after] = full.split('{{RESOLVER_NAME}}');
	return { before, after };
});
</script>

<template>
	<div :class="$style.container">
		<N8nText>
			{{ messageParts.before }}<N8nText bold tag="span">{{ props.resolverName }}</N8nText
			>{{ messageParts.after }}
		</N8nText>
		<ul v-if="affectedWorkflows.length > 0" :class="$style.workflowList">
			<li v-for="workflow in displayed" :key="workflow.id" :class="$style.workflowItem">
				<N8nLink
					:href="router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId: workflow.id } }).href"
					new-window
				>
					{{ workflow.name }}
				</N8nLink>
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
