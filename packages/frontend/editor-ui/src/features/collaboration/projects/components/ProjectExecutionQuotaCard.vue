<script setup lang="ts">
import { computed, onMounted, ref, useCssModule } from 'vue';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useProjectsStore } from '../projects.store';
import type { ProjectExecutionQuota } from '../projects.types';

const props = defineProps<{ projectId: string }>();

const i18n = useI18n();
const toast = useToast();
const $style = useCssModule();
const projectsStore = useProjectsStore();

const quota = ref<ProjectExecutionQuota>();

onMounted(async () => {
	try {
		quota.value = await projectsStore.getExecutionQuota(props.projectId);
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.executionQuota.card.loadError'));
	}
});

const isUnlimited = computed(() => quota.value?.remaining === null);
const isOverQuota = computed(() => quota.value !== undefined && quota.value.remaining === 0);
const statusClass = computed(() => (isOverQuota.value ? $style.danger : $style.neutral));
</script>

<template>
	<div v-if="quota" :class="[$style.card, statusClass]" data-test-id="project-execution-quota-card">
		<N8nText tag="strong" size="small">
			{{ i18n.baseText('projects.executionQuota.card.title') }}
		</N8nText>
		<N8nText tag="span" size="large" bold>
			{{ quota.consumed }} / {{ isUnlimited ? '∞' : quota.limit }}
		</N8nText>
		<N8nText tag="small" color="text-light">{{ quota.periodUnit }}</N8nText>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: 6px;
}
.neutral {
	color: var(--color--text--shade-1);
}
.danger {
	color: var(--color--danger);
	border-color: var(--color--danger);
}
</style>
