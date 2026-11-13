<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import WouldHaveHappenedCard from './WouldHaveHappenedCard.vue';
import WouldHaveHappenedField from './WouldHaveHappenedField.vue';
import WouldHaveHappenedList from './WouldHaveHappenedList.vue';
import WouldHaveHappenedText from './WouldHaveHappenedText.vue';
import type { WouldHaveHappenedEmailPreview } from './wouldHaveHappened.types';
import { presentList, presentText } from './wouldHaveHappened.utils';

const props = defineProps<{
	preview: WouldHaveHappenedEmailPreview;
}>();

const i18n = useI18n();

const to = computed(() => presentList(props.preview.to));
const cc = computed(() => presentList(props.preview.cc));
const bcc = computed(() => presentList(props.preview.bcc));
const subject = computed(() => presentText(props.preview.subject));
const body = computed(() => presentText(props.preview.body));

const hasRecipients = computed(
	() => to.value.length > 0 || cc.value.length > 0 || bcc.value.length > 0,
);
const isEmpty = computed(() => !hasRecipients.value && !subject.value && !body.value);
</script>

<template>
	<WouldHaveHappenedCard
		:preview="preview"
		:heading="i18n.baseText('agents.testRun.preview.kind.email')"
		icon="mail"
		:empty="isEmpty"
	>
		<dl v-if="hasRecipients" :class="$style.fields">
			<WouldHaveHappenedField
				v-if="to.length > 0"
				:label="i18n.baseText('agents.testRun.preview.field.to')"
			>
				<WouldHaveHappenedList :items="to" />
			</WouldHaveHappenedField>
			<WouldHaveHappenedField
				v-if="cc.length > 0"
				:label="i18n.baseText('agents.testRun.preview.field.cc')"
			>
				<WouldHaveHappenedList :items="cc" />
			</WouldHaveHappenedField>
			<WouldHaveHappenedField
				v-if="bcc.length > 0"
				:label="i18n.baseText('agents.testRun.preview.field.bcc')"
			>
				<WouldHaveHappenedList :items="bcc" />
			</WouldHaveHappenedField>
		</dl>
		<WouldHaveHappenedText
			v-if="subject"
			:text="subject"
			emphasis
			:max-chars="160"
			:max-lines="2"
		/>
		<WouldHaveHappenedText v-if="body" :text="body" />
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
