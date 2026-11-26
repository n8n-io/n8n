<script setup lang="ts">
import { WORKFLOW_REVIEW_TEXT_MAX_LENGTH } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nDropdownMenu,
	N8nIcon,
	N8nInput,
	N8nPopover,
	N8nText,
	N8nTooltip,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { computed, ref, useTemplateRef } from 'vue';

import { useReviewActivityStore } from '../reviewActivity.store';
import type { WorkflowReviewDecisionInput } from '../workflowReviews.api';

const props = defineProps<{
	reviewTitle: string | null;
	deciding: boolean;
	viewerCanDecide: boolean;
	viewerCanClose: boolean;
	/** Why the viewer may neither decide nor close. Shown only on the disabled trigger. */
	ineligibilityHint: string;
}>();

const emit = defineEmits<{
	decide: [input: WorkflowReviewDecisionInput];
	close: [];
}>();

type MenuAction = 'approve' | 'request-changes' | 'close';

const i18n = useI18n();
const { decisionNote } = storeToRefs(useReviewActivityStore());

const anchor = useTemplateRef<HTMLElement>('anchor');
const noteOpen = ref(false);
const confirmCloseOpen = ref(false);
const note = computed(() => decisionNote.value.trim());

const canOpen = computed(() => props.viewerCanDecide || props.viewerCanClose);

const menuItems = computed<Array<DropdownMenuItemProps<MenuAction>>>(() => {
	const close: DropdownMenuItemProps<MenuAction> = {
		id: 'close',
		label: i18n.baseText('workflowReviews.detail.decision.closeReview'),
		icon: { type: 'icon', value: 'x' },
		destructive: true,
		testId: 'workflow-review-decision-close',
	};
	// The requester may close but never decide their own review, so they see Close alone.
	if (!props.viewerCanDecide) return [close];

	return [
		{
			id: 'approve',
			label: i18n.baseText('workflowReviews.detail.decision.approveAndPublish'),
			icon: { type: 'icon', value: 'check' },
			testId: 'workflow-review-decision-approve',
		},
		{
			id: 'request-changes',
			label: i18n.baseText('workflowReviews.detail.decision.requestChanges'),
			icon: { type: 'icon', value: 'refresh-cw' },
			testId: 'workflow-review-decision-request-changes',
			// The note form takes focus; the menu must not hand it back to the trigger.
			suppressCloseAutoFocus: true,
		},
		...(props.viewerCanClose ? [{ ...close, divided: true }] : []),
	];
});

function onSelect(action: MenuAction) {
	if (action === 'approve') emit('decide', { decision: 'approved' });
	else if (action === 'close') confirmCloseOpen.value = true;
	else noteOpen.value = true;
}

function onConfirmClose() {
	confirmCloseOpen.value = false;
	emit('close');
}

function onRequestChanges() {
	noteOpen.value = false;
	emit('decide', { decision: 'changes_requested', note: note.value });
}
</script>

<template>
	<!-- Wrapped only while the viewer may not open it: the tooltip needs a hoverable element
		around the natively disabled button. -->
	<span v-if="!canOpen">
		<N8nTooltip :content="ineligibilityHint" :show-after="300">
			<N8nButton size="small" disabled data-test-id="workflow-review-decision-trigger">
				{{ i18n.baseText('workflowReviews.detail.decision.trigger') }}
				<N8nIcon icon="chevron-down" />
			</N8nButton>
		</N8nTooltip>
	</span>
	<span v-else ref="anchor">
		<N8nDropdownMenu
			:items="menuItems"
			placement="bottom-end"
			:disabled="deciding"
			content-test-id="workflow-review-decision-menu"
			@select="onSelect"
		>
			<template #trigger>
				<N8nButton
					size="small"
					:disabled="deciding"
					data-test-id="workflow-review-decision-trigger"
				>
					{{ i18n.baseText('workflowReviews.detail.decision.trigger') }}
					<N8nIcon :icon="deciding ? 'loader' : 'chevron-down'" :spin="deciding" />
				</N8nButton>
			</template>
		</N8nDropdownMenu>
		<N8nPopover
			v-model:open="noteOpen"
			:reference="anchor ?? undefined"
			side="bottom"
			align="end"
			width="440px"
			:enable-scrolling="false"
			:content-class="$style.notePopover"
		>
			<template #content>
				<form
					:class="$style.noteForm"
					data-test-id="workflow-review-request-changes-form"
					@submit.prevent="onRequestChanges"
				>
					<N8nText tag="h3" bold size="medium">
						{{ i18n.baseText('workflowReviews.detail.decision.note.required') }}
					</N8nText>
					<N8nInput
						v-model="decisionNote"
						:aria-label="i18n.baseText('workflowReviews.detail.decision.note.label')"
						type="textarea"
						:rows="5"
						:maxlength="WORKFLOW_REVIEW_TEXT_MAX_LENGTH"
						:class="$style.input"
						data-test-id="workflow-review-decision-note"
					/>
					<div :class="$style.actions">
						<N8nButton variant="ghost" size="small" @click="noteOpen = false">
							{{ i18n.baseText('generic.cancel') }}
						</N8nButton>
						<N8nButton
							type="submit"
							size="small"
							:disabled="!note || deciding"
							data-test-id="workflow-review-decision-request-changes-button"
						>
							{{ i18n.baseText('workflowReviews.detail.decision.requestChanges') }}
						</N8nButton>
					</div>
				</form>
			</template>
		</N8nPopover>
		<N8nDialog v-model:open="confirmCloseOpen" size="small" :show-close-button="false">
			<N8nDialogHeader>
				<N8nDialogTitle>
					{{
						reviewTitle
							? i18n.baseText('workflowReviews.detail.decision.closeReview.confirm.titleNamed', {
									interpolate: { title: reviewTitle },
								})
							: i18n.baseText('workflowReviews.detail.decision.closeReview.confirm.title')
					}}
				</N8nDialogTitle>
				<N8nDialogDescription>
					{{ i18n.baseText('workflowReviews.detail.decision.closeReview.confirm.description') }}
				</N8nDialogDescription>
			</N8nDialogHeader>
			<N8nDialogFooter>
				<N8nButton
					variant="outline"
					:label="i18n.baseText('generic.cancel')"
					@click="confirmCloseOpen = false"
				/>
				<N8nButton
					variant="destructive"
					:label="i18n.baseText('workflowReviews.detail.decision.closeReview')"
					:disabled="deciding"
					data-test-id="workflow-review-close-confirm"
					@click="onConfirmClose"
				/>
			</N8nDialogFooter>
		</N8nDialog>
	</span>
</template>

<style lang="scss" module>
.notePopover {
	padding: var(--spacing--sm);
}

.noteForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.input {
	:global(textarea) {
		max-height: 50dvh;
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
