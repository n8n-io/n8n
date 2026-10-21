<script setup lang="ts">
import type { BreakingChangeRuleImpact } from '@n8n/api-types';
import { N8nBadge } from '@n8n/design-system';
import type { BadgeVariant } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

defineOptions({ name: 'ImpactTag' });

const props = withDefaults(
	defineProps<{
		impact: BreakingChangeRuleImpact;
		scope?: 'workflow' | 'instance';
	}>(),
	{ scope: 'workflow' },
);

const i18n = useI18n();

const labels = computed<Record<BreakingChangeRuleImpact, string>>(() => ({
	upgradeBlocked: i18n.baseText('settings.migrationReport.impact.upgradeBlocked'),
	executionsFail: i18n.baseText('settings.migrationReport.impact.executionsFail'),
	behaviorChanges: i18n.baseText('settings.migrationReport.impact.behaviorChanges'),
	capabilityRemoved: i18n.baseText('settings.migrationReport.impact.capabilityRemoved'),
}));

// Danger for impacts that stop the instance or the executions, warning when
// runs continue with a different result, neutral when nothing at runtime changes.
const badgeVariants: Record<BreakingChangeRuleImpact, BadgeVariant> = {
	upgradeBlocked: 'danger',
	executionsFail: 'danger',
	behaviorChanges: 'warning',
	capabilityRemoved: 'outline',
};

// An instance finding depends on the instance configuration, so executions
// might fail, not will fail. Warning shows this lower certainty.
const isInstanceExecutionsFail = computed(
	() => props.scope === 'instance' && props.impact === 'executionsFail',
);

const label = computed(() =>
	isInstanceExecutionsFail.value
		? i18n.baseText('settings.migrationReport.instanceImpact.executionsFail')
		: labels.value[props.impact],
);

const variant = computed<BadgeVariant>(() =>
	isInstanceExecutionsFail.value ? 'warning' : badgeVariants[props.impact],
);
</script>

<template>
	<N8nBadge :variant="variant" data-test-id="migration-rule-impact-tag">
		{{ label }}
	</N8nBadge>
</template>
