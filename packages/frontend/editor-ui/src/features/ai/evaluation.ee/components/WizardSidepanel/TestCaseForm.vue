<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nIcon, N8nInput, N8nText, N8nTooltip } from '@n8n/design-system';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { getExpectedFieldsForMetrics } from '../../evaluation.constants';

const props = defineProps<{
	sliceInputs: {
		fieldNames: readonly string[];
		values: Record<string, string>;
		hasExecution: boolean;
	};
}>();

const wizardStore = useEvaluationsWizardSidepanelStore();
const locale = useI18n();

const { inputs, expectedValues, selectedMetricKeys } = storeToRefs(wizardStore);

const expectedFields = computed(() => getExpectedFieldsForMetrics(selectedMetricKeys.value));
</script>

<template>
	<div :class="$style.formBlock">
		<div
			v-if="props.sliceInputs.fieldNames.length > 0"
			:class="$style.heading"
			data-test-id="evaluations-wizard-sidepanel-input-heading"
		>
			<N8nText size="xsmall" bold color="text-dark">
				{{ locale.baseText('evaluations.wizardSidepanel.step2.input') }}
			</N8nText>
		</div>

		<div
			v-for="name in props.sliceInputs.fieldNames"
			:key="`input-${name}`"
			:class="$style.field"
			:data-test-id="`evaluations-wizard-sidepanel-input-${name}`"
		>
			<N8nText size="xsmall" color="text-base">
				{{ name }}
			</N8nText>
			<N8nInput
				:model-value="inputs[name] ?? ''"
				type="textarea"
				:rows="3"
				size="small"
				:placeholder="locale.baseText('evaluations.wizardSidepanel.step2.input.placeholder')"
				@update:model-value="wizardStore.setInputValue(name, $event)"
			/>
		</div>

		<div
			v-for="field in expectedFields"
			:key="`expected-${field.name}`"
			:class="$style.field"
			:data-test-id="`evaluations-wizard-sidepanel-expected-${field.name}`"
		>
			<div :class="$style.fieldLabel">
				<N8nText size="xsmall" color="text-base">
					{{ locale.baseText(field.labelKey as BaseTextKey) }}
				</N8nText>
				<N8nTooltip
					placement="top"
					:content="locale.baseText('evaluations.wizardSidepanel.step2.expected.tooltip')"
				>
					<N8nIcon icon="info" size="xsmall" :class="$style.fieldLabelInfo" />
				</N8nTooltip>
			</div>
			<N8nInput
				:model-value="expectedValues[field.name] ?? ''"
				type="textarea"
				:rows="3"
				size="small"
				:placeholder="locale.baseText('evaluations.wizardSidepanel.step2.expectedFieldPlaceholder')"
				@update:model-value="wizardStore.setExpectedValue(field.name, $event)"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.formBlock {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	overflow: hidden;
}

.heading {
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}

	:global(.el-textarea__inner) {
		border: none;
		padding: 0;
		background-color: transparent;
		box-shadow: none;
		resize: none;
	}
}

.fieldLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.fieldLabelInfo {
	color: var(--color--text--tint-1);
}
</style>
