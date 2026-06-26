<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type {
	ReviewWorkflowFile,
	SourceControlReviewComment,
	SourceControlReviewSubmissionEvent,
	SourceControlReviewSummary,
} from '@n8n/api-types';
import type { IWorkflowDb } from '@/Interface';
import {
	N8nButton,
	N8nHeading,
	N8nText,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import ReviewNodeDiff from '../components/ReviewNodeDiff.vue';
import ReviewNodeCommentBadge from '../components/ReviewNodeCommentBadge.vue';
import ReviewSubmitReviewPopover from '../components/ReviewSubmitReviewPopover.vue';
import { useSourceControlStore } from '../sourceControl.store';
import { snapshotToWorkflowDb } from '../reviewWorkflow.utils';

const props = defineProps<{ prNumber: string }>();

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const sourceControlStore = useSourceControlStore();

const isDeploying = ref(false);

const canDeploy = computed(() => canComment.value && pullRequest.value?.isApproved === true);

const isLoading = ref(true);
const pullRequest = ref<SourceControlReviewSummary>();
const workflows = ref<ReviewWorkflowFile[]>([]);
const selectedPath = ref<string>();
const reviewComments = ref<SourceControlReviewComment[]>([]);

const canComment = computed(() => sourceControlStore.preferences.hasApiToken === true);

const commentedNodeIds = computed(() => {
	const ids = new Set<string>();
	for (const comment of reviewComments.value) {
		const nodeId = comment.anchor?.nodeId;
		if (nodeId) ids.add(nodeId);
	}
	return ids;
});

const commentCountByNodeId = computed(() => {
	const counts = new Map<string, number>();
	for (const comment of reviewComments.value) {
		const nodeId = comment.anchor?.nodeId;
		if (!nodeId) continue;
		counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
	}
	return counts;
});

const selectedFile = computed(() => workflows.value.find((w) => w.path === selectedPath.value));

// WorkflowDiffView treats an absent side as fully added/removed.
const sourceWorkflow = computed<IWorkflowDb | undefined>(() =>
	selectedFile.value?.baseWorkflow
		? snapshotToWorkflowDb(selectedFile.value.baseWorkflow)
		: undefined,
);
const targetWorkflow = computed<IWorkflowDb | undefined>(() =>
	selectedFile.value?.headWorkflow
		? snapshotToWorkflowDb(selectedFile.value.headWorkflow)
		: undefined,
);

const loadComments = async (filePath?: string) => {
	if (!filePath) {
		reviewComments.value = [];
		return;
	}

	try {
		reviewComments.value = await sourceControlStore.getReviewComments(
			Number(props.prNumber),
			filePath,
		);
	} catch {
		reviewComments.value = [];
	}
};

const loadReview = async () => {
	isLoading.value = true;
	try {
		const detail = await sourceControlStore.getReview(Number(props.prNumber));
		pullRequest.value = detail.pullRequest;
		workflows.value = detail.workflows;
		selectedPath.value = detail.workflows[0]?.path;
		await loadComments(selectedPath.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('sourceControl.reviews.loadError'));
		void router.push({ name: VIEWS.REVIEWS });
	} finally {
		isLoading.value = false;
	}
};

const onCommentSubmitted = (comment: SourceControlReviewComment) => {
	reviewComments.value = [...reviewComments.value, comment];
};

const onCommentsDeleted = (deletedCommentIds: number[]) => {
	const deletedIds = new Set(deletedCommentIds);
	reviewComments.value = reviewComments.value.filter((comment) => !deletedIds.has(comment.id));
};

const onReviewSubmitted = (event: SourceControlReviewSubmissionEvent) => {
	if (!pullRequest.value) return;

	if (event === 'APPROVE') {
		pullRequest.value = { ...pullRequest.value, isApproved: true };
		return;
	}

	if (event === 'REQUEST_CHANGES') {
		pullRequest.value = { ...pullRequest.value, isApproved: false };
	}
};

const deploy = async () => {
	if (!canDeploy.value || isDeploying.value) return;

	isDeploying.value = true;
	try {
		await sourceControlStore.deployReview(Number(props.prNumber));
		toast.showMessage({
			title: i18n.baseText('sourceControl.reviews.deploy.success.title'),
			type: 'success',
		});
		void router.push({ name: VIEWS.REVIEWS });
	} catch (error) {
		toast.showError(error, i18n.baseText('sourceControl.reviews.deploy.error'));
	} finally {
		isDeploying.value = false;
	}
};

watch(selectedPath, (path) => {
	void loadComments(path);
});

const goBack = () => {
	void router.push({ name: VIEWS.REVIEWS });
};

onMounted(loadReview);
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nButton
				type="tertiary"
				icon="arrow-left"
				:label="i18n.baseText('sourceControl.reviews.back')"
				data-test-id="review-back"
				@click="goBack"
			/>
			<div v-if="pullRequest" :class="$style.headerInfo">
				<div :class="$style.titleRow">
					<N8nHeading size="large" tag="h1" :class="$style.title">{{
						pullRequest.title
					}}</N8nHeading>
					<N8nTooltip v-if="pullRequest.isApproved" placement="top">
						<template #content>
							{{ i18n.baseText('sourceControl.reviews.approved.tooltip') }}
						</template>
						<span :class="$style.approvedBadge">
							<N8nIcon
								icon="circle-check"
								color="success"
								size="medium"
								data-test-id="review-approved-badge"
							/>
						</span>
					</N8nTooltip>
				</div>
				<N8nLink :href="pullRequest.url" target="_blank" :class="$style.externalLink">
					<N8nText size="small" color="text-light"
						>#{{ pullRequest.prNumber }} <N8nIcon icon="external-link" size="xsmall"
					/></N8nText>
				</N8nLink>
			</div>
			<div v-if="pullRequest && (canComment || canDeploy)" :class="$style.headerActions">
				<N8nTooltip v-if="canDeploy" placement="bottom">
					<template #content>
						{{ i18n.baseText('sourceControl.reviews.deploy.tooltip') }}
					</template>
					<N8nButton
						v-if="canComment"
						size="small"
						:loading="isDeploying"
						:disabled="isDeploying"
						data-test-id="review-deploy-button"
						@click="deploy"
					>
						{{ i18n.baseText('sourceControl.reviews.deploy.action') }}
					</N8nButton>
				</N8nTooltip>
				<ReviewSubmitReviewPopover
					:pr-number="pullRequest.prNumber"
					@submitted="onReviewSubmitted"
				/>
			</div>
		</div>

		<N8nLoading v-if="isLoading" :rows="4" :class="$style.loading" />

		<div v-else-if="workflows.length === 0" :class="$style.empty">
			<N8nText color="text-base">{{
				i18n.baseText('sourceControl.reviews.detail.noWorkflows')
			}}</N8nText>
		</div>

		<div v-else :class="$style.body">
			<aside :class="$style.fileList" data-test-id="review-file-list">
				<button
					v-for="file in workflows"
					:key="file.path"
					type="button"
					:class="[$style.fileItem, { [$style.fileItemActive]: file.path === selectedPath }]"
					:aria-selected="file.path === selectedPath"
					data-test-id="review-file-item"
					@click="selectedPath = file.path"
				>
					<span :class="[$style.statusDot, $style[file.status]]" />
					<span :class="$style.fileName">{{ file.name }}</span>
				</button>
			</aside>

			<div :class="$style.diff">
				<WorkflowDiffView
					v-if="selectedFile"
					:key="selectedFile.path"
					:source-workflow="sourceWorkflow"
					:target-workflow="targetWorkflow"
					:source-label="i18n.baseText('sourceControl.reviews.detail.base')"
					:target-label="i18n.baseText('sourceControl.reviews.detail.head')"
					:tidy-up="true"
					source="unknown"
				>
					<template #nodeToolbar="{ nodeId }">
						<ReviewNodeCommentBadge
							v-if="commentedNodeIds.has(nodeId)"
							:count="commentCountByNodeId.get(nodeId)"
						/>
					</template>
					<template #asideNodeDiff="{ outputFormat, node, nodeDiffs }">
						<ReviewNodeDiff
							v-if="node && selectedFile"
							:old-string="nodeDiffs.oldString"
							:new-string="nodeDiffs.newString"
							:output-format="outputFormat"
							:node="node"
							:comments="reviewComments"
							:pr-number="Number(prNumber)"
							:file-path="selectedFile.path"
							:can-comment="canComment"
							@submitted="onCommentSubmitted"
							@deleted="onCommentsDeleted"
						/>
					</template>
				</WorkflowDiffView>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
	width: 100%;
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: var(--border-width) solid var(--color--foreground);
}

.headerInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex: 1;
	min-width: 0;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	margin: 0;
	line-height: 1.25;
}

.approvedBadge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
	line-height: 0;
}

.externalLink {
	display: flex;
	align-items: center;
}

.headerActions {
	margin-left: auto;
	flex-shrink: 0;
}

.loading {
	padding: var(--spacing--lg);
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
}

.body {
	display: flex;
	flex: 1;
	min-height: 0;
}

.fileList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	width: 260px;
	flex-shrink: 0;
	padding: var(--spacing--xs);
	border-right: var(--border-width) solid var(--color--foreground);
	overflow-y: auto;
}

.fileItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;
	text-align: left;
	width: 100%;
	color: var(--color--text);

	&:hover {
		background-color: var(--color--background--light-2);
	}
}

.fileItemActive {
	background-color: var(--color--background--light-1);

	&:hover {
		background-color: var(--color--background--light-1);
	}
}

.fileName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.statusDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
	background-color: var(--color--text--tint-1);
}

.added {
	background-color: var(--color--success);
}

.removed {
	background-color: var(--color--danger);
}

.modified {
	background-color: var(--color--warning);
}

.renamed {
	background-color: var(--color--primary);
}

.diff {
	flex: 1;
	min-width: 0;
	position: relative;
}
</style>
