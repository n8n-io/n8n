<script setup lang="ts">
import { N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	isProxied: boolean;
}>();

const emit = defineEmits<{
	toggle: [enabled: boolean];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.wrapper" data-test-id="ai-gateway-toggle">
		<N8nSwitch2
			:model-value="props.isProxied"
			data-test-id="ai-gateway-toggle-switch"
			@update:model-value="(val) => emit('toggle', Boolean(val))"
		/>
		<div :class="$style.label">
			<N8nText size="small" color="text-dark">
				{{ i18n.baseText('aiGateway.toggle.label') }}
			</N8nText>
			<N8nText v-if="props.isProxied" size="xsmall" color="text-light">
				{{ i18n.baseText('aiGateway.toggle.description') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	align-items: center;
	position: relative;
	min-height: 30px;
	gap: 0;
	line-height: 0;
	margin-top: var(--spacing--3xs);
}

.label {
	flex: 1;
	min-width: 0;
	padding-left: var(--spacing--2xs);
	line-height: normal;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
