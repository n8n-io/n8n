<script setup lang="ts">
import WouldHaveHappenedCalendarEvent from './WouldHaveHappenedCalendarEvent.vue';
import WouldHaveHappenedChatMessage from './WouldHaveHappenedChatMessage.vue';
import WouldHaveHappenedEmail from './WouldHaveHappenedEmail.vue';
import WouldHaveHappenedGeneric from './WouldHaveHappenedGeneric.vue';
import WouldHaveHappenedIssue from './WouldHaveHappenedIssue.vue';
import WouldHaveHappenedTableRow from './WouldHaveHappenedTableRow.vue';
import { computed } from 'vue';

import type {
	WouldHaveHappenedGenericPreview,
	WouldHaveHappenedPreviewInput,
} from './wouldHaveHappened.types';
import { isPreviewKind } from './wouldHaveHappened.types';

/** Shows the preview card for the kind of action. */
const props = defineProps<{
	preview: WouldHaveHappenedPreviewInput;
}>();

/**
 * A kind this client doesn't know may come from a newer server. Show its fields on the
 * generic card instead of hiding them.
 */
const genericPreview = computed((): WouldHaveHappenedGenericPreview => {
	const preview = props.preview;
	if (isPreviewKind(preview, 'generic')) return preview;
	const { kind: _kind, toolName, app, ...fields } = preview;
	return { kind: 'generic', toolName, ...(app ? { app } : {}), input: fields };
});
</script>

<template>
	<WouldHaveHappenedEmail v-if="isPreviewKind(preview, 'email')" :preview="preview" />
	<WouldHaveHappenedChatMessage
		v-else-if="isPreviewKind(preview, 'chatMessage')"
		:preview="preview"
	/>
	<WouldHaveHappenedIssue v-else-if="isPreviewKind(preview, 'issue')" :preview="preview" />
	<WouldHaveHappenedTableRow v-else-if="isPreviewKind(preview, 'tableRow')" :preview="preview" />
	<WouldHaveHappenedCalendarEvent
		v-else-if="isPreviewKind(preview, 'calendarEvent')"
		:preview="preview"
	/>
	<WouldHaveHappenedGeneric v-else :preview="genericPreview" />
</template>
