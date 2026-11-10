<script setup lang="ts">
import type {
	WorkflowReviewEligibleReviewer,
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';
import { N8nAvatar, N8nIcon, N8nIconButton, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { VIEWS } from '@n8n/frontend-constants/views';
import InboxAvatarTooltip from '../../../../components/InboxAvatarTooltip.vue';
import PrototypeStatusMenu from '../../../PrototypeStatusMenu.vue';
import { prototypeSession, prototypeState } from '../../../prototype.session';
import { formatUserDisplayName } from '../../../../reviews/workflowReviews.utils';
import { getWorkflowReviewStatusDisplay } from '../../../../reviews/workflowReviewStatus.utils';
import WorkflowReviewStatusDot from '../../../../reviews/components/WorkflowReviewStatusDot.vue';

const props = withDefaults(
	defineProps<{
		review: WorkflowReviewInboxItem | WorkflowReviewRequestDetail;
		/** Prototype item 1. Links stay plain and underline on hover, as on item 2. */
		hoverLinks?: boolean;
	}>(),
	{ hoverLinks: false },
);

const i18n = useI18n();

// Prototype only. + adds the next of these who is not already a reviewer. Nothing is saved.
const sampleReviewers: WorkflowReviewEligibleReviewer[] = [
	{
		id: 'prototype-user-maya',
		email: 'maya.chen@example.com',
		firstName: 'Maya',
		lastName: 'Chen',
	},
	{
		id: 'prototype-user-omar',
		email: 'omar.haddad@example.com',
		firstName: 'Omar',
		lastName: 'Haddad',
	},
	{
		id: 'prototype-user-priya',
		email: 'priya.shah@example.com',
		firstName: 'Priya',
		lastName: 'Shah',
	},
];

const detail = computed<WorkflowReviewRequestDetail | null>(() =>
	'workflows' in props.review ? props.review : null,
);

// Authors include the requester, who already has their own section above.
const otherAuthors = computed(() =>
	props.review.authors.filter((author) => author.id !== props.review.requester?.id),
);

const inboxState = computed(() => prototypeState(props.review.id, props.review.state));
const statusSummary = computed(() =>
	getWorkflowReviewStatusDisplay(i18n, inboxState.value, props.review.decision),
);

const addedReviewers = ref<WorkflowReviewEligibleReviewer[]>([]);
watch(
	() => props.review.id,
	() => {
		addedReviewers.value = [];
	},
);

const reviewers = computed(() => [...props.review.reviewers, ...addedReviewers.value]);
const nextReviewer = computed(() =>
	sampleReviewers.find((person) => !reviewers.value.some((reviewer) => reviewer.id === person.id)),
);

function addReviewer() {
	const person = nextReviewer.value;
	if (!person) return;
	addedReviewers.value = [...addedReviewers.value, person];
}
</script>

<template>
	<aside :class="$style.metadata" data-test-id="workflow-review-detail-metadata">
		<section :class="$style.section" data-test-id="workflow-review-detail-status-card">
			<N8nText bold color="text-light" size="medium">
				{{ i18n.baseText('workflowReviews.detail.metadata.status') }}
			</N8nText>
			<div :class="$style.status">
				<PrototypeStatusMenu
					v-if="prototypeSession.active"
					:item-id="review.id"
					:state="inboxState"
					:open-label="i18n.baseText('workflowReviews.status.open')"
				>
					<WorkflowReviewStatusDot
						:state="inboxState"
						:decision="review.decision"
						size="small"
						decorative
					/>
				</PrototypeStatusMenu>
				<template v-else>
					<WorkflowReviewStatusDot :state="review.state" :decision="review.decision" decorative />
					<N8nText size="medium">
						{{ statusSummary.stateLabel }}
						<span aria-hidden="true" :class="$style.statusSeparator">|</span>
						{{ statusSummary.decisionLabel }}
					</N8nText>
				</template>
			</div>
		</section>

		<section :class="$style.section" data-test-id="workflow-review-detail-people-card">
			<N8nText bold color="text-light" size="medium">
				{{ i18n.baseText('workflowReviews.detail.metadata.requestedBy') }}
			</N8nText>
			<div v-if="review.requester" :class="$style.person">
				<InboxAvatarTooltip :name="formatUserDisplayName(review.requester)">
					<N8nAvatar
						:first-name="review.requester.firstName"
						:last-name="review.requester.lastName"
						size="xsmall"
					/>
				</InboxAvatarTooltip>
				<N8nText size="medium">{{ formatUserDisplayName(review.requester) }}</N8nText>
			</div>
			<N8nText
				v-else
				color="text-light"
				size="medium"
				data-test-id="workflow-review-detail-requester-deleted"
			>
				{{ i18n.baseText('workflowReviews.detail.metadata.requesterDeleted') }}
			</N8nText>
		</section>

		<section
			v-if="otherAuthors.length > 0"
			:class="$style.section"
			data-test-id="workflow-review-detail-other-authors"
		>
			<N8nText bold color="text-light" size="medium">
				{{ i18n.baseText('workflowReviews.detail.metadata.otherAuthors') }}
			</N8nText>
			<div v-for="author in otherAuthors" :key="author.id" :class="$style.person">
				<InboxAvatarTooltip :name="formatUserDisplayName(author)">
					<N8nAvatar :first-name="author.firstName" :last-name="author.lastName" size="xsmall" />
				</InboxAvatarTooltip>
				<N8nText size="medium">{{ formatUserDisplayName(author) }}</N8nText>
			</div>
		</section>

		<section :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nText bold color="text-light" size="medium">
					{{ i18n.baseText('workflowReviews.detail.metadata.reviewers') }}
				</N8nText>
				<N8nIconButton
					v-if="nextReviewer"
					icon="plus"
					variant="ghost"
					size="xsmall"
					:aria-label="i18n.baseText('workflowReviews.detail.metadata.addReviewer')"
					data-test-id="workflow-review-detail-add-reviewer"
					@click="addReviewer"
				/>
			</div>
			<div v-for="reviewer in reviewers" :key="reviewer.id" :class="$style.person">
				<InboxAvatarTooltip :name="formatUserDisplayName(reviewer)">
					<N8nAvatar
						:first-name="reviewer.firstName"
						:last-name="reviewer.lastName"
						size="xsmall"
					/>
				</InboxAvatarTooltip>
				<N8nText size="medium">{{ formatUserDisplayName(reviewer) }}</N8nText>
			</div>
			<N8nText
				v-if="reviewers.length === 0"
				color="text-light"
				size="medium"
				data-test-id="workflow-review-detail-no-reviewers"
			>
				{{ i18n.baseText('workflowReviews.detail.metadata.noReviewers') }}
			</N8nText>
		</section>

		<section
			v-if="detail?.workflows.length"
			:class="$style.section"
			data-test-id="workflow-review-detail-changes-card"
		>
			<N8nText bold color="text-light" size="medium">
				{{
					i18n.baseText('workflowReviews.detail.metadata.workflow', {
						adjustToNumber: detail.workflows.length,
					})
				}}
			</N8nText>
			<div :class="$style.workflows">
				<N8nLink
					v-for="workflow in detail.workflows"
					:key="workflow.workflowId"
					:to="{ name: VIEWS.WORKFLOW, params: { workflowId: workflow.workflowId } }"
					theme="text"
					size="medium"
					:underline="!hoverLinks"
					:class="[$style.workflow, hoverLinks && $style.plainLink]"
					data-test-id="workflow-review-detail-workflow-link"
				>
					<N8nIcon icon="workflow" size="medium" :class="$style.workflowIcon" />
					<span :class="$style.workflowName">{{ workflow.workflowName }}</span>
				</N8nLink>
			</div>
		</section>
		<section
			v-if="$slots.extra"
			:class="$style.section"
			data-test-id="workflow-review-detail-extra"
		>
			<slot name="extra" />
		</section>
	</aside>
</template>

<style module lang="scss">
.metadata {
	position: sticky;
	top: 0;
	align-self: flex-start;
	display: flex;
	flex: 0 0 min(18rem, 30%);
	flex-direction: column;
	gap: var(--spacing--lg);
	min-width: 14rem;
	margin-top: var(--spacing--5xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--2xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--md);
}

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.statusSeparator {
	margin-inline: var(--spacing--3xs);
	color: var(--text-color--subtler);
}

.workflows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.person {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	/* Names wrap at spaces; an email breaks mid-word only when it does not fit. */
	overflow-wrap: anywhere;
}

.workflow {
	display: flex;
	width: 100%;
	min-width: 0;

	> span,
	> span > span {
		display: flex;
		flex: 1;
		align-items: flex-start;
		min-width: 0;
	}
}

.plainLink:hover,
.plainLink:focus-visible {
	text-decoration: underline;
}

.workflowName {
	flex: 1;
	min-width: 0;
	/* A name with no spaces still has to break somewhere. */
	overflow-wrap: anywhere;
}

.workflowIcon {
	flex-shrink: 0;
	margin-right: var(--spacing--4xs);
	/* Optically centre the icon on the first line of text. */
	margin-top: calc((1lh - 1em) / 2);
}

@media (max-width: 75rem) {
	.metadata {
		flex-basis: 15rem;
		min-width: 12rem;
	}
}

@container review-detail (max-width: 44rem) {
	.metadata {
		flex-basis: auto;
		width: 100%;
		min-width: 0;
	}
}
</style>
