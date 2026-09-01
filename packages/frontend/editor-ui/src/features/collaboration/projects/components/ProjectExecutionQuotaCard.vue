<script setup lang="ts">
import { computed, ref, useCssModule, watch } from 'vue';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useProjectsStore } from '../projects.store';
import type { ProjectExecutionQuota } from '../projects.types';

const props = defineProps<{ projectId: string }>();

const i18n = useI18n();
const toast = useToast();
const $style = useCssModule();
const projectsStore = useProjectsStore();

const quota = ref<ProjectExecutionQuota>();

const fetchQuota = async () => {
	try {
		quota.value = await projectsStore.getExecutionQuota(props.projectId);
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.executionQuota.card.loadError'));
	}
};

// `projectId` changes without a remount when navigating between projects
// (they share the same named route), so this must be a watcher, not
// onMounted, or the card keeps showing the previous project's numbers.
watch(() => props.projectId, fetchQuota, { immediate: true });

const isUnlimited = computed(() => quota.value?.remaining === null);
const isOverQuota = computed(() => quota.value !== undefined && quota.value.remaining === 0);
const statusClass = computed(() => (isOverQuota.value ? $style.danger : $style.neutral));

// Capped at 100% — `consumed` can exceed `limit` momentarily (the counter
// increments before the gate's own check is re-read by a concurrent
// execution), and an unlimited project has no meaningful percentage at all.
const progressPercent = computed(() => {
	if (!quota.value || isUnlimited.value || quota.value.limit <= 0) return 0;
	return Math.min(100, (quota.value.consumed / quota.value.limit) * 100);
});
</script>

<template>
	<div v-if="quota" :class="[$style.card, statusClass]" data-test-id="project-execution-quota-card">
		<N8nText tag="strong" size="small">
			{{ i18n.baseText('projects.executionQuota.card.title') }}
		</N8nText>
		<N8nText tag="span" size="large" bold>
			{{ quota.consumed }} / {{ isUnlimited ? '∞' : quota.limit }}
		</N8nText>
		<div
			v-if="!isUnlimited"
			:class="$style.progressTrack"
			data-test-id="project-execution-quota-progress"
			role="progressbar"
			:aria-valuenow="Math.round(progressPercent)"
			aria-valuemin="0"
			aria-valuemax="100"
		>
			<div :class="$style.progressFill" :style="{ width: `${progressPercent}%` }" />
		</div>
		<N8nText tag="small" color="text-light">{{ quota.periodUnit }}</N8nText>
		<N8nText tag="small" color="text-light" data-test-id="project-execution-quota-resets-at">
			{{ i18n.baseText('projects.executionQuota.card.resetsAt') }}
			<TimeAgo :date="quota.resetsAt" />
		</N8nText>
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
.progressTrack {
	width: 100%;
	height: 6px;
	border-radius: 3px;
	background-color: var(--color--foreground);
	overflow: hidden;
}
.progressFill {
	height: 100%;
	border-radius: 3px;
	background-color: currentColor;
	transition: width 0.2s ease;
}
</style>
