<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nInput, N8nSegmentControl, N8nText } from '@n8n/design-system';
import type { GenerateMockDataMode } from '../generateMockData.utils';

const props = defineProps<{
	mode: GenerateMockDataMode;
	scenarioText: string;
	isGenerating: boolean;
}>();

const emit = defineEmits<{
	'update:mode': [GenerateMockDataMode];
	'update:scenarioText': [string];
	generate: [];
}>();

const i18n = useI18n();

const modes = computed(() => [
	{
		label: i18n.baseText('ndv.generateMockData.mode.success'),
		value: 'success' as const,
		description: i18n.baseText('ndv.generateMockData.mode.success.description'),
	},
	{
		label: i18n.baseText('ndv.generateMockData.mode.failure'),
		value: 'failure' as const,
		description: i18n.baseText('ndv.generateMockData.mode.failure.description'),
	},
	{
		label: i18n.baseText('ndv.generateMockData.mode.describe'),
		value: 'describe' as const,
		description: i18n.baseText('ndv.generateMockData.mode.describe.description'),
	},
]);

const modeOptions = computed(() => modes.value.map(({ label, value }) => ({ label, value })));

const modeDescription = computed(
	() => modes.value.find((mode) => mode.value === props.mode)?.description ?? '',
);

const showScenarioInput = computed(() => props.mode === 'describe');
const scenarioInputRef = ref<InstanceType<typeof N8nInput>>();

watch(
	showScenarioInput,
	async (isVisible) => {
		if (!isVisible) return;

		await nextTick();
		scenarioInputRef.value?.focus();
	},
	{ immediate: true },
);

function onScenarioKeydown(event: KeyboardEvent) {
	if (event.key !== 'Enter' || props.isGenerating) return;

	emit('generate');
}
</script>

<template>
	<div :class="$style.header" data-test-id="generate-mock-data-header">
		<N8nText bold size="medium">
			{{ i18n.baseText('ndv.generateMockData.title') }}
		</N8nText>

		<N8nSegmentControl
			:model-value="props.mode"
			:options="modeOptions"
			data-test-id="generate-mock-data-mode"
			@update:model-value="emit('update:mode', $event as GenerateMockDataMode)"
		/>

		<N8nText size="small" color="text-light" data-test-id="generate-mock-data-mode-description">
			{{ modeDescription }}
		</N8nText>

		<N8nInput
			v-if="showScenarioInput"
			ref="scenarioInputRef"
			:model-value="props.scenarioText"
			type="text"
			size="small"
			:class="$style.scenarioInput"
			data-test-id="generate-mock-data-scenario"
			:placeholder="i18n.baseText('ndv.generateMockData.scenario.placeholder')"
			@update:model-value="emit('update:scenarioText', String($event))"
			@keydown="onScenarioKeydown"
		/>

		<N8nButton
			:class="$style.generateButton"
			variant="solid"
			size="small"
			:loading="props.isGenerating"
			:disabled="props.isGenerating"
			data-test-id="generate-mock-data-button"
			:label="i18n.baseText('ndv.generateMockData.generate')"
			@click="emit('generate')"
		/>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding-bottom: var(--spacing--xs);
	margin-bottom: var(--spacing--2xs);
	border-bottom: var(--border);
}

.scenarioInput {
	width: 100%;
}

.generateButton {
	align-self: flex-start;
}
</style>
