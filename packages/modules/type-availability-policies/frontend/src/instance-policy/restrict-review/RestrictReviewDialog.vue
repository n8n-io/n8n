<script setup lang="ts">
import { N8nAlertDialog, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import { useRestrictReviewStore } from './restrict-review.store';
import type { RestrictedTypeKind } from '../../type-availability-policies.constants';

const { stacked = false } = defineProps<{
	/** The review opens above an access dialog. */
	stacked?: boolean;
}>();

const i18n = useI18n();
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

const description = computed(() => {
	const request = review.request;
	if (!request) return '';
	return i18n.baseText(DESCRIPTION_KEY[request.kind][request.usage ? 'known' : 'unknown']);
});

const usageLines = computed(() => {
	const usage = review.request?.usage;
	if (!usage) return [];
	return [
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
		}),
		i18n.baseText('typeAvailabilityPolicies.restrictReview.activeWorkflows', {
			adjustToNumber: usage.activeWorkflows,
			interpolate: { count: String(usage.activeWorkflows) },
		}),
	];
});

function onOpenChange(open: boolean) {
	// Escape and a click outside cancel, as the Cancel button does.
	if (!open) review.resolve(false);
}
</script>

<template>
	<N8nAlertDialog
		v-if="review.request"
		open
		:title="
			i18n.baseText('typeAvailabilityPolicies.restrictReview.title', {
				interpolate: { name: review.request.label },
			})
		"
		:description="description"
		:action-label="i18n.baseText('typeAvailabilityPolicies.restrictReview.confirm')"
		:cancel-label="i18n.baseText('generic.cancel')"
		action-variant="destructive"
		:stacked="stacked"
		@action="review.resolve(true)"
		@update:open="onOpenChange"
	>
		<div :class="$style.content" data-test-id="restrict-review-dialog">
			<ul v-if="usageLines.length" :class="$style.usage" data-test-id="restrict-review-usage">
				<li v-for="line in usageLines" :key="line">
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
</style>
