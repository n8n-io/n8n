<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SourceControlReviewSubmissionEvent } from '@n8n/api-types';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nFormInput, N8nPopover, N8nText } from '@n8n/design-system';
import { useSourceControlStore } from '../sourceControl.store';

const props = defineProps<{
	prNumber: number;
}>();

const emit = defineEmits<{
	submitted: [SourceControlReviewSubmissionEvent];
}>();

const i18n = useI18n();
const toast = useToast();
const sourceControlStore = useSourceControlStore();

const isOpen = ref(false);
const body = ref('');
const submittingEvent = ref<SourceControlReviewSubmissionEvent | null>(null);

const isSubmitting = computed(() => submittingEvent.value !== null);

const canSubmitComment = computed(() => body.value.trim().length > 0);
const canRequestChanges = computed(() => body.value.trim().length > 0);

const resetForm = () => {
	body.value = '';
	submittingEvent.value = null;
};

const close = () => {
	isOpen.value = false;
	resetForm();
};

const submit = async (event: SourceControlReviewSubmissionEvent) => {
	if (isSubmitting.value) return;
	if (event === 'COMMENT' && !canSubmitComment.value) return;
	if (event === 'REQUEST_CHANGES' && !canRequestChanges.value) return;

	submittingEvent.value = event;
	try {
		await sourceControlStore.submitReview(props.prNumber, {
			body: body.value.trim() || undefined,
			event,
		});
		close();
		emit('submitted', event);
		const successKey =
			event === 'APPROVE'
				? 'sourceControl.reviews.submit.approved.title'
				: event === 'REQUEST_CHANGES'
					? 'sourceControl.reviews.submit.changesRequested.title'
					: 'sourceControl.reviews.submit.commented.title';
		toast.showMessage({
			title: i18n.baseText(successKey),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('sourceControl.reviews.submit.error'));
		submittingEvent.value = null;
	}
};
</script>

<template>
	<N8nPopover
		v-model:open="isOpen"
		width="360px"
		side="bottom"
		align="end"
		:content-class="$style.popover"
		data-test-id="review-submit-popover"
	>
		<template #trigger>
			<N8nButton
				variant="success"
				size="small"
				data-test-id="review-submit-trigger"
				:disabled="isSubmitting"
			>
				{{ i18n.baseText('sourceControl.reviews.submit.action') }}
			</N8nButton>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nText size="small" bold color="text-dark">
					{{ i18n.baseText('sourceControl.reviews.submit.title') }}
				</N8nText>
				<N8nFormInput
					id="reviewSubmitBody"
					v-model="body"
					type="textarea"
					name="reviewSubmitBody"
					:label="''"
					:placeholder="i18n.baseText('sourceControl.reviews.submit.placeholder')"
					:disabled="isSubmitting"
					focus-initially
					data-test-id="review-submit-body"
				/>
				<div :class="$style.actions">
					<N8nButton
						type="tertiary"
						size="small"
						:loading="submittingEvent === 'COMMENT'"
						:disabled="!canSubmitComment || isSubmitting"
						data-test-id="review-submit-comment"
						@click="submit('COMMENT')"
					>
						{{ i18n.baseText('sourceControl.reviews.submit.comment') }}
					</N8nButton>
					<N8nButton
						variant="success"
						size="small"
						:loading="submittingEvent === 'APPROVE'"
						:disabled="isSubmitting"
						data-test-id="review-submit-approve"
						@click="submit('APPROVE')"
					>
						{{ i18n.baseText('sourceControl.reviews.submit.approve') }}
					</N8nButton>
					<N8nButton
						variant="destructive"
						size="small"
						:loading="submittingEvent === 'REQUEST_CHANGES'"
						:disabled="!canRequestChanges || isSubmitting"
						data-test-id="review-submit-request-changes"
						@click="submit('REQUEST_CHANGES')"
					>
						{{ i18n.baseText('sourceControl.reviews.submit.requestChanges') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style module lang="scss">
.popover {
	padding: var(--spacing--sm);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}
</style>
