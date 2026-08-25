<script setup lang="ts">
import { WORKFLOW_REVIEW_TEXT_MAX_LENGTH } from '@n8n/api-types';
import { N8nChatInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useResizeObserver } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

import { useReviewActivityStore } from '../reviewActivity.store';

const props = defineProps<{ canComment: boolean }>();

const rootRef = ref<HTMLElement | null>(null);

// The composer sits at the bottom of the feed's scroll container, so growing while
// the viewer types would push the send button below the fold. Following every height
// increase keeps it in view — and because the input animates its growth, the repeated
// nudges track the animation frame by frame.
let lastObservedHeight = 0;
useResizeObserver(rootRef, (observerEntries) => {
	const height = observerEntries[0]?.contentRect.height ?? 0;
	// Skip the initial measurement: the feed owns the initial scroll position.
	if (lastObservedHeight > 0 && height > lastObservedHeight) {
		rootRef.value?.scrollIntoView({ block: 'nearest' });
	}
	lastObservedHeight = height;
});

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
		draft.value.length > WORKFLOW_REVIEW_TEXT_MAX_LENGTH ||
		!props.canComment,
);

async function onSubmit() {
	const submitted = draft.value;
	const body = submitted.trim();
	if (!body) return;

	try {
		// A stale post belongs to the review the viewer left, so its completion must not
		// touch the draft they are typing now, even if the two strings happen to match.
		const posted = await store.postComment(body);
		// Don't clear text typed while the post was in flight.
		if (posted && draft.value === submitted) draft.value = '';
	} catch (error) {
		showError(error, i18n.baseText('workflowReviews.detail.activity.error.post'));
	}
}
</script>

<template>
	<!-- Implicit label: the textarea has no id to point a `for` at, and
		`inheritAttrs: false` would send an aria-label to the wrapper instead. -->
	<label ref="rootRef" :class="$style.composer">
		<span :class="$style.srOnly">
			{{ i18n.baseText('workflowReviews.detail.activity.composer.label') }}
		</span>
		<N8nChatInput
			v-model="draft"
			layout="adaptive"
			:max-length="WORKFLOW_REVIEW_TEXT_MAX_LENGTH"
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
	/* Nearly the boxed entries' negative inset (see _activity-card.scss), held back by
		the focus ring's width: flush with the feed's clip edge, the ring's left line
		would be cut off entirely. */
	margin-inline: calc(-1 * var(--spacing--sm) + var(--border-width));
	/* Include a small trailing inset in the observed box so scrollIntoView leaves
		the growing input and its focus ring clear of the scrollport edge. */
	padding-block-end: var(--spacing--4xs);
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
