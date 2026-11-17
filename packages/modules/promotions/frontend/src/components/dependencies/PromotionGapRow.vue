<script setup lang="ts">
import type { PromotionDirection, PromotionReferenceUsage } from '@n8n/api-types';
import { N8nBadge, N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { usePromotionDependencyLabels } from '../../composables/usePromotionDependencyLabels';
import type { GapGroupId, GapTargetRow } from '../../promotionDependencies';
import type { ResourceKey } from '../../promotionPreview.selection';
import { httpUrl } from '../../promotionResult';
import PromotionWorkflowLinks from '../preview/PromotionWorkflowLinks.vue';
import PromotionDependencyTarget from './PromotionDependencyTarget.vue';

export type OwnerRequestState = 'sending' | 'sent' | 'failed';

/**
 * One target of the dependency report with every reference to it, and the exits that the user
 * can take. A read-only row lists the same facts without actions, for the confirmation dialog.
 */
const props = defineProps<{
	row: GapTargetRow;
	group: GapGroupId;
	direction: PromotionDirection;
	readOnly?: boolean;
	/** True while the operation runs. The actions wait. */
	locked?: boolean;
	/** False when the page has no way to send a request to the owner. */
	canAskOwner?: boolean;
	ownerRequest?: OwnerRequestState;
	/** Where an incomplete Apply creates the placeholder of this credential. */
	placeholderProject?: string;
}>();

const emit = defineEmits<{
	include: [];
	askOwner: [];
	removeDeletion: [];
	inspect: [key: ResourceKey];
}>();

const i18n = useI18n();
const router = useRouter();
const rbacStore = useRBACStore();
const settingsStore = useSettingsStore();
const { targetName, stateLabel, usageLabel, rowFix, detailText } = usePromotionDependencyLabels();

const has = (exit: GapTargetRow['exits'][number]) =>
	!props.readOnly && props.row.exits.includes(exit);

// The references of one usage form one line: "Used by A and B".
const usages = computed(() => {
	const byUsage = new Map<PromotionReferenceUsage, Array<{ key: ResourceKey; name: string }>>();
	for (const { usage, consumer } of props.row.gaps) {
		const consumers = byUsage.get(usage) ?? [];
		consumers.push({ key: `workflow:${consumer.id}`, name: consumer.name });
		byUsage.set(usage, consumers);
	}
	return [...byUsage].map(([usage, workflows]) => ({ usage, workflows }));
});

const fix = computed(() => rowFix(props.group, props.row));
const details = computed(() =>
	props.row.details.flatMap((detail) => {
		const text = detailText(detail);
		return text ? [{ detail, text }] : [];
	}),
);
const name = computed(() => targetName(props.row.target));

// The review opens in the Inbox when the user can read it there, else on the Git host.
const reviewLink = computed(() => {
	const review = props.row.review;
	if (!review) return undefined;
	const canOpenInbox =
		settingsStore.settings.inbox?.enabled === true && rbacStore.hasScope('promotions:readReviews');
	if (canOpenInbox) {
		return { href: router.resolve(`/inbox/promotion-reviews/${review.reviewId}`).href };
	}
	const external = httpUrl(review.webUrl);
	return external ? { href: external, external: true } : undefined;
});

// "Restore it" and "Change the policy" both happen in the workflow on this instance.
const workflowHref = computed(() =>
	props.row.target.kind === 'workflow'
		? router.resolve({ name: VIEWS.WORKFLOW, params: { name: props.row.target.id } }).href
		: undefined,
);

const ownerRequestSent = computed(
	() => props.row.ownerRequestSent || props.ownerRequest === 'sent',
);
</script>

<template>
	<li :class="$style.row" data-test-id="promotion-gap-row" :data-gap-target="row.key">
		<div :class="$style.main">
			<PromotionDependencyTarget :target="row.target" />
			<N8nText
				v-for="{ usage, workflows } in usages"
				:key="usage"
				tag="p"
				step="2xs"
				color="text-light"
				:class="$style.detail"
			>
				{{ usageLabel(usage) }}
				<PromotionWorkflowLinks
					v-if="!readOnly"
					:workflows="workflows"
					@inspect="emit('inspect', $event)"
				/>
				<template v-else>{{ workflows.map((workflow) => workflow.name).join(', ') }}</template>
			</N8nText>
			<N8nText v-if="fix" tag="p" step="2xs" color="text-base" :class="$style.detail">
				{{ fix }}
			</N8nText>
			<N8nText
				v-for="{ detail, text } in details"
				:key="detail"
				tag="p"
				step="2xs"
				color="text-base"
				:class="$style.detail"
				data-test-id="promotion-gap-detail"
			>
				{{ text }}
			</N8nText>
			<N8nText
				v-if="placeholderProject !== undefined"
				tag="p"
				step="2xs"
				color="text-base"
				:class="$style.detail"
				data-test-id="promotion-gap-placeholder"
			>
				{{
					placeholderProject
						? i18n.baseText('promotions.dependencies.placeholder.inProject', {
								interpolate: { project: placeholderProject },
							})
						: i18n.baseText('promotions.dependencies.placeholder')
				}}
			</N8nText>
			<N8nText
				v-if="ownerRequest === 'failed'"
				tag="p"
				step="2xs"
				color="danger"
				role="alert"
				:class="$style.detail"
			>
				{{ i18n.baseText('promotions.dependencies.exit.askOwner.failed') }}
			</N8nText>
		</div>

		<div :class="$style.state">
			<N8nBadge
				v-if="row.state"
				:variant="row.state === 'in-open-review' ? 'info' : 'subtle'"
				data-test-id="promotion-gap-state"
			>
				{{ stateLabel(row.state) }}
			</N8nBadge>
			<N8nText v-if="row.gaps.length > 1" step="2xs" color="text-light">
				{{
					i18n.baseText('promotions.dependencies.references', {
						adjustToNumber: row.gaps.length,
						interpolate: { count: String(row.gaps.length) },
					})
				}}
			</N8nText>
		</div>

		<div v-if="!readOnly" :class="$style.actions">
			<N8nButton
				v-if="has('include') && row.include"
				variant="outline"
				size="small"
				icon="plus"
				:disabled="locked"
				:aria-label="
					i18n.baseText('promotions.dependencies.exit.include.label', { interpolate: { name } })
				"
				data-test-id="promotion-gap-include"
				@click="emit('include')"
			>
				{{ i18n.baseText('promotions.dependencies.exit.include') }}
			</N8nButton>
			<N8nButton
				v-if="(has('open-review') || row.state === 'in-open-review') && reviewLink"
				variant="outline"
				size="small"
				:href="reviewLink.href"
				:target="reviewLink.external ? '_blank' : undefined"
				:rel="reviewLink.external ? 'noopener noreferrer' : undefined"
				data-test-id="promotion-gap-open-review"
			>
				{{ i18n.baseText('promotions.dependencies.exit.openReview') }}
			</N8nButton>
			<template v-if="has('ask-owner')">
				<N8nText
					v-if="ownerRequestSent"
					step="xs"
					color="success"
					role="status"
					:class="$style.sent"
					data-test-id="promotion-gap-request-sent"
				>
					<N8nIcon icon="circle-check" size="small" />
					{{ i18n.baseText('promotions.dependencies.exit.askOwner.sent') }}
				</N8nText>
				<N8nTooltip
					v-else
					:disabled="canAskOwner"
					:content="i18n.baseText('promotions.dependencies.exit.askOwner.unavailable')"
				>
					<N8nButton
						variant="outline"
						size="small"
						icon="send"
						:loading="ownerRequest === 'sending'"
						:disabled="locked || !canAskOwner"
						:aria-label="
							i18n.baseText('promotions.dependencies.exit.askOwner.label', {
								interpolate: { name },
							})
						"
						data-test-id="promotion-gap-ask-owner"
						@click="emit('askOwner')"
					>
						{{ i18n.baseText('promotions.dependencies.exit.askOwner') }}
					</N8nButton>
				</N8nTooltip>
			</template>
			<N8nButton
				v-if="has('restore') && workflowHref"
				variant="outline"
				size="small"
				:href="workflowHref"
				target="_blank"
				data-test-id="promotion-gap-restore"
			>
				{{ i18n.baseText('promotions.dependencies.exit.restore') }}
			</N8nButton>
			<N8nButton
				v-if="has('change-policy') && workflowHref"
				variant="outline"
				size="small"
				:href="workflowHref"
				target="_blank"
				data-test-id="promotion-gap-change-policy"
			>
				{{ i18n.baseText('promotions.dependencies.exit.changePolicy') }}
			</N8nButton>
			<N8nButton
				v-if="has('remove-deletion')"
				variant="outline"
				size="small"
				:disabled="locked"
				data-test-id="promotion-gap-remove-deletion"
				@click="emit('removeDeletion')"
			>
				{{ i18n.baseText('promotions.dependencies.exit.removeDeletion') }}
			</N8nButton>
		</div>
	</li>
</template>

<style module lang="scss">
.row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto auto;
	align-items: center;
	column-gap: var(--spacing--sm);
	row-gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);

	&:not(:first-child) {
		border-top: var(--border);
	}
}

.main {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.detail {
	margin: 0;
	/* Lines up with the name, after the icon. */
	padding-left: calc(var(--spacing--xs) + var(--spacing--2xs));
}

.state {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	/* One width for every row, so the state column lines up across rows. */
	min-width: var(--spacing--5xl);
}

.sent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}
</style>
