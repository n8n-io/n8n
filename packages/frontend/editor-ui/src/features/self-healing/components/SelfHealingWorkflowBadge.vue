<script setup lang="ts">
import { N8nIcon, N8nSpinner, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '@/features/workflow-reviews/constants';

import { useSelfHealingStore } from '../selfHealing.store';

/**
 * Chip on a workflow card: whether self-healing watches this workflow and
 * what the assistant last did. Renders nothing when the flag is off or the
 * workflow is not enrolled.
 */
const props = defineProps<{
	workflowId: string;
	projectId?: string | null;
}>();

const i18n = useI18n();
const store = useSelfHealingStore();

const status = computed(() => store.getWorkflowStatus(props.workflowId, props.projectId));

const reviewRoute = computed(() =>
	status.value.enrolled && status.value.state === 'in_review'
		? { name: WORKFLOW_REVIEW_REQUESTS_VIEW, params: { reviewRequestId: status.value.reviewId } }
		: null,
);

const tooltip = computed(() => {
	if (!status.value.enrolled) return '';
	switch (status.value.state) {
		case 'fixing':
			return i18n.baseText('selfHealing.badge.tooltip.fixing');
		case 'in_review':
			return i18n.baseText('selfHealing.badge.tooltip.inReview');
		case 'healed':
			return i18n.baseText('selfHealing.badge.tooltip.healed');
		default:
			return i18n.baseText('selfHealing.badge.tooltip.monitoring');
	}
});
</script>

<template>
	<N8nTooltip v-if="store.isEnabled && status.enrolled" placement="top">
		<template #content>{{ tooltip }}</template>
		<component
			:is="reviewRoute ? RouterLink : 'div'"
			:to="reviewRoute ?? undefined"
			:class="[$style.badge, { [$style.link]: reviewRoute !== null }]"
			:data-state="status.state"
			data-test-id="workflow-card-self-healing"
		>
			<N8nSpinner v-if="status.state === 'fixing'" size="small" :class="$style.spinner" />
			<N8nIcon
				v-else
				:icon="status.state === 'in_review' ? 'message-square-text' : 'sparkles'"
				size="small"
				:class="[$style.icon, { [$style.iconWarning]: status.state === 'in_review' }]"
			/>
			<N8nText size="small" color="text-base" :class="$style.label">
				<template v-if="status.state === 'healed'">
					{{ i18n.baseText('selfHealing.badge.healed') }}
					<TimeAgo :date="status.healedAt" />
				</template>
				<template v-else-if="status.state === 'in_review'">
					{{ i18n.baseText('selfHealing.badge.inReview') }}
				</template>
				<template v-else-if="status.state === 'fixing'">
					{{ i18n.baseText('selfHealing.badge.fixing') }}
				</template>
				<template v-else>
					{{ i18n.baseText('selfHealing.badge.monitoring') }}
				</template>
			</N8nText>
		</component>
	</N8nTooltip>
</template>

<style lang="scss" module>
// Mirrors the publication indicator chip so the two sit on one baseline.
.badge {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--spacing--4xs);
	border: var(--border);
	text-decoration: none;
	white-space: nowrap;

	* {
		line-height: calc(var(--font-size--sm) + var(--border-width));
	}
}

.link {
	cursor: pointer;

	&:hover {
		background-color: var(--background--active);
	}
}

.icon {
	color: var(--color--secondary);
}

.iconWarning {
	color: var(--color--warning);
}

.spinner {
	color: var(--color--secondary);
}

.label {
	display: inline-flex;
	gap: var(--spacing--4xs);
}
</style>
