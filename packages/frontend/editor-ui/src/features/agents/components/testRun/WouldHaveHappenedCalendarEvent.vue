<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import WouldHaveHappenedCard from './WouldHaveHappenedCard.vue';
import WouldHaveHappenedField from './WouldHaveHappenedField.vue';
import WouldHaveHappenedList from './WouldHaveHappenedList.vue';
import WouldHaveHappenedText from './WouldHaveHappenedText.vue';
import type { WouldHaveHappenedCalendarEventPreview } from './wouldHaveHappened.types';
import { formatPreviewDate, presentList, presentText } from './wouldHaveHappened.utils';

const props = defineProps<{
	preview: WouldHaveHappenedCalendarEventPreview;
}>();

const i18n = useI18n();

const title = computed(() => presentText(props.preview.title));
const start = computed(() => formatPreviewDate(props.preview.start, i18n.locale));
const end = computed(() => formatPreviewDate(props.preview.end, i18n.locale));
const location = computed(() => presentText(props.preview.location)?.trim());
const attendees = computed(() => presentList(props.preview.attendees));
const description = computed(() => presentText(props.preview.description));

const when = computed(() => {
	if (start.value && end.value) {
		return i18n.baseText('agents.testRun.preview.dateRange', {
			interpolate: { start: start.value, end: end.value },
		});
	}
	if (start.value) {
		return i18n.baseText('agents.testRun.preview.dateStart', {
			interpolate: { start: start.value },
		});
	}
	if (end.value) {
		return i18n.baseText('agents.testRun.preview.dateEnd', { interpolate: { end: end.value } });
	}
	return undefined;
});

const hasFields = computed(() =>
	Boolean(when.value || location.value || attendees.value.length > 0),
);
const isEmpty = computed(() => !hasFields.value && !title.value && !description.value);
</script>

<template>
	<WouldHaveHappenedCard
		:preview="preview"
		:heading="i18n.baseText('agents.testRun.preview.kind.calendarEvent')"
		icon="calendar"
		:empty="isEmpty"
	>
		<WouldHaveHappenedText v-if="title" :text="title" emphasis :max-chars="160" :max-lines="2" />
		<dl v-if="hasFields" :class="$style.fields">
			<WouldHaveHappenedField
				v-if="when"
				:label="i18n.baseText('agents.testRun.preview.field.when')"
			>
				{{ when }}
			</WouldHaveHappenedField>
			<WouldHaveHappenedField
				v-if="location"
				:label="i18n.baseText('agents.testRun.preview.field.location')"
			>
				{{ location }}
			</WouldHaveHappenedField>
			<WouldHaveHappenedField
				v-if="attendees.length > 0"
				:label="i18n.baseText('agents.testRun.preview.field.attendees')"
			>
				<WouldHaveHappenedList :items="attendees" />
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
