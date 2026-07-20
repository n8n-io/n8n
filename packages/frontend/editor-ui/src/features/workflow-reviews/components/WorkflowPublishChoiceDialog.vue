<script setup lang="ts">
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useWorkflowReviewDialogPreferences } from '@/features/workflow-reviews/composables/useWorkflowReviewDialogPreferences';

defineProps<{
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	publish: [];
	'submit-for-review': [];
}>();

const i18n = useI18n();
const { publishChoiceDismissed } = useWorkflowReviewDialogPreferences();

const choosePublish = () => {
	emit('update:open', false);
	emit('publish');
};

const chooseReview = () => {
	emit('update:open', false);
	emit('submit-for-review');
};
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('workflowReviews.publishChoice.title')"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogDescription :class="$style.description">
			{{ i18n.baseText('workflowReviews.publishChoice.description') }}
		</N8nDialogDescription>
		<N8nDialogFooter data-test-id="workflow-publish-choice-dialog" :class="$style.footer">
			<N8nCheckbox
				v-model="publishChoiceDismissed"
				data-test-id="workflow-publish-choice-dont-show-again"
				:class="$style.dontShowAgain"
			>
				<template #label>{{ i18n.baseText('generic.dontShowAgain') }}</template>
			</N8nCheckbox>
			<div :class="$style.actions">
				<N8nButton
					variant="outline"
					data-test-id="workflow-submit-for-review-choice-button"
					@click="chooseReview"
				>
					{{ i18n.baseText('workflowReviews.publishChoice.submitForReview') }}
				</N8nButton>
				<N8nButton data-test-id="workflow-publish-choice-button" @click="choosePublish">
					{{ i18n.baseText('workflowReviews.publishChoice.publish') }}
				</N8nButton>
			</div>
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

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}

.dontShowAgain {
	:deep(label) {
		color: var(--color--text--tint-1);
	}
}
</style>
