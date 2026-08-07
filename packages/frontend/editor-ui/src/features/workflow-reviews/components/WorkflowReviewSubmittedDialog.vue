<script setup lang="ts">
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nLink,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';

import { useWorkflowReviewDialogPreferences } from '@/features/workflow-reviews/composables/useWorkflowReviewDialogPreferences';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '@/features/workflow-reviews/constants';

defineProps<{
	open: boolean;
	workflowReviewRequestId: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const { submittedDialogDismissed } = useWorkflowReviewDialogPreferences();
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('workflowReviews.submitted.title')"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogDescription
			data-test-id="workflow-review-submitted-dialog"
			:class="$style.description"
		>
			<I18nT keypath="workflowReviews.submitted.description" tag="span" scope="global">
				<template #submission>
					<N8nLink
						:to="{
							name: WORKFLOW_REVIEW_REQUESTS_VIEW,
							params: { reviewRequestId: workflowReviewRequestId },
						}"
					>
						{{ i18n.baseText('workflowReviews.submitted.description.submission') }}
					</N8nLink>
				</template>
			</I18nT>
		</N8nDialogDescription>
		<N8nDialogFooter :class="$style.footer">
			<N8nCheckbox
				v-model="submittedDialogDismissed"
				data-test-id="workflow-review-submitted-dont-show-again"
				:class="$style.dontShowAgain"
			>
				<template #label>{{ i18n.baseText('generic.dontShowAgain') }}</template>
			</N8nCheckbox>
			<N8nButton
				data-test-id="workflow-review-submitted-got-it-button"
				@click="emit('update:open', false)"
			>
				{{ i18n.baseText('workflowReviews.submitted.gotIt') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.description {
	display: block;
	margin-top: var(--spacing--xs);
}

.footer {
	align-items: center;
	justify-content: space-between;
}

.dontShowAgain {
	:deep(label) {
		color: var(--text-color--subtler);
	}
}
</style>
