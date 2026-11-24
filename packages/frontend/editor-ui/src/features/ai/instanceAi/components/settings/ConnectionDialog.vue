<script setup lang="ts">
import type { InstanceAiConnectionKind } from '../../constants';
import InstanceAiOnboardingWizard from '../../onboarding/InstanceAiOnboardingWizard.vue';
import type { InstanceAiOnboardingStep } from '../../onboarding/useInstanceAiOnboarding';

const open = defineModel<boolean>('open', { required: true });

const props = withDefaults(defineProps<{ kind: InstanceAiConnectionKind; setup?: boolean }>(), {
	setup: false,
});

const emit = defineEmits<{ saved: [] }>();

const setupSequence: InstanceAiOnboardingStep[] = ['model', 'sandbox', 'search', 'done'];

function handleAdvance(): void {
	emit('saved');
	if (!props.setup) open.value = false;
}
</script>

<template>
	<InstanceAiOnboardingWizard
		:open="open"
		:step="kind"
		:edit-mode="true"
		:allow-unchanged="setup"
		:sequence="setupSequence"
		model-value=""
		sandbox-value=""
		search-value=""
		:compose-fast-path="false"
		surface="settings"
		@update:open="open = $event"
		@advance="handleAdvance"
	/>
</template>
