<script setup lang="ts">
import type { PublishJudgeSettings } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { fetchPublishJudge } from './publish-judge.api';

/** Read-only: an instance admin sets the judge, and the project sees which one reviews it. */
const props = defineProps<{ projectId: string }>();

const i18n = useI18n();
const rootStore = useRootStore();

const judge = ref<PublishJudgeSettings | null>(null);

const summary = computed(() => {
	if (!judge.value) return i18n.baseText('publishJudge.project.none');

	const { judgeType, judgeName, judgeId } = judge.value;

	return i18n.baseText(`publishJudge.project.reviewedBy.${judgeType}`, {
		interpolate: { name: judgeName ?? judgeId },
	});
});

watch(
	() => props.projectId,
	async (projectId) => {
		// A failed read shows "no judge": the section is information, not a control.
		judge.value = await fetchPublishJudge(rootStore.restApiContext, projectId).catch(() => null);
	},
	{ immediate: true },
);
</script>

<template>
	<fieldset :class="$style.section" data-test-id="project-publish-judge-section">
		<h3>
			<label>{{ i18n.baseText('publishJudge.section.project') }}</label>
		</h3>
		<N8nText tag="p" data-test-id="project-publish-judge-summary">{{ summary }}</N8nText>
		<N8nText tag="p" size="small" color="text-light">
			{{ i18n.baseText('publishJudge.project.managedByAdmin') }}
		</N8nText>
	</fieldset>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-bottom: var(--spacing--xl);
}
</style>
