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
	WouldHaveHappenedPreview,
} from './wouldHaveHappened.types';

/** Shows the preview card for the kind of action. */
const props = defineProps<{
	preview: WouldHaveHappenedPreview;
}>();

/**
 * A kind this client doesn't know may come from a newer server. Show its fields on the
 * generic card instead of hiding them.
 */
const genericPreview = computed((): WouldHaveHappenedGenericPreview => {
	const preview = props.preview as WouldHaveHappenedPreview & Record<string, unknown>;
	if (preview.kind === 'generic') return preview;
	const { kind: _kind, toolName, app, ...fields } = preview;
	return { kind: 'generic', toolName, ...(app ? { app } : {}), input: fields };
});
</script>

<template>
	<WouldHaveHappenedEmail v-if="preview.kind === 'email'" :preview="preview" />
	<WouldHaveHappenedChatMessage v-else-if="preview.kind === 'chatMessage'" :preview="preview" />
	<WouldHaveHappenedIssue v-else-if="preview.kind === 'issue'" :preview="preview" />
	<WouldHaveHappenedTableRow v-else-if="preview.kind === 'tableRow'" :preview="preview" />
	<WouldHaveHappenedCalendarEvent v-else-if="preview.kind === 'calendarEvent'" :preview="preview" />
	<WouldHaveHappenedGeneric v-else :preview="genericPreview" />
</template>
