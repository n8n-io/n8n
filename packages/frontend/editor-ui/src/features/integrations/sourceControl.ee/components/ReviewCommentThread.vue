<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SourceControlReviewComment } from '@n8n/api-types';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nFormInput, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useSourceControlStore } from '../sourceControl.store';

const props = defineProps<{
	prNumber: number;
	threadRoot: SourceControlReviewComment;
	replies: SourceControlReviewComment[];
	canReply: boolean;
	canDelete: boolean;
}>();

const emit = defineEmits<{
	replied: [SourceControlReviewComment];
	deleted: [deletedCommentIds: number[]];
}>();

const i18n = useI18n();
const toast = useToast();
const sourceControlStore = useSourceControlStore();

const isReplying = ref(false);
const replyBody = ref('');
const isSubmitting = ref(false);
const deletingCommentId = ref<number | null>(null);

const threadComments = computed(() => [
	{ comment: props.threadRoot, isReply: false },
	...props.replies.map((comment) => ({ comment, isReply: true })),
]);

const openOnGitHub = (url: string) => {
	window.open(url, '_blank', 'noopener,noreferrer');
};

const deleteComment = async (comment: SourceControlReviewComment) => {
	deletingCommentId.value = comment.id;
	try {
		const { deletedCommentIds } = await sourceControlStore.deleteReviewComment(
			props.prNumber,
			comment.id,
		);
		emit('deleted', deletedCommentIds);
		toast.showMessage({
			title: i18n.baseText('sourceControl.reviews.comments.deleted.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('sourceControl.reviews.comments.deleted.error'));
	} finally {
		deletingCommentId.value = null;
	}
};

const submitReply = async () => {
	if (!replyBody.value.trim()) return;

	isSubmitting.value = true;
	try {
		const comment = await sourceControlStore.createReviewComment(props.prNumber, {
			body: replyBody.value.trim(),
			inReplyToId: props.threadRoot.id,
		});
		replyBody.value = '';
		isReplying.value = false;
		emit('replied', comment);
		toast.showMessage({
			title: i18n.baseText('sourceControl.reviews.comments.reply.posted.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('sourceControl.reviews.comments.reply.posted.error'));
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<div :class="$style.thread" data-test-id="review-comment-thread">
		<div
			v-for="{ comment, isReply } in threadComments"
			:key="comment.id"
			:class="[$style.comment, isReply && $style.reply]"
			data-test-id="review-comment-item"
		>
			<div :class="$style.commentHeader">
				<N8nText size="small" color="text-light">
					{{ comment.author ?? i18n.baseText('sourceControl.reviews.comments.unknownAuthor') }}
				</N8nText>
				<div :class="$style.commentActions">
					<N8nTooltip placement="top">
						<template #content>
							{{ i18n.baseText('sourceControl.reviews.comments.viewOnGitHub') }}
						</template>
						<N8nIconButton
							variant="ghost"
							size="small"
							icon="external-link"
							:aria-label="i18n.baseText('sourceControl.reviews.comments.viewOnGitHub')"
							data-test-id="review-comment-open-github"
							@click="openOnGitHub(comment.url)"
						/>
					</N8nTooltip>
					<N8nTooltip v-if="canDelete" placement="top">
						<template #content>
							{{ i18n.baseText('sourceControl.reviews.comments.delete') }}
						</template>
						<N8nIconButton
							variant="ghost"
							size="small"
							icon="trash-2"
							:loading="deletingCommentId === comment.id"
							:disabled="deletingCommentId !== null && deletingCommentId !== comment.id"
							:aria-label="i18n.baseText('sourceControl.reviews.comments.delete')"
							data-test-id="review-comment-delete"
							@click="deleteComment(comment)"
						/>
					</N8nTooltip>
				</div>
			</div>
			<N8nText size="small">{{ comment.body }}</N8nText>
		</div>

		<div v-if="canReply" :class="$style.replyActions">
			<N8nButton
				v-if="!isReplying"
				type="tertiary"
				size="small"
				data-test-id="review-comment-reply-toggle"
				@click="isReplying = true"
			>
				{{ i18n.baseText('sourceControl.reviews.comments.reply.action') }}
			</N8nButton>

			<div v-else :class="$style.replyForm">
				<N8nFormInput
					id="reviewCommentReplyBody"
					v-model="replyBody"
					type="textarea"
					name="reviewCommentReplyBody"
					:label="i18n.baseText('sourceControl.reviews.comments.reply.label')"
					:placeholder="i18n.baseText('sourceControl.reviews.comments.reply.placeholder')"
					focus-initially
					data-test-id="review-comment-reply-body"
				/>
				<div :class="$style.replyButtons">
					<N8nButton
						size="small"
						:loading="isSubmitting"
						:disabled="!replyBody.trim()"
						data-test-id="review-comment-reply-submit"
						@click="submitReply"
					>
						{{ i18n.baseText('sourceControl.reviews.comments.reply.submit') }}
					</N8nButton>
					<N8nButton
						type="tertiary"
						size="small"
						:disabled="isSubmitting"
						@click="isReplying = false"
					>
						{{ i18n.baseText('sourceControl.reviews.comments.reply.cancel') }}
					</N8nButton>
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.thread {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	background: var(--color--background--light-2);
	border-left: 3px solid var(--color--primary);
}

.comment {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.commentHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.commentActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	flex-shrink: 0;
}

.reply {
	padding-left: var(--spacing--xs);
	border-left: var(--border-width) solid var(--color--foreground);
}

.replyActions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.replyForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.replyButtons {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
