<script setup lang="ts">
import type { WorkflowReviewInboxItem, WorkflowReviewRequestDetail } from '@n8n/api-types';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	N8nTooltip,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useTemplateRef, watch } from 'vue';

import { prototypeState, setPrototypeState } from '../../../prototype.session';
import type { WorkflowReviewDecisionInput } from '../../../../reviews/workflowReviews.api';
import PrototypeMenuItemLabel from '../../components/PrototypeMenuItemLabel.vue';
import PrototypeRequestChangesPopover from '../../components/PrototypeRequestChangesPopover.vue';

/** The Review menu in the title row of a workflow review. */
const props = defineProps<{
	review: WorkflowReviewInboxItem | WorkflowReviewRequestDetail;
	deciding: boolean;
}>();

const emit = defineEmits<{
	decide: [input: WorkflowReviewDecisionInput];
}>();

const i18n = useI18n();

const detail = computed<WorkflowReviewRequestDetail | null>(() =>
	'workflows' in props.review ? props.review : null,
);
const viewerCanDecide = computed(() => detail.value?.viewerCanDecide ?? false);

const ineligibilityHint = computed(() => {
	if (!detail.value || detail.value.viewerCanDecide) return '';
	// Any reason other than 'author' gets the generic permission hint, so new
	// backend reasons degrade gracefully instead of breaking the UI.
	return detail.value.viewerDecisionIneligibilityReason === 'author'
		? i18n.baseText('workflowReviews.detail.decision.ineligible.author')
		: i18n.baseText('generic.missing.permissions');
});

type PrototypeReviewAction = 'approve' | 'request-changes' | 'close';

// The note opens on the Review button.
const reviewMenuOpen = ref(false);
const requestingChanges = ref(false);
const reviewAnchor = useTemplateRef<HTMLElement>('reviewAnchor');
const reviewAnchorElement = computed(() => reviewAnchor.value ?? undefined);

const reviewMenu = computed<Array<DropdownMenuItemProps<PrototypeReviewAction>>>(() => [
	{
		id: 'approve',
		label: i18n.baseText('workflowReviews.detail.decision.approveAndPublish'),
		icon: { type: 'icon', value: 'check' },
		disabled: props.deciding,
		testId: 'workflow-review-prototype-approve',
	},
	{
		id: 'request-changes',
		label: i18n.baseText('workflowReviews.detail.decision.requestChanges'),
		icon: { type: 'icon', value: 'refresh-cw' },
		disabled: props.deciding,
		// The note popover takes focus when this item closes the menu.
		suppressCloseAutoFocus: true,
		testId: 'workflow-review-prototype-request-changes',
	},
	{
		id: 'close',
		label: i18n.baseText('inbox.contextMenu.closeReview'),
		icon: { type: 'icon', value: 'x' },
		destructive: true,
		divided: true,
		testId: 'workflow-review-prototype-close',
	},
]);

watch(
	() => props.review.id,
	() => {
		requestingChanges.value = false;
	},
);

// Close the note when the menu opens. The two stay apart.
watch(reviewMenuOpen, (open) => {
	if (open) requestingChanges.value = false;
});

function onReviewSelect(action: PrototypeReviewAction) {
	if (action === 'approve') {
		requestingChanges.value = false;
		emit('decide', { decision: 'approved' });
		return;
	}
	if (action === 'request-changes') {
		requestingChanges.value = true;
		return;
	}
	requestingChanges.value = false;
	setPrototypeState(props.review.id, 'closed');
}

function onSubmitChanges(note: string) {
	requestingChanges.value = false;
	emit('decide', { decision: 'changes_requested', note });
}
</script>

<template>
	<!-- Gated on `detail`, not `review`: eligibility only arrives with the detail payload, so the
		list item alone can't say who may decide. -->
	<div
		v-if="prototypeState(review.id, detail?.state ?? 'closed') === 'open'"
		:class="$style.actions"
		data-test-id="workflow-review-detail-actions"
	>
		<N8nDropdownMenu
			v-model="reviewMenuOpen"
			:items="reviewMenu"
			placement="bottom-end"
			:disabled="deciding || !viewerCanDecide"
			destructive-at-rest
			content-test-id="workflow-review-prototype-menu"
			@select="onReviewSelect"
		>
			<template #trigger>
				<span ref="reviewAnchor" :class="$style.reviewAnchor">
					<span v-if="ineligibilityHint">
						<N8nTooltip :content="ineligibilityHint" :show-after="300">
							<N8nButton size="small" disabled data-test-id="workflow-review-prototype-review">
								{{ i18n.baseText('workflowReviews.detail.decision.trigger') }}
								<N8nIcon icon="chevron-down" />
							</N8nButton>
						</N8nTooltip>
					</span>
					<N8nButton
						v-else
						size="small"
						:disabled="deciding"
						data-test-id="workflow-review-prototype-review"
					>
						{{ i18n.baseText('workflowReviews.detail.decision.trigger') }}
						<N8nIcon :icon="deciding ? 'loader' : 'chevron-down'" :spin="deciding" />
					</N8nButton>
				</span>
			</template>
			<template #item-label="{ item, ui }">
				<PrototypeMenuItemLabel
					:label="item.label"
					:label-class="ui.class"
					:disabled="item.disabled"
					:destructive="item.destructive"
					:tooltip="
						item.id === 'close' ? i18n.baseText('inbox.prototype.closeReview.tooltip') : undefined
					"
				/>
			</template>
		</N8nDropdownMenu>
		<PrototypeRequestChangesPopover
			v-model:open="requestingChanges"
			:reference="reviewAnchorElement"
			:disabled="deciding"
			@submit="onSubmitChanges"
		/>
	</div>
</template>

<style module lang="scss">
.actions {
	position: relative;
	display: flex;
	flex-shrink: 0;
	align-items: center;
}

.reviewAnchor {
	display: inline-flex;
}
</style>
