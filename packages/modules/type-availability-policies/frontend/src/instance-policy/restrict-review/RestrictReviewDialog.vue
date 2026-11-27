<script setup lang="ts">
import type { TypeUsage } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { N8nAlertDialog, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { computed } from 'vue';

import { useRestrictReviewStore } from './restrict-review.store';
import type { RestrictedTypeKind } from '../../type-availability-policies.constants';
import { TELEMETRY_POLICY_KIND } from '../../type-availability-policies.telemetry';

const { stacked = false } = defineProps<{
	/** The review opens above an access dialog. */
	stacked?: boolean;
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const review = useRestrictReviewStore();

const DESCRIPTION_KEY: Record<RestrictedTypeKind, { known: BaseTextKey; unknown: BaseTextKey }> = {
	node: {
		known: 'typeAvailabilityPolicies.restrictReview.description.node',
		unknown: 'typeAvailabilityPolicies.restrictReview.descriptionUsageUnknown.node',
	},
	credential: {
		known: 'typeAvailabilityPolicies.restrictReview.description.credential',
		unknown: 'typeAvailabilityPolicies.restrictReview.descriptionUsageUnknown.credential',
	},
};

const BULK_KEY: Record<RestrictedTypeKind, { title: BaseTextKey; description: BaseTextKey }> = {
	node: {
		title: 'typeAvailabilityPolicies.restrictReview.bulk.title.node',
		description: 'typeAvailabilityPolicies.restrictReview.bulk.description.node',
	},
	credential: {
		title: 'typeAvailabilityPolicies.restrictReview.bulk.title.credential',
		description: 'typeAvailabilityPolicies.restrictReview.bulk.description.credential',
	},
};

const usesText = (usage: TypeUsage) =>
	i18n.baseText('typeAvailabilityPolicies.restrictReview.uses', {
		interpolate: {
			uses: i18n.baseText('typeAvailabilityPolicies.restrictReview.usesCount', {
				adjustToNumber: usage.uses,
				interpolate: { count: String(usage.uses) },
			}),
			workflows: i18n.baseText('typeAvailabilityPolicies.usage.workflows', {
				adjustToNumber: usage.workflows,
				interpolate: { count: String(usage.workflows) },
			}),
		},
	});

const activeText = (usage: TypeUsage) =>
	i18n.baseText('typeAvailabilityPolicies.restrictReview.activeWorkflows', {
		adjustToNumber: usage.activeWorkflows,
		interpolate: { count: String(usage.activeWorkflows) },
	});

/** What the open review shows, or `null` when no review is open. */
const content = computed(() => {
	const bulk = review.bulkRequest;
	if (bulk) {
		// A type whose counts did not load gets its own line, but it does not count as in use.
		const used = bulk.items.filter(({ usage }) => usage !== null).length;
		return {
			bulk: true,
			title: i18n.baseText(BULK_KEY[bulk.kind].title, {
				adjustToNumber: bulk.total,
				interpolate: { count: String(bulk.total) },
			}),
			description: i18n.baseText(BULK_KEY[bulk.kind].description, {
				adjustToNumber: used,
				interpolate: { affected: String(used), total: String(bulk.total) },
			}),
			// Each type on its own line: a sum would count a workflow that uses several of them twice.
			lines: bulk.items.map(({ label, usage }) =>
				usage
					? i18n.baseText('typeAvailabilityPolicies.restrictReview.bulk.item', {
							interpolate: { name: label, uses: usesText(usage), active: activeText(usage) },
						})
					: i18n.baseText('typeAvailabilityPolicies.restrictReview.bulk.itemUsageUnknown', {
							interpolate: { name: label },
						}),
			),
			actionLabel: i18n.baseText('typeAvailabilityPolicies.restrictReview.bulk.confirm', {
				interpolate: { count: String(bulk.total) },
			}),
		};
	}

	const single = review.request;
	if (!single) return null;
	return {
		bulk: false,
		title: i18n.baseText('typeAvailabilityPolicies.restrictReview.title', {
			interpolate: { name: single.label },
		}),
		description: i18n.baseText(DESCRIPTION_KEY[single.kind][single.usage ? 'known' : 'unknown']),
		lines: single.usage ? [usesText(single.usage), activeText(single.usage)] : [],
		actionLabel: i18n.baseText('typeAvailabilityPolicies.restrictReview.confirm'),
	};
});

// The page also cancels an open review when it closes. That is not an answer, so only the dialog reports.
// The event names one type, so the review of a bulk restriction answers without it.
function answer(confirmed: boolean) {
	const request = review.request;
	if (request) {
		telemetry.track(TELEMETRY_EVENT.TYPE_AVAILABILITY_POLICIES.USER_REVIEWED_TYPE_RESTRICTION, {
			kind: TELEMETRY_POLICY_KIND[request.kind],
			type_name: request.name,
			decision: confirmed ? 'confirm' : 'cancel',
			use_count: request.usage?.uses ?? null,
			workflow_count: request.usage?.workflows ?? null,
			active_workflow_count: request.usage?.activeWorkflows ?? null,
		});
	}
	review.resolve(confirmed);
}

function onOpenChange(open: boolean) {
	// Escape and a click outside cancel, as the Cancel button does.
	if (!open) answer(false);
}
</script>

<template>
	<N8nAlertDialog
		v-if="content"
		open
		:title="content.title"
		:description="content.description"
		:action-label="content.actionLabel"
		:cancel-label="i18n.baseText('generic.cancel')"
		action-variant="destructive"
		:stacked="stacked"
		@action="answer(true)"
		@update:open="onOpenChange"
	>
		<div :class="$style.content" data-test-id="restrict-review-dialog">
			<ul
				v-if="content.lines.length"
				:class="[$style.usage, { [$style.bulk]: content.bulk }]"
				data-test-id="restrict-review-usage"
			>
				<li v-for="line in content.lines" :key="line">
					<N8nText size="medium" color="text-dark">{{ line }}</N8nText>
				</li>
			</ul>
			<N8nText tag="p" size="medium" color="text-dark">
				{{ i18n.baseText('typeAvailabilityPolicies.restrictReview.consequence') }}
			</N8nText>
		</div>
	</N8nAlertDialog>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.usage {
	margin: 0;
	padding-inline-start: var(--spacing--md);
	list-style: disc;
}

/* A large selection can list many types, so the list scrolls and the buttons stay in view. */
.bulk {
	max-height: var(--spacing--5xl);
	overflow-y: auto;
}
</style>
