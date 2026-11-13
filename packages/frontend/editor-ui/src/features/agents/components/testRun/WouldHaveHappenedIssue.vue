<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import WouldHaveHappenedCard from './WouldHaveHappenedCard.vue';
import WouldHaveHappenedField from './WouldHaveHappenedField.vue';
import WouldHaveHappenedList from './WouldHaveHappenedList.vue';
import WouldHaveHappenedText from './WouldHaveHappenedText.vue';
import type { WouldHaveHappenedIssuePreview } from './wouldHaveHappened.types';
import { formatExplicitEmpty, presentList, presentText } from './wouldHaveHappened.utils';

const props = defineProps<{
	preview: WouldHaveHappenedIssuePreview;
}>();

const i18n = useI18n();

const project = computed(
	() => formatExplicitEmpty(props.preview.project) ?? presentText(props.preview.project)?.trim(),
);
const title = computed(
	() => formatExplicitEmpty(props.preview.title) ?? presentText(props.preview.title),
);
const description = computed(
	() => formatExplicitEmpty(props.preview.description) ?? presentText(props.preview.description),
);
const assignee = computed(
	() => formatExplicitEmpty(props.preview.assignee) ?? presentText(props.preview.assignee)?.trim(),
);
const labels = computed(() => presentList(props.preview.labels ?? undefined));
const emptyLabels = computed(() => formatExplicitEmpty(props.preview.labels));

const hasFields = computed(() =>
	Boolean(project.value || assignee.value || labels.value.length || emptyLabels.value),
);
const isEmpty = computed(() => !hasFields.value && !title.value && !description.value);
</script>

<template>
	<WouldHaveHappenedCard
		:preview="preview"
		:heading="i18n.baseText('agents.testRun.preview.kind.issue')"
		icon="circle-dot"
		:empty="isEmpty"
	>
		<WouldHaveHappenedText v-if="title" :text="title" emphasis :max-chars="160" :max-lines="2" />
		<dl v-if="hasFields" :class="$style.fields">
			<WouldHaveHappenedField
				v-if="project"
				:label="i18n.baseText('agents.testRun.preview.field.project')"
			>
				{{ project }}
			</WouldHaveHappenedField>
			<WouldHaveHappenedField
				v-if="assignee"
				:label="i18n.baseText('agents.testRun.preview.field.assignee')"
			>
				{{ assignee }}
			</WouldHaveHappenedField>
			<WouldHaveHappenedField
				v-if="labels.length > 0 || emptyLabels"
				:label="i18n.baseText('agents.testRun.preview.field.labels')"
			>
				<template v-if="emptyLabels">{{ emptyLabels }}</template>
				<WouldHaveHappenedList v-else :items="labels" :max-visible="5" />
			</WouldHaveHappenedField>
		</dl>
		<WouldHaveHappenedText v-if="description" :text="description" />
	</WouldHaveHappenedCard>
</template>

<style module lang="scss">
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
}
</style>
