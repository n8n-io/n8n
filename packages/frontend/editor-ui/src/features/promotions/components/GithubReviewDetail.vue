<script lang="ts" setup>
import type { PromotionSummary } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nLink,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import { useToast } from '@/app/composables/useToast';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import PromotionStateBadge from '@/features/promotions/components/PromotionStateBadge.vue';
import { usePromotionsStore } from '@/features/promotions/promotions.store';
import {
	decideWorkflowReviewRequest,
	type WorkflowReviewDecisionInput,
} from '@/features/workflow-reviews/workflowReviews.api';

const props = defineProps<{
	promotion: PromotionSummary;
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const promotionsStore = usePromotionsStore();
const credentialsStore = useCredentialsStore();

const acting = ref(false);
const syncing = ref(false);
const deciding = ref(false);

const metadata = computed(() => props.promotion.metadata);
const isSource = computed(() => props.promotion.role === 'source');

/**
 * A source promotion whose readiness is gated by a tracked workflow review.
 * Approving that review (inline, below) is what fires mark-ready — so we drive
 * the review from here instead of exposing the raw mark-ready action.
 */
const reviewGated = computed(
	() => isSource.value && props.promotion.state === 'in_review' && !!metadata.value.localReviewId,
);

const requiredCredentials = computed(() => metadata.value.requiredCredentials ?? []);
const bindings = computed(() => metadata.value.bindings ?? {});
const resolvedCount = computed(
	() => requiredCredentials.value.filter((credential) => bindings.value[credential.id]).length,
);
const allBindingsResolved = computed(
	() => resolvedCount.value === requiredCredentials.value.length,
);

const approvals = computed(() => metadata.value.approvals ?? { source: false, destination: false });

/** The state-specific callout, mirroring the design prototype's copy. */
const callout = computed<{ theme: 'info' | 'warning' | 'success' | 'secondary'; text: string }>(
	() => {
		const { state } = props.promotion;
		if (state === 'promoted') {
			return { theme: 'success', text: i18n.baseText('promotions.github.callout.promoted') };
		}
		if (state === 'closed') {
			return { theme: 'secondary', text: i18n.baseText('promotions.github.callout.closed') };
		}
		if (isSource.value) {
			if (state === 'in_review') {
				return {
					theme: 'info',
					text: metadata.value.localReviewId
						? i18n.baseText('promotions.github.callout.source.inReview.tracked')
						: i18n.baseText('promotions.github.callout.source.inReview'),
				};
			}
			return { theme: 'info', text: i18n.baseText('promotions.github.callout.source.waiting') };
		}
		if (state === 'in_review') {
			return { theme: 'info', text: i18n.baseText('promotions.github.callout.destination.draft') };
		}
		if (state === 'waiting_on_destination') {
			return {
				theme: 'warning',
				text: allBindingsResolved.value
					? i18n.baseText('promotions.github.callout.destination.readyToApprove')
					: i18n.baseText('promotions.github.callout.destination.resolveBindings'),
			};
		}
		return { theme: 'success', text: i18n.baseText('promotions.github.callout.destination.apply') };
	},
);

const ACTION_LABEL_KEYS: Record<string, string> = {
	'mark-ready': 'promotions.action.markReady',
	approve: 'promotions.action.approve',
	apply: 'promotions.action.apply',
};

/**
 * resolve-binding is driven inline from the bindings rows. mark-ready is hidden
 * when a tracked review gates readiness — approving the review fires it instead.
 */
const actionButtons = computed(() =>
	props.promotion.availableActions
		.filter((action) => action !== 'resolve-binding')
		.filter((action) => !(action === 'mark-ready' && reviewGated.value))
		.map((action) => ({
			action,
			label: ACTION_LABEL_KEYS[action] ? i18n.baseText(ACTION_LABEL_KEYS[action] as never) : action,
		})),
);

async function decideReview(decision: WorkflowReviewDecisionInput) {
	const reviewId = metadata.value.localReviewId;
	if (!reviewId) return;
	deciding.value = true;
	try {
		await decideWorkflowReviewRequest(rootStore.restApiContext, reviewId, { decision });
		toast.showMessage({
			title: i18n.baseText(
				decision === 'approved'
					? 'promotions.review.approved.toast'
					: 'promotions.review.changesRequested.toast',
			),
			type: 'success',
		});
		// Approval advances the promotion asynchronously (review event → tracker →
		// signal → mark-ready → GitHub → push). The push refreshes it, but poll a
		// few times so the state isn't stale while that round-trip completes.
		if (decision === 'approved') {
			for (const delay of [0, 2000, 4000]) {
				await new Promise((resolve) => setTimeout(resolve, delay));
				await promotionsStore.refetchOne(props.promotion.id);
				if (props.promotion.state !== 'in_review') break;
			}
		} else {
			await promotionsStore.refetchOne(props.promotion.id);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('promotions.review.error'));
	} finally {
		deciding.value = false;
	}
}

async function runAction(action: string, payload?: Record<string, unknown>) {
	acting.value = true;
	try {
		await promotionsStore.runAction(props.promotion.id, action, payload);
		if (action !== 'resolve-binding') {
			toast.showMessage({
				title: i18n.baseText('promotions.action.toast', {
					interpolate: {
						action: ACTION_LABEL_KEYS[action]
							? i18n.baseText(ACTION_LABEL_KEYS[action] as never)
							: action,
					},
				}),
				type: 'success',
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('promotions.action.error'));
	} finally {
		acting.value = false;
	}
}

async function onSync() {
	syncing.value = true;
	try {
		await promotionsStore.sync(props.promotion.id);
		toast.showMessage({ title: i18n.baseText('promotions.sync.toast'), type: 'success' });
	} catch (error) {
		toast.showError(error, i18n.baseText('promotions.sync.error'));
	} finally {
		syncing.value = false;
	}
}

async function onBindCredential(sourceCredentialId: string, targetCredentialId: string) {
	await runAction('resolve-binding', { sourceCredentialId, targetCredentialId });
}

onMounted(async () => {
	if (requiredCredentials.value.length === 0) return;
	// The pickers list local credentials by type; make sure both are loaded.
	await Promise.all([
		credentialsStore.fetchCredentialTypes(false),
		credentialsStore.fetchAllCredentials(),
	]);
});
</script>

<template>
	<div :class="$style.detail" data-test-id="github-review-detail">
		<N8nCallout :theme="callout.theme" :class="$style.callout">
			<div :class="$style.calloutBody">
				<span>{{ callout.text }}</span>
				<div v-if="reviewGated" :class="$style.calloutActions">
					<N8nButton
						type="secondary"
						size="small"
						:label="i18n.baseText('promotions.review.requestChanges')"
						:disabled="deciding"
						data-test-id="promotion-review-request-changes"
						@click="decideReview('changes_requested')"
					/>
					<N8nButton
						size="small"
						:label="i18n.baseText('promotions.review.approve')"
						:disabled="deciding"
						data-test-id="promotion-review-approve"
						@click="decideReview('approved')"
					/>
				</div>
				<div v-else-if="actionButtons.length > 0" :class="$style.calloutActions">
					<N8nButton
						v-for="button in actionButtons"
						:key="button.action"
						:label="button.label"
						:disabled="acting"
						size="small"
						:data-test-id="`promotion-action-${button.action}`"
						@click="runAction(button.action)"
					/>
				</div>
			</div>
		</N8nCallout>

		<div :class="$style.columns">
			<div :class="$style.main">
				<section v-if="requiredCredentials.length > 0" :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nText bold size="medium">
							{{ i18n.baseText('promotions.bindings.title') }}
						</N8nText>
						<N8nText color="text-light" size="small">
							{{
								i18n.baseText('promotions.bindings.progress', {
									interpolate: {
										resolved: String(resolvedCount),
										total: String(requiredCredentials.length),
									},
								})
							}}
						</N8nText>
					</div>
					<N8nText color="text-light" size="small" :class="$style.sectionHint">
						{{ i18n.baseText('promotions.bindings.hint') }}
					</N8nText>

					<ul :class="$style.bindings">
						<li
							v-for="credential in requiredCredentials"
							:key="credential.id"
							:class="$style.bindingRow"
							data-test-id="promotion-binding-row"
						>
							<div :class="$style.bindingInfo">
								<N8nIcon icon="key-round" size="small" :class="$style.bindingIcon" />
								<div>
									<N8nText size="small" bold>{{ credential.name }}</N8nText>
									<N8nText color="text-light" size="xsmall" tag="div">
										{{ credential.type }}
									</N8nText>
								</div>
							</div>
							<div :class="$style.bindingStatus">
								<N8nTooltip
									v-if="bindings[credential.id]"
									:content="i18n.baseText('promotions.bindings.resolved')"
									placement="top"
								>
									<N8nIcon icon="circle-check" size="medium" color="success" />
								</N8nTooltip>
								<N8nText v-else color="warning" size="xsmall">
									{{ i18n.baseText('promotions.bindings.unresolved') }}
								</N8nText>
								<div v-if="!isSource" :class="$style.bindingPicker">
									<CredentialPicker
										:app-name="credential.name"
										:credential-type="credential.type"
										:selected-credential-id="bindings[credential.id] ?? null"
										hide-create-new
										size="small"
										@credential-selected="
											(targetId: string) => onBindCredential(credential.id, targetId)
										"
									/>
								</div>
							</div>
						</li>
					</ul>
				</section>

				<section :class="$style.section">
					<N8nText bold size="medium" tag="div" :class="$style.sectionHeader">
						{{ i18n.baseText('promotions.approvals.title') }}
					</N8nText>
					<ul :class="$style.approvals">
						<li :class="$style.approvalRow">
							<N8nIcon
								:icon="approvals.source ? 'circle-check' : 'circle-dot'"
								:color="approvals.source ? 'success' : 'text-light'"
								size="medium"
							/>
							<N8nText size="small">
								{{ i18n.baseText('promotions.approvals.source') }}
							</N8nText>
						</li>
						<li :class="$style.approvalRow">
							<N8nIcon
								:icon="approvals.destination ? 'circle-check' : 'circle-dot'"
								:color="approvals.destination ? 'success' : 'text-light'"
								size="medium"
							/>
							<N8nText size="small">
								{{ i18n.baseText('promotions.approvals.destination') }}
							</N8nText>
						</li>
					</ul>
				</section>
			</div>

			<aside :class="$style.rail">
				<section :class="$style.railCard">
					<div :class="$style.railHeader">
						<N8nText bold size="small">{{ i18n.baseText('promotions.rail.status') }}</N8nText>
						<N8nTooltip :content="i18n.baseText('promotions.sync.tooltip')" placement="top">
							<N8nIconButton
								icon="refresh-cw"
								type="tertiary"
								size="small"
								:loading="syncing"
								data-test-id="promotion-sync-button"
								@click="onSync"
							/>
						</N8nTooltip>
					</div>
					<div :class="$style.railRow">
						<PromotionStateBadge :state="promotion.state" />
					</div>
					<div :class="$style.railRow">
						<N8nIcon icon="arrow-right" size="small" />
						<N8nText size="small">
							{{
								i18n.baseText(
									isSource
										? 'promotions.rail.direction.source'
										: 'promotions.rail.direction.destination',
									{ interpolate: { branch: metadata.baseBranch ?? 'main' } },
								)
							}}
						</N8nText>
					</div>
					<div :class="$style.railRow">
						<N8nIcon icon="package-open" size="small" />
						<N8nText size="small">
							{{ promotion.unitOfWork.type }} · {{ promotion.unitOfWork.id }}
						</N8nText>
					</div>
				</section>

				<section :class="$style.railCard">
					<N8nText bold size="small" tag="div" :class="$style.railHeader">
						{{ i18n.baseText('promotions.rail.github') }}
					</N8nText>
					<div v-if="promotionsStore.config?.githubRepo" :class="$style.railRow">
						<N8nIcon icon="external-link" size="small" />
						<N8nText size="small">{{ promotionsStore.config.githubRepo }}</N8nText>
					</div>
					<div v-if="metadata.prUrl" :class="$style.railRow">
						<N8nIcon icon="external-link" size="small" />
						<N8nLink :href="metadata.prUrl" new-window size="small">
							{{
								i18n.baseText('promotions.rail.pullRequest', {
									interpolate: { number: String(metadata.prNumber ?? '') },
								})
							}}
						</N8nLink>
					</div>
					<div v-if="metadata.branch" :class="$style.railRow">
						<N8nIcon icon="git-branch" size="small" />
						<N8nText size="small" :class="$style.branch">{{ metadata.branch }}</N8nText>
					</div>
				</section>

				<section v-if="metadata.localReviewId" :class="$style.railCard">
					<N8nText bold size="small" tag="div" :class="$style.railHeader">
						{{ i18n.baseText('promotions.rail.trackedReview') }}
					</N8nText>
					<N8nText color="text-light" size="xsmall">
						{{ i18n.baseText('promotions.rail.trackedReview.hint') }}
					</N8nText>
				</section>
			</aside>
		</div>
	</div>
</template>

<style lang="scss" module>
.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.callout {
	flex-shrink: 0;
}

.calloutBody {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
}

.calloutActions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.columns {
	display: flex;
	gap: var(--spacing--md);
	align-items: flex-start;
	min-width: 0;
}

.main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.rail {
	width: 280px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.section {
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--sm);
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--3xs);
}

.sectionHint {
	display: block;
	margin-bottom: var(--spacing--sm);
}

.bindings,
.approvals {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
}

.bindingRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) 0;

	& + & {
		border-top: var(--border);
	}
}

.bindingInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.bindingIcon {
	color: var(--color--text--tint-1);
}

.bindingStatus {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.bindingPicker {
	min-width: 220px;
}

.approvalRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) 0;
}

.railCard {
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.railHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.railRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	color: var(--color--text--tint-1);
}

.branch {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
