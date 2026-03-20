<script lang="ts" setup>
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode, InstanceAiPlanSpec } from '@n8n/api-types';

import InstanceAiPlanTimeline from './InstanceAiPlanTimeline.vue';

defineProps<{
	agentNode: InstanceAiAgentNode;
	plan: InstanceAiPlanSpec;
}>();

const emit = defineEmits<{ close: [] }>();
const i18n = useI18n();
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<div :class="$style.headerTitle">
				<N8nIcon icon="list-checks" size="small" />
				<span>{{ i18n.baseText('instanceAi.planTimeline.title') }}</span>
			</div>
			<N8nIconButton icon="x" variant="ghost" size="small" @click="emit('close')" />
		</div>

		<div :class="$style.body">
			<InstanceAiPlanTimeline :agent-node="agentNode" :plan="plan" />
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: 620px;
	background: var(--color--background);
	border-left: var(--border);
	display: flex;
	flex-direction: column;
	z-index: 10;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.body {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--sm);
}
</style>
