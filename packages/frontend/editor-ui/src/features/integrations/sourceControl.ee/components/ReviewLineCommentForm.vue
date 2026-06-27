<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nFormInput } from '@n8n/design-system';

const props = defineProps<{
	anchorLabel?: string;
	loading?: boolean;
}>();

const emit = defineEmits<{
	submit: [body: string];
	cancel: [];
}>();

const i18n = useI18n();
const body = ref('');
const isSubmitting = ref(false);

const isBusy = computed(() => props.loading === true || isSubmitting.value);

watch(
	() => props.loading,
	(loading) => {
		if (!loading) isSubmitting.value = false;
	},
);

const onSubmit = () => {
	if (!body.value.trim() || isBusy.value) return;
	isSubmitting.value = true;
	emit('submit', body.value.trim());
};
</script>

<template>
	<div :class="$style.form" data-test-id="review-line-comment-form">
		<N8nFormInput
			id="reviewLineCommentBody"
			v-model="body"
			type="textarea"
			name="reviewLineCommentBody"
			:label="''"
			:placeholder="i18n.baseText('sourceControl.reviews.comments.lineBody.placeholder')"
			:disabled="isBusy"
			focus-initially
			data-test-id="review-line-comment-body"
		/>
		<div :class="$style.actions">
			<N8nButton
				size="small"
				:loading="isBusy"
				:disabled="!body.trim() || isBusy"
				data-test-id="review-line-comment-submit"
				@click="onSubmit"
			>
				{{ i18n.baseText('sourceControl.reviews.comments.submit') }}
			</N8nButton>
			<N8nButton type="tertiary" size="small" :disabled="isBusy" @click="emit('cancel')">
				{{ i18n.baseText('sourceControl.reviews.comments.reply.cancel') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	background: var(--color--background--light-3);
	border-left: 3px solid var(--color--primary);
}

.anchor {
	font-family: var(--font-family--monospace);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
