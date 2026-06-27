<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { SourceControlReviewSummary } from '@n8n/api-types';
import {
	N8nHeading,
	N8nText,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nActionBox,
	N8nButton,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { SOURCE_CONTROL_CREATE_REVIEW_MODAL_KEY } from '../sourceControl.constants';
import { useSourceControlStore } from '../sourceControl.store';

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const uiStore = useUIStore();
const sourceControlStore = useSourceControlStore();

const isLoading = ref(true);
const reviews = ref<SourceControlReviewSummary[]>([]);

const canCreateReview = computed(() => sourceControlStore.preferences.hasApiToken === true);

const loadReviews = async () => {
	isLoading.value = true;
	try {
		reviews.value = await sourceControlStore.getReviews();
	} catch (error) {
		toast.showError(error, i18n.baseText('sourceControl.reviews.loadError'));
	} finally {
		isLoading.value = false;
	}
};

const openReview = (review: SourceControlReviewSummary) => {
	void router.push({ name: VIEWS.REVIEW_DETAIL, params: { prNumber: String(review.prNumber) } });
};

const openCreateModal = () => {
	uiStore.openModalWithData({
		name: SOURCE_CONTROL_CREATE_REVIEW_MODAL_KEY,
		data: {
			onCreated: (prNumber: number) => {
				void loadReviews();
				void router.push({ name: VIEWS.REVIEW_DETAIL, params: { prNumber: String(prNumber) } });
			},
		},
	});
};

onMounted(loadReviews);
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.headerText">
				<N8nHeading size="2xlarge" tag="h1">
					{{ i18n.baseText('sourceControl.reviews.title') }}
				</N8nHeading>
				<N8nText color="text-base">
					{{ i18n.baseText('sourceControl.reviews.subtitle') }}
				</N8nText>
			</div>
			<N8nButton
				v-if="canCreateReview"
				variant="solid"
				size="medium"
				data-test-id="reviews-create-button"
				@click="openCreateModal"
			>
				{{ i18n.baseText('sourceControl.reviews.create.action') }}
			</N8nButton>
		</div>

		<N8nLoading v-if="isLoading" :rows="3" :class="$style.loading" />

		<N8nActionBox
			v-else-if="reviews.length === 0"
			:heading="i18n.baseText('sourceControl.reviews.empty.title')"
			:description="i18n.baseText('sourceControl.reviews.empty.description')"
			data-test-id="reviews-empty"
		/>

		<ul v-else :class="$style.list" data-test-id="reviews-list">
			<li
				v-for="review in reviews"
				:key="review.prNumber"
				:class="$style.card"
				data-test-id="review-card"
				@click="openReview(review)"
			>
				<div :class="$style.cardMain">
					<N8nIcon icon="git-branch" :class="$style.prIcon" />
					<div :class="$style.cardText">
						<div :class="$style.cardTitleRow">
							<N8nText bold :class="$style.cardTitle">{{ review.title }}</N8nText>
							<span v-if="review.isApproved" :class="$style.approvedBadge">
								<N8nIcon
									icon="circle-check"
									color="success"
									size="medium"
									data-test-id="review-list-approved-badge"
								/>
							</span>
							<span v-if="review.isDraft" :class="$style.draftBadge">
								{{ i18n.baseText('sourceControl.reviews.draft') }}
							</span>
						</div>
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText('sourceControl.reviews.meta', {
									interpolate: {
										number: review.prNumber,
										author: review.author ?? '—',
										branch: review.sourceBranch,
									},
								})
							}}
						</N8nText>
					</div>
				</div>
				<div :class="$style.cardAside">
					<N8nText v-if="review.workflowChangeCount !== undefined" size="small" color="text-light">
						{{
							i18n.baseText('sourceControl.reviews.workflowCount', {
								interpolate: { count: review.workflowChangeCount },
							})
						}}
					</N8nText>
					<N8nLink :href="review.url" target="_blank" :class="$style.externalLink" @click.stop>
						<N8nIcon icon="external-link" size="small" />
					</N8nLink>
				</div>
			</li>
		</ul>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--2xl);
	max-width: 900px;
	margin: 0 auto;
	width: 100%;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.loading {
	margin-top: var(--spacing--md);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	list-style: none;
	padding: 0;
	margin: 0;
}

.card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border-width) solid var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	cursor: pointer;

	&:hover {
		border-color: var(--color--primary);
	}
}

.cardMain {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	min-width: 0;
}

.prIcon {
	color: var(--color--success);
	flex-shrink: 0;
}

.cardText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.cardTitleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.cardTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: 1.25;
}

.approvedBadge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	line-height: 0;
}

.draftBadge {
	font-size: var(--font-size--3xs);
	text-transform: uppercase;
	padding: 0 var(--spacing--3xs);
	border-radius: var(--radius);
	background-color: var(--color--foreground);
	color: var(--color--text--shade-1);
}

.cardAside {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-shrink: 0;
}

.externalLink {
	display: flex;
	align-items: center;
}
</style>
