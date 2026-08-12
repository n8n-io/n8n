<script setup lang="ts">
import { WORKFLOW_REVIEW_COMMENT_MAX_LENGTH } from '@n8n/api-types';
import { N8nChatInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useReviewActivityStore } from '../reviewActivity.store';

const props = defineProps<{ canComment: boolean }>();

const i18n = useI18n();
const { showError } = useToast();
const store = useReviewActivityStore();
const { posting, draft } = storeToRefs(store);

// The full condition, not just `posting`: N8nChatInput uses `submitDisabled ?? …`,
// so a bare `false` would replace its own empty/over-limit/disabled gate.
const submitDisabled = computed(
	() =>
		posting.value ||
		draft.value.trim().length === 0 ||
		draft.value.length > WORKFLOW_REVIEW_COMMENT_MAX_LENGTH ||
		!props.canComment,
);

async function onSubmit() {
	const submitted = draft.value;
	const body = submitted.trim();
	if (!body) return;

	try {
		await store.postComment(body);
		// Don't clear text typed while the post was in flight.
		if (draft.value === submitted) draft.value = '';
	} catch (error) {
		showError(error, i18n.baseText('workflowReviews.detail.activity.error.post'));
	}
}
</script>

<template>
	<!-- Implicit label: the textarea has no id to point a `for` at, and
		`inheritAttrs: false` would send an aria-label to the wrapper instead. -->
	<label :class="$style.composer">
		<span :class="$style.srOnly">
			{{ i18n.baseText('workflowReviews.detail.activity.composer.label') }}
		</span>
		<N8nChatInput
			v-model="draft"
			:max-length="WORKFLOW_REVIEW_COMMENT_MAX_LENGTH"
			:placeholder="i18n.baseText('workflowReviews.detail.activity.composer.placeholder')"
			refocus-after-send
			:disabled="!canComment"
			:disabled-tooltip="i18n.baseText('workflowReviews.detail.activity.composer.notAllowed')"
			:submit-disabled="submitDisabled"
			data-test-id="workflow-review-comment-composer"
			@submit="onSubmit"
		/>
	</label>
</template>

<style lang="scss" module>
.composer {
	display: block;
	flex-shrink: 0;
	border-top: var(--border);
	/* The panel around this clips overflow, and the input draws its focus ring outside its own
	   box, so without clearance on these three sides the ring is cut off. */
	padding: var(--spacing--sm) var(--spacing--3xs) var(--spacing--3xs);
}

.srOnly {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}
</style>
