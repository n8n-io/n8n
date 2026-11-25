<script lang="ts" setup>
import { computed } from 'vue';
import { N8nSpinner, N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { i18n, type BaseTextKey } from '@n8n/i18n';
import type { TerminalState } from '../workflowSetup.types';

const props = defineProps<{ state: TerminalState }>();

type IconClass = 'iconLoading' | 'iconSuccess' | 'iconWarning' | 'iconMuted';
type StatusView = {
	icon: IconName;
	iconClass: IconClass;
	labelKey: BaseTextKey;
};

const STATUS_BY_STATE: Record<TerminalState, StatusView> = {
	applying: {
		icon: 'spinner',
		iconClass: 'iconLoading',
		labelKey: 'instanceAi.workflowSetup.applying',
	},
	applied: {
		icon: 'check',
		iconClass: 'iconSuccess',
		labelKey: 'instanceAi.workflowSetup.applied',
	},
	partial: {
		icon: 'triangle-alert',
		iconClass: 'iconWarning',
		labelKey: 'instanceAi.workflowSetup.partiallyApplied',
	},
	deferred: {
		icon: 'arrow-right',
		iconClass: 'iconMuted',
		labelKey: 'instanceAi.workflowSetup.deferred',
	},
};

const statusView = computed(() => STATUS_BY_STATE[props.state]);
</script>

<template>
	<div :class="$style.status" :data-test-id="`instance-ai-workflow-setup-status-${state}`">
		<N8nSpinner
			v-if="state === 'applying'"
			type="dots"
			size="small"
			:class="$style[statusView.iconClass]"
		/>
		<N8nIcon v-else :icon="statusView.icon" size="small" :class="$style[statusView.iconClass]" />
		<N8nText size="small" color="text-light">
			{{ i18n.baseText(statusView.labelKey) }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
	font-size: var(--font-size--2xs);
}

.iconLoading {
	color: var(--color--text--tint-1);
}

.iconSuccess {
	color: var(--color--success);
}

.iconWarning {
	color: var(--color--warning);
}

.iconMuted {
	color: var(--color--text--tint-2);
}
</style>
