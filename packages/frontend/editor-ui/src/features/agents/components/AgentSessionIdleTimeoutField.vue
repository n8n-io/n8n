<script setup lang="ts">
import { computed } from 'vue';
import { N8nInputNumber, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const DEFAULT_MINUTES = 60 * 24;

const props = withDefaults(
	defineProps<{ modelValue: number | null | undefined; disabled?: boolean }>(),
	{ disabled: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>();

const i18n = useI18n();

const enabled = computed(() => props.modelValue !== null && props.modelValue !== undefined);
const minutes = computed(() => props.modelValue ?? DEFAULT_MINUTES);

function onToggle(value: boolean) {
	emit('update:modelValue', value ? minutes.value : null);
}

function onMinutesInput(value: number) {
	if (Number.isFinite(value) && value > 0) emit('update:modelValue', Math.round(value));
}
</script>

<template>
	<div :class="$style.row">
		<div :class="$style.label">
			<N8nText size="small" bold>
				{{ i18n.baseText('agents.builder.addTrigger.session.idleTimeout.label') }}
			</N8nText>
			<N8nText size="small" :class="$style.hint">
				{{ i18n.baseText('agents.builder.addTrigger.session.idleTimeout.hint') }}
			</N8nText>
		</div>
		<div :class="$style.controls">
			<N8nInputNumber
				v-if="enabled"
				:model-value="minutes"
				:min="1"
				:precision="0"
				:controls="false"
				:disabled="disabled"
				data-testid="session-idle-timeout-minutes"
				@update:model-value="onMinutesInput"
			/>
			<N8nSwitch2
				:model-value="enabled"
				:disabled="disabled"
				data-testid="session-idle-timeout-toggle"
				@update:model-value="onToggle"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.label {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.hint {
	color: var(--text-color--subtler);
}

.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}
</style>
