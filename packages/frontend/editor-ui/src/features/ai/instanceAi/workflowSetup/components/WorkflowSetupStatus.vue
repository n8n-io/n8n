<script lang="ts" setup>
import { N8nIcon, N8nText } from '@n8n/design-system';
import { i18n } from '@n8n/i18n';
import type { TerminalState } from '../workflowSetup.types';

defineProps<{ state: TerminalState }>();
</script>

<template>
	<div :class="$style.status" :data-test-id="`instance-ai-workflow-setup-status-${state}`">
		<template v-if="state === 'applying'">
			<N8nIcon icon="spinner" size="small" spin :class="$style.iconLoading" />
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('instanceAi.workflowSetup.applying') }}
			</N8nText>
		</template>

		<template v-else-if="state === 'applied'">
			<N8nIcon icon="check" size="small" :class="$style.iconSuccess" />
			<N8nText size="small" color="text-light">{{
				i18n.baseText('instanceAi.workflowSetup.applied')
			}}</N8nText>
		</template>

		<template v-else-if="state === 'partial'">
			<N8nIcon icon="triangle-alert" size="small" :class="$style.iconWarning" />
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('instanceAi.workflowSetup.partiallyApplied') }}
			</N8nText>
		</template>

		<template v-else-if="state === 'deferred'">
			<N8nIcon icon="arrow-right" size="small" :class="$style.iconMuted" />
			<N8nText size="small" color="text-light">{{
				i18n.baseText('instanceAi.workflowSetup.deferred')
			}}</N8nText>
		</template>
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
