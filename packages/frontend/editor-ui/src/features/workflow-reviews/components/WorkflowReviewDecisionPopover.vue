<script setup lang="ts">
import { WORKFLOW_REVIEW_TEXT_MAX_LENGTH } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nIcon, N8nInput, N8nPopover, N8nTooltip } from '@n8n/design-system';
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

// Every viewer who may decide may also comment, and a viewer who may not decide cannot open
// the popover at all, so the last term only guards against those two rules drifting apart.
const commentDisabled = computed(
	() => posting.value || props.deciding || note.value.length === 0 || !props.viewerCanComment,
);

// A comment in flight leaves its text in the box on purpose, so without this the same text
// goes out twice: once as the comment, once as the decision note.
const decisionDisabled = computed(() => props.deciding || posting.value);

function submitDecision(input: WorkflowReviewDecisionInput) {
	isOpen.value = false;
	emit('decide', input);
}

function onRequestChanges() {
	submitDecision({ decision: 'changes_requested', note: note.value });
}

function onApprove() {
	// The key is omitted rather than sent empty: the DTO rejects `''`.
	submitDecision(
		note.value ? { decision: 'approved', note: note.value } : { decision: 'approved' },
	);
}

async function onComment() {
	const body = note.value;

	isOpen.value = false;
	try {
		// A comment that landed after the viewer moved on says nothing about the review they
		// are reading now, so neither its note nor its tab may be touched.
		if (!(await store.postComment(body))) return;

		store.clearDecisionNote(body);
		// The trigger sits outside the tab panel, so a comment posted from the Changes tab
		// would otherwise land nowhere the viewer can see.
		emit('comment-posted');
	} catch (error) {
		showError(error, i18n.baseText('workflowReviews.detail.activity.error.post'));
	}
}
</script>

<template>
	<!-- 480px deviates from Figma's 440px on purpose: the three icon+label buttons do not fit
		in 440px, and N8nPopover sets a fixed width, so the row would spill rather than wrap. -->
	<N8nPopover
		v-model:open="isOpen"
		side="bottom"
		align="end"
		width="480px"
		:enable-scrolling="false"
		:content-class="$style.popover"
	>
		<template #trigger>
			<!-- Wrapped only while the viewer may not decide: N8nTooltip does not forward attrs
				on this branch, so the trigger props land on the span — which is what makes the
				hint fire over a natively disabled button, and this trigger cannot open anything
				anyway. An enabled trigger has to stay the bare button, or it loses `aria-expanded`
				and the focus it gets back on close. -->
			<span v-if="ineligibilityHint">
				<N8nTooltip :content="ineligibilityHint" :show-after="300">
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
			<N8nButton
				v-else
				size="small"
				:disabled="deciding || !viewerCanDecide"
				data-test-id="workflow-review-decision-trigger"
			>
				{{ i18n.baseText('workflowReviews.detail.decision.trigger') }}
				<N8nIcon icon="chevron-down" />
			</N8nButton>
		</template>
		<template #content>
			<div :class="$style.content" data-test-id="workflow-review-decision-popover">
				<N8nInput
					:id="noteInputId"
					:aria-label="i18n.baseText('workflowReviews.detail.decision.note.label')"
					v-model="decisionNote"
					type="textarea"
					:rows="3"
					:maxlength="WORKFLOW_REVIEW_TEXT_MAX_LENGTH"
					:placeholder="i18n.baseText('workflowReviews.detail.activity.composer.placeholder')"
					data-test-id="workflow-review-decision-note"
				/>
				<div :class="$style.actions">
					<N8nButton
						variant="outline"
						size="small"
						:disabled="commentDisabled"
						data-test-id="workflow-review-decision-comment-button"
						@click="onComment"
					>
						<template #icon>
							<N8nIcon icon="message-square" />
						</template>
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
							:disabled="!note || decisionDisabled"
							data-test-id="workflow-review-decision-request-changes-button"
							@click="onRequestChanges"
						>
							<template #icon>
								<N8nIcon icon="refresh-cw" />
							</template>
							{{ i18n.baseText('workflowReviews.detail.decision.requestChanges') }}
						</N8nButton>
					</N8nTooltip>
					<N8nButton
						variant="outline"
						size="small"
						:disabled="decisionDisabled"
						data-test-id="workflow-review-decision-approve-button"
						@click="onApprove"
					>
						<template #icon>
							<N8nIcon icon="check" />
						</template>
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
	gap: var(--spacing--xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
