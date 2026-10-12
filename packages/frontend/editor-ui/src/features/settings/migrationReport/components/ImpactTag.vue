<script setup lang="ts">
import type { BreakingChangeRuleImpact } from '@n8n/api-types';
import { N8nBadge } from '@n8n/design-system';
import type { BadgeVariant } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

defineOptions({ name: 'ImpactTag' });

defineProps<{
	impact: BreakingChangeRuleImpact;
}>();

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
</script>

<template>
	<N8nBadge :variant="badgeVariants[impact]" data-test-id="migration-rule-impact-tag">
		{{ labels[impact] }}
	</N8nBadge>
</template>
