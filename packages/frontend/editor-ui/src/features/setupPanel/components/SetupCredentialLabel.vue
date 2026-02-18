<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nTooltip } from '@n8n/design-system';

defineProps<{
	nodeName: string;
	credentialType: string;
	nodesWithSameCredential: string[];
}>();

const emit = defineEmits<{
	hintMouseEnter: [];
	hintMouseLeave: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style['credential-label-row']">
		<label
			data-test-id="node-setup-card-credential-label"
			:for="`credential-picker-${nodeName}-${credentialType}`"
			:class="$style['credential-label']"
		>
			{{ i18n.baseText('setupPanel.credentialLabel') }}
		</label>
		<N8nTooltip v-if="nodesWithSameCredential.length > 1" placement="top">
			<template #content>
				{{ nodesWithSameCredential.join(', ') }}
			</template>
			<span
				data-test-id="node-setup-card-shared-nodes-hint"
				:class="$style['shared-nodes-hint']"
				@mouseenter="emit('hintMouseEnter')"
				@mouseleave="emit('hintMouseLeave')"
			>
				{{
					i18n.baseText('setupPanel.usedInNodes', {
						interpolate: {
							count: String(nodesWithSameCredential.length),
						},
					})
				}}
			</span>
		</N8nTooltip>
	</div>
</template>

<style module lang="scss">
.credential-label-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.credential-label {
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
}

.shared-nodes-hint {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	cursor: default;
}
</style>
