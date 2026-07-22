<script setup lang="ts">
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useWorkflowReviewDialogPreferences } from '@/features/workflow-reviews/composables/useWorkflowReviewDialogPreferences';

defineProps<{
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const { submittedDialogDismissed } = useWorkflowReviewDialogPreferences();

const description = computed(() => {
	// TODO(LIGO-597): link to the reviews list route once it exists
	return i18n.baseText('workflowReviews.submitted.description');
});
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
			{{ description }}
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
