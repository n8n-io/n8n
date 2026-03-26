<script setup lang="ts">
import { N8nCallout, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useAiGateway } from '@/app/composables/useAiGateway';

const props = defineProps<{
	isProxied: boolean;
}>();

const emit = defineEmits<{
	toggle: [enabled: boolean];
}>();

const i18n = useI18n();
const { creditsQuota } = useAiGateway();
</script>

<template>
	<div :class="$style.wrapper" data-test-id="ai-gateway-toggle">
		<div :class="$style.toggleRow">
			<N8nSwitch2
				:model-value="props.isProxied"
				data-test-id="ai-gateway-toggle-switch"
				@update:model-value="(val) => emit('toggle', Boolean(val))"
			/>
			<N8nText size="small" color="text-dark">
				{{ i18n.baseText('aiGateway.toggle.label') }}
			</N8nText>
		</div>
		<N8nCallout v-if="props.isProxied" theme="success" iconless>
			{{ i18n.baseText('aiGateway.toggle.description') }}
			<template #trailingContent>
				<span :class="$style.tokensBadge">
					{{
						i18n.baseText('aiGateway.toggle.tokensRemaining', {
							interpolate: { count: String(creditsQuota) },
						})
					}}
				</span>
			</template>
		</N8nCallout>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--3xs);
}

.toggleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.tokensBadge {
	flex-shrink: 0;
	padding: var(--spacing--4xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--callout--border-color--success);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--success--shade-1);
	white-space: nowrap;
}
</style>
