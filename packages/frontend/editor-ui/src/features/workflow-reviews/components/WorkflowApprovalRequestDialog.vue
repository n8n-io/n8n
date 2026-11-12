<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nText,
	N8nUserSelect,
	type IUser,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref, watch } from 'vue';

import { VIEWS } from '@/app/constants';
import { useDependencies } from '@/app/composables/useDependencies';
import { formatUserDisplayName } from '@/features/workflow-reviews/workflowReviews.utils';
import {
	reviewPrototypeState,
	reviewerPoolForTrack,
	roleMatchesReviewerPool,
	type PrototypeReviewerRole,
} from '@/features/workflow-reviews/reviewPrototype.state';

const REVIEW_TITLE_MAX_LENGTH = 128;
const REVIEW_DESCRIPTION_MAX_LENGTH = 512;

/**
 * Local stand-ins so the reviewer filter is visible without a reviews API.
 * The signed-in user is added separately and counts as an instance admin.
 */
const PLACEHOLDER_REVIEWERS: Array<{
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	role: PrototypeReviewerRole;
}> = [
	{
		id: 'prototype-reviewer-project-admin',
		firstName: 'Jordan',
		lastName: 'Hale',
		email: 'jordan.hale@example.com',
		role: 'projectAdmin',
	},
	{
		id: 'prototype-reviewer-project-editor',
		firstName: 'Riley',
		lastName: 'Nguyen',
		email: 'riley.nguyen@example.com',
		role: 'projectEditor',
	},
];

const props = defineProps<{
	open: boolean;
	intent: 'publish' | 'promote';
	workflowId: string;
	flushSave: () => Promise<string | undefined>;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	submitted: [workflowReviewRequestId: string];
	conflict: [];
}>();

const i18n = useI18n();
const toast = useToast();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const { fetchDependencyCounts, getTotalCount } = useDependencies();

const reviewTitle = ref('');
const description = ref('');
const selectedReviewerId = ref('');

const title = computed(() =>
	i18n.baseText(
		props.intent === 'promote'
			? 'workflowReviews.approvalRequest.promote.title'
			: 'workflowReviews.approvalRequest.publish.title',
	),
);

const dependencyCount = computed(() => getTotalCount(props.workflowId, 'workflow'));

const dependencyLabel = computed(() =>
	i18n.baseText('workflowReviews.approvalRequest.dependencies', {
		adjustToNumber: dependencyCount.value,
		interpolate: { count: dependencyCount.value },
	}),
);

function instanceRequiresApproval(): boolean {
	if (props.intent === 'promote') {
		return reviewPrototypeState.initialized
			? reviewPrototypeState.promotingNeedsApproval
			: settingsStore.settings.workflowReviews?.promotingNeedsApproval === true;
	}
	return reviewPrototypeState.initialized
		? reviewPrototypeState.publishingNeedsApproval
		: settingsStore.settings.workflowReviews?.publishingNeedsApproval === true;
}

const reviewerPool = computed(() => {
	const promoting = props.intent === 'promote';
	return reviewerPoolForTrack({
		mode: reviewPrototypeState.mode,
		instanceRequired: instanceRequiresApproval(),
		projectRequired: promoting
			? reviewPrototypeState.projectPromoting
			: reviewPrototypeState.projectPublishing,
		instancePool: promoting
			? reviewPrototypeState.promotingReviewers
			: reviewPrototypeState.publishingReviewers,
		projectPool: promoting
			? reviewPrototypeState.projectPromotingReviewers
			: reviewPrototypeState.projectPublishingReviewers,
	});
});

const reviewerOptions = computed<IUser[]>(() => {
	const pool = reviewerPool.value;
	const members: Array<{
		id: string;
		firstName: string | null;
		lastName: string | null;
		email: string;
		role: PrototypeReviewerRole;
	}> = [];
	const current = usersStore.currentUser;
	if (current?.id) {
		members.push({
			id: current.id,
			firstName: current.firstName ?? null,
			lastName: current.lastName ?? null,
			email: current.email || 'you@example.com',
			role: 'instanceAdmin',
		});
	}
	members.push(...PLACEHOLDER_REVIEWERS);

	return members
		.filter((member) => roleMatchesReviewerPool(member.role, pool))
		.map((member) => ({
			id: member.id,
			firstName: member.firstName,
			lastName: member.lastName,
			email: member.email,
			fullName: formatUserDisplayName(member) || undefined,
		}));
});

watch(reviewerOptions, (options) => {
	if (!options.some((user) => user.id === selectedReviewerId.value)) {
		selectedReviewerId.value = '';
	}
});

watch(
	() => props.open,
	(isOpen) => {
		if (!isOpen) {
			reviewTitle.value = '';
			description.value = '';
			selectedReviewerId.value = '';
			return;
		}
		void fetchDependencyCounts([props.workflowId], 'workflow');
	},
);

function close() {
	emit('update:open', false);
}

function submit() {
	toast.showMessage({
		type: 'success',
		title: i18n.baseText('workflowReviews.approvalRequest.success'),
	});
	emit('update:open', false);
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		data-test-id="workflow-review-approval-dialog"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.field">
				<N8nInputLabel :label="i18n.baseText('workflowReviews.submitForReview.reviewTitle.label')">
					<N8nInput
						v-model="reviewTitle"
						:maxlength="REVIEW_TITLE_MAX_LENGTH"
						data-test-id="workflow-review-approval-title"
					/>
				</N8nInputLabel>
				<N8nText v-if="dependencyCount > 0" size="small" color="text-light">
					{{ dependencyLabel }}
					·
					<N8nLink
						:to="{ name: VIEWS.WORKFLOW_HISTORY, params: { workflowId } }"
						size="small"
						data-test-id="workflow-review-compare-changes"
					>
						{{ i18n.baseText('workflowReviews.approvalRequest.compareChanges') }}
					</N8nLink>
				</N8nText>
			</div>
			<div :class="$style.field">
				<N8nInputLabel :label="i18n.baseText('workflowReviews.approvalRequest.description')">
					<N8nInput
						v-model="description"
						type="textarea"
						:rows="4"
						:maxlength="REVIEW_DESCRIPTION_MAX_LENGTH"
						data-test-id="workflow-review-approval-description"
					/>
				</N8nInputLabel>
			</div>
			<div :class="$style.field">
				<N8nInputLabel :label="i18n.baseText('workflowReviews.submitForReview.reviewer.label')">
					<N8nUserSelect
						v-model="selectedReviewerId"
						:users="reviewerOptions"
						:teleported="false"
						:placeholder="i18n.baseText('workflowReviews.approvalRequest.reviewer.placeholder')"
						data-test-id="workflow-review-approval-reviewer"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nUserSelect>
				</N8nInputLabel>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="outline" data-test-id="workflow-review-approval-cancel" @click="close">
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton variant="solid" data-test-id="workflow-review-approval-submit" @click="submit">
				{{ i18n.baseText('workflowReviews.submitForReview.submit') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module>
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.field + .field {
	margin-top: var(--spacing--sm);
}
</style>
