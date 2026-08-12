<script setup lang="ts">
import { WORKFLOW_REVIEW_COMMENT_MAX_LENGTH } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nIcon, N8nInput, N8nPopover, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { computed, ref, useId } from 'vue';

import { useReviewActivityStore } from '../reviewActivity.store';
import type { WorkflowReviewDecisionInput } from '../workflowReviews.api';

const props = defineProps<{
	deciding: boolean;
	viewerCanDecide: boolean;
	viewerCanComment: boolean;
	/** Why the viewer may not decide; empty when they may. */
	ineligibilityHint: string;
}>();

const emit = defineEmits<{
	decide: [input: WorkflowReviewDecisionInput];
	'comment-posted': [];
}>();

const i18n = useI18n();
const { showError } = useToast();
const store = useReviewActivityStore();
const { posting, decisionNote } = storeToRefs(store);

const isOpen = ref(false);
const noteInputId = useId();

const note = computed(() => decisionNote.value.trim());

const commentDisabled = computed(
	() =>
		posting.value ||
		note.value.length === 0 ||
		decisionNote.value.length > WORKFLOW_REVIEW_COMMENT_MAX_LENGTH ||
		!props.viewerCanComment,
);

function submitDecision(input: WorkflowReviewDecisionInput) {
	isOpen.value = false;
	emit('decide', input);
}

function onRequestChanges() {
	if (!note.value) return;
	submitDecision({ decision: 'changes_requested', note: note.value });
}

function onApprove() {
	// The key is omitted rather than sent empty: the DTO rejects `''`.
	submitDecision(
		note.value ? { decision: 'approved', note: note.value } : { decision: 'approved' },
	);
}

async function onComment() {
	const submitted = decisionNote.value;
	const body = submitted.trim();
	if (!body) return;

	isOpen.value = false;
	try {
		await store.postComment(body);
		// Don't clear text typed while the post was in flight.
		if (decisionNote.value === submitted) decisionNote.value = '';
		// The trigger sits outside the tab panel, so a comment posted from the Changes tab
		// would otherwise land nowhere the viewer can see.
		emit('comment-posted');
	} catch (error) {
		showError(error, i18n.baseText('workflowReviews.detail.activity.error.post'));
	}
}
</script>

<template>
	<!-- 480px deviates from Figma's 440px on purpose: the three icon+label buttons need
		~411-425px, and 440px minus the `--spacing--xs` padding leaves 416px, minus the two
		gaps 400px. N8nPopover sets a fixed width, so the row would spill rather than wrap. -->
	<N8nPopover
		v-model:open="isOpen"
		side="bottom"
		align="end"
		width="480px"
		:enable-scrolling="false"
		:content-class="$style.popover"
	>
		<template #trigger>
			<!-- The span is load-bearing: `PopoverTrigger :as-child` puts the click handler on
				its first child, and N8nTooltip only re-binds attrs in its own `as-child` branch.
				Its other branch renders a `TooltipTrigger as="span"`, which is what makes the
				hint fire over a natively disabled button. -->
			<span>
				<N8nTooltip :disabled="!ineligibilityHint" :content="ineligibilityHint" :show-after="300">
					<N8nButton
						size="small"
						:disabled="deciding || !viewerCanDecide"
						data-test-id="workflow-review-decision-trigger"
					>
						{{ i18n.baseText('workflowReviews.detail.decision.trigger') }}
						<N8nIcon icon="chevron-down" />
					</N8nButton>
				</N8nTooltip>
			</span>
		</template>
		<template #content>
			<div :class="$style.content" data-test-id="workflow-review-decision-popover">
				<N8nText tag="label" :for="noteInputId" size="small" color="text-dark">
					{{ i18n.baseText('workflowReviews.detail.decision.note.label') }}
				</N8nText>
				<N8nInput
					:id="noteInputId"
					v-model="decisionNote"
					type="textarea"
					:rows="3"
					:maxlength="WORKFLOW_REVIEW_COMMENT_MAX_LENGTH"
					:placeholder="i18n.baseText('workflowReviews.detail.decision.note.placeholder')"
					data-test-id="workflow-review-decision-note"
				/>
				<div :class="$style.actions">
					<N8nButton
						variant="outline"
						size="small"
						icon="message-square"
						:disabled="commentDisabled"
						data-test-id="workflow-review-decision-comment-button"
						@click="onComment"
					>
						{{ i18n.baseText('workflowReviews.detail.decision.comment') }}
					</N8nButton>
					<N8nTooltip
						:disabled="!!note"
						:content="i18n.baseText('workflowReviews.detail.decision.note.required')"
						:show-after="300"
					>
						<N8nButton
							variant="outline"
							size="small"
							icon="refresh-cw"
							:disabled="!note"
							data-test-id="workflow-review-decision-request-changes-button"
							@click="onRequestChanges"
						>
							{{ i18n.baseText('workflowReviews.detail.decision.requestChanges') }}
						</N8nButton>
					</N8nTooltip>
					<N8nButton
						variant="outline"
						size="small"
						icon="check"
						data-test-id="workflow-review-decision-approve-button"
						@click="onApprove"
					>
						{{ i18n.baseText('workflowReviews.detail.decision.approveAndPublish') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.popover {
	padding: var(--spacing--xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
