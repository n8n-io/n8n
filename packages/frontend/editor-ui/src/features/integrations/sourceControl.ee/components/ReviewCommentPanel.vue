<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SourceControlReviewComment } from '@n8n/api-types';
import type { INodeUi } from '@/Interface';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nFormInput, N8nLink, N8nText } from '@n8n/design-system';
import { listParameterJsonPaths } from '../reviewParameterPaths.utils';
import { useSourceControlStore } from '../sourceControl.store';

const props = defineProps<{
	prNumber: number;
	filePath: string;
	node: INodeUi;
	comments: SourceControlReviewComment[];
}>();

const emit = defineEmits<{
	submitted: [SourceControlReviewComment];
}>();

const i18n = useI18n();
const toast = useToast();
const sourceControlStore = useSourceControlStore();

const commentBody = ref('');
const selectedJsonPath = ref<string>('');
const isSubmitting = ref(false);

const parameterPaths = computed(() => listParameterJsonPaths(props.node.parameters));

const anchorOptions = computed(() => [
	{
		value: '',
		label: i18n.baseText('sourceControl.reviews.comments.anchor.node'),
	},
	...parameterPaths.value.map((path) => ({
		value: path,
		label: path.replace(/^parameters\./, ''),
	})),
]);

const nodeComments = computed(() =>
	props.comments.filter((comment) => comment.anchor?.nodeId === props.node.id),
);

watch(
	() => props.node.id,
	() => {
		commentBody.value = '';
		selectedJsonPath.value = '';
	},
);

const submitComment = async () => {
	if (!commentBody.value.trim()) return;

	isSubmitting.value = true;
	try {
		const comment = await sourceControlStore.createReviewComment(props.prNumber, {
			body: commentBody.value.trim(),
			path: props.filePath,
			anchor: {
				nodeId: props.node.id,
				jsonPath: selectedJsonPath.value || undefined,
			},
		});
		commentBody.value = '';
		emit('submitted', comment);
		toast.showMessage({
			title: i18n.baseText('sourceControl.reviews.comments.posted.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('sourceControl.reviews.comments.posted.error'));
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<div :class="$style.panel" data-test-id="review-comment-panel">
		<N8nText size="small" bold color="text-dark">
			{{ i18n.baseText('sourceControl.reviews.comments.title') }}
		</N8nText>

		<ul v-if="nodeComments.length > 0" :class="$style.existingComments">
			<li v-for="comment in nodeComments" :key="comment.id" :class="$style.commentItem">
				<N8nText size="small" color="text-light">
					{{ comment.author ?? i18n.baseText('sourceControl.reviews.comments.unknownAuthor') }}
					<span v-if="comment.anchor?.jsonPath"> · {{ comment.anchor.jsonPath }}</span>
				</N8nText>
				<N8nText size="small">{{ comment.body }}</N8nText>
				<N8nLink :href="comment.url" target="_blank" size="small">
					{{ i18n.baseText('sourceControl.reviews.comments.viewOnGitHub') }}
				</N8nLink>
			</li>
		</ul>

		<div :class="[$style.compose, nodeComments.length > 0 && $style.composeWithSeparator]">
			<N8nFormInput
				v-if="parameterPaths.length > 0"
				id="reviewCommentAnchor"
				v-model="selectedJsonPath"
				type="select"
				name="reviewCommentAnchor"
				:label="i18n.baseText('sourceControl.reviews.comments.anchor.label')"
				:options="anchorOptions"
				data-test-id="review-comment-anchor"
			/>

			<N8nFormInput
				id="reviewCommentBody"
				v-model="commentBody"
				type="textarea"
				name="reviewCommentBody"
				:label="i18n.baseText('sourceControl.reviews.comments.body.label')"
				:placeholder="i18n.baseText('sourceControl.reviews.comments.body.placeholder')"
				data-test-id="review-comment-body"
			/>

			<N8nButton
				size="small"
				:loading="isSubmitting"
				:disabled="!commentBody.trim()"
				data-test-id="review-comment-submit"
				@click="submitComment"
			>
				{{ i18n.baseText('sourceControl.reviews.comments.submit') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-top: var(--border-width) solid var(--color--foreground);
	background: var(--color--background--light-3);
}

.existingComments {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.compose {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.composeWithSeparator {
	padding-top: var(--spacing--xs);
	border-top: var(--border-width) solid var(--color--foreground);
}

.commentItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--2xs);
	border-radius: var(--border-radius--base);
	background: var(--color--background--light-2);
}
</style>
