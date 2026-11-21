<script setup lang="ts">
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useWorkflowRulesStore } from '../workflow-rules.store';

const i18n = useI18n();
const store = useWorkflowRulesStore();

const state = computed(() => {
	const blocking = store.blockingFindings.length;
	const warnings = store.warningFindings.length;
	if (blocking > 0) {
		return {
			tone: 'danger',
			icon: 'ban' as const,
			label: i18n.baseText('workflowRules.status.blocking', {
				interpolate: { count: blocking },
				adjustToNumber: blocking,
			}),
		};
	}
	if (warnings > 0) {
		return {
			tone: 'warning',
			icon: 'triangle-alert' as const,
			label: i18n.baseText('workflowRules.status.warnings', {
				interpolate: { count: warnings },
				adjustToNumber: warnings,
			}),
		};
	}
	return {
		tone: 'success',
		icon: 'shield-check' as const,
		label: i18n.baseText('workflowRules.status.passing'),
	};
});
</script>

<template>
	<N8nTooltip
		v-if="store.isEnabled && store.hasRules"
		:content="i18n.baseText('workflowRules.status.tooltip')"
		:show-after="300"
		placement="bottom"
	>
		<button
			type="button"
			:class="[$style.pill, $style[state.tone]]"
			data-test-id="workflow-rules-status"
			data-attr="workflow-rules-status"
			@click="store.showPanel()"
		>
			<N8nIcon :icon="state.icon" size="small" />
			<span>{{ state.label }}</span>
		</button>
	</N8nTooltip>
</template>

<style lang="scss" module>
.pill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: var(--height--md);
	padding: 0 var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: var(--color--background--light-3);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
	cursor: pointer;

	@media (hover: hover) {
		&:hover {
			border-color: currentColor;
		}
	}
}

.success {
	color: var(--color--success);
}

.warning {
	color: var(--color--warning);
}

.danger {
	color: var(--color--danger);
}
</style>
