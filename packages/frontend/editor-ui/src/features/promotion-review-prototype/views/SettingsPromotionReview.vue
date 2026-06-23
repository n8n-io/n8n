<script lang="ts" setup>
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import MarkForDeploymentPanel from '../components/MarkForDeploymentPanel.vue';
import PromotionReviewPanel from '../components/PromotionReviewPanel.vue';
import SourceConnectionsPairing from '../components/SourceConnectionsPairing.vue';
import { usePromotionReviewStore } from '../promotionReview.store';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';
import {
	N8nBadge,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const store = usePromotionReviewStore();
const { pendingPromotions, selectedPromotionId, isLoading } = storeToRefs(store);

onMounted(async () => {
	documentTitle.set(i18n.baseText('promotionReview.title'));
	await store.loadProjects();
	await store.loadPending();
});

async function onSelectPromotion(id: string) {
	try {
		await store.selectPromotion(id);
	} catch (error) {
		toast.showError(error, i18n.baseText('promotionReview.toast.plan.error'));
	}
}

async function onApprove() {
	try {
		const ok = await store.approveSelected();
		if (ok) {
			toast.showMessage({
				title: i18n.baseText('promotionReview.toast.approved.title'),
				message: i18n.baseText('promotionReview.toast.approved.message'),
				type: 'success',
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('promotionReview.toast.approved.error'));
	}
}

async function onReject() {
	try {
		await store.rejectSelected();
		toast.showMessage({
			title: i18n.baseText('promotionReview.toast.rejected.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('promotionReview.toast.rejected.error'));
	}
}

function formatSubmittedAt(iso: string) {
	return new Date(iso).toLocaleString();
}
</script>

<template>
	<div :class="$style.page" data-test-id="promotion-review-page">
		<N8nHeading tag="h1" size="2xlarge" :class="$style.pageTitle">
			{{ i18n.baseText('promotionReview.title') }}
		</N8nHeading>

		<N8nCallout theme="info" :class="$style.prototypeBanner">
			{{ i18n.baseText('promotionReview.prototypeBanner') }}
		</N8nCallout>

		<div :class="$style.layout">
			<aside :class="$style.inbox">
				<MarkForDeploymentPanel />

				<SourceConnectionsPairing />

				<N8nHeading tag="h2" size="small" :class="$style.inboxTitle">
					{{ i18n.baseText('promotionReview.inbox.title') }}
				</N8nHeading>

				<N8nText v-if="isLoading" color="text-light" size="small">
					{{ i18n.baseText('genericHelpers.loading') }}
				</N8nText>

				<N8nText
					v-else-if="pendingPromotions.length === 0"
					color="text-light"
					size="small"
					data-test-id="promotion-review-empty"
				>
					{{ i18n.baseText('promotionReview.inbox.empty') }}
				</N8nText>

				<button
					v-for="promotion in pendingPromotions"
					:key="promotion.id"
					type="button"
					:class="[
						$style.inboxItem,
						selectedPromotionId === promotion.id && $style.inboxItemActive,
					]"
					data-test-id="promotion-review-inbox-item"
					@click="onSelectPromotion(promotion.id)"
				>
					<div :class="$style.inboxItemHeader">
						<N8nIcon icon="git-branch" size="small" />
						<N8nText bold>{{ promotion.title }}</N8nText>
					</div>
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText('promotionReview.inbox.from', {
								interpolate: {
									instance: promotion.sourceInstanceName,
									branch: promotion.sourceBranch,
								},
							})
						}}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ formatSubmittedAt(promotion.submittedAt) }} · {{ promotion.submittedBy }}
					</N8nText>
					<div :class="$style.inboxBadges">
						<N8nBadge size="small">
							{{
								i18n.baseText('promotionReview.inbox.workflowCount', {
									interpolate: { count: String(promotion.workflowCount) },
								})
							}}
						</N8nBadge>
						<N8nBadge v-if="promotion.hasBlockers" theme="warning" size="small">
							{{ i18n.baseText('promotionReview.inbox.needsAction') }}
						</N8nBadge>
					</div>
				</button>
			</aside>

			<main :class="$style.detail">
				<PromotionReviewPanel
					v-if="selectedPromotionId"
					@approve="onApprove"
					@reject="onReject"
				/>
				<div v-else :class="$style.placeholder" data-test-id="promotion-review-placeholder">
					<N8nIcon icon="git-branch" size="xlarge" :class="$style.placeholderIcon" />
					<N8nHeading tag="h2" size="medium">
						{{ i18n.baseText('promotionReview.placeholder.title') }}
					</N8nHeading>
					<N8nText color="text-light">
						{{ i18n.baseText('promotionReview.placeholder.description') }}
					</N8nText>
				</div>
			</main>
		</div>
	</div>
</template>

<style lang="scss" module>
.page {
	padding: var(--spacing--lg) 0 var(--spacing--3xl);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.pageTitle {
	margin: 0;
}

.prototypeBanner {
	margin: 0;
}

.layout {
	display: grid;
	grid-template-columns: 320px 1fr;
	gap: var(--spacing--lg);
	align-items: start;
}

.inbox {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.inboxTitle {
	margin: 0;
}

.inboxItem {
	text-align: left;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--foreground);
	cursor: pointer;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);

	&:hover {
		border-color: var(--color--primary--tint-1);
	}
}

.inboxItemActive {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 1px var(--color--primary--tint-2);
}

.inboxItemHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.inboxBadges {
	display: flex;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
	margin-top: var(--spacing--3xs);
}

.detail {
	min-height: 720px;
}

.placeholder {
	height: 100%;
	min-height: 360px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	text-align: center;
	padding: var(--spacing--2xl);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--foreground);
}

.placeholderIcon {
	color: var(--color--text--tint-2);
}
</style>
