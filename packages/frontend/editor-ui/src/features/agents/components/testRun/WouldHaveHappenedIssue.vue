<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import WouldHaveHappenedCard from './WouldHaveHappenedCard.vue';
import WouldHaveHappenedField from './WouldHaveHappenedField.vue';
import WouldHaveHappenedList from './WouldHaveHappenedList.vue';
import WouldHaveHappenedText from './WouldHaveHappenedText.vue';
import type { WouldHaveHappenedIssuePreview } from './wouldHaveHappened.types';
import { presentList, presentText } from './wouldHaveHappened.utils';

const props = defineProps<{
	preview: WouldHaveHappenedIssuePreview;
}>();

const i18n = useI18n();

const project = computed(() => presentText(props.preview.project)?.trim());
const title = computed(() => presentText(props.preview.title));
const description = computed(() => presentText(props.preview.description));
const assignee = computed(() => presentText(props.preview.assignee)?.trim());
const labels = computed(() => presentList(props.preview.labels));

const hasFields = computed(() => Boolean(project.value || assignee.value || labels.value.length));
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
				v-if="labels.length > 0"
				:label="i18n.baseText('agents.testRun.preview.field.labels')"
			>
				<WouldHaveHappenedList :items="labels" :max-visible="5" />
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
