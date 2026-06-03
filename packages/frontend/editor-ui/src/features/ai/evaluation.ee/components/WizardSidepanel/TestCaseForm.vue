<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nInput, N8nText, N8nTooltip } from '@n8n/design-system';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { getExpectedFieldsForMetrics } from '../../evaluation.constants';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';

const props = defineProps<{
	sliceInputs: {
		fieldNames: readonly string[];
		values: Record<string, string>;
		hasExecution: boolean;
	};
}>();

const wizardStore = useEvaluationsWizardSidepanelStore();
const locale = useI18n();
const router = useRouter();

const { inputs, expectedValues, selectedMetricKeys } = storeToRefs(wizardStore);

const { runEntireWorkflow } = useRunWorkflow({ router });

const expectedFields = computed(() => getExpectedFieldsForMetrics(selectedMetricKeys.value));
</script>

<template>
	<div :class="$style.formBlock">
		<div
			v-if="!props.sliceInputs.hasExecution"
			:class="$style.runFirstCallout"
			data-test-id="evaluations-wizard-sidepanel-no-execution"
		>
			<N8nIcon icon="info" size="medium" :class="$style.runFirstIcon" />
			<div :class="$style.runFirstContent">
				<N8nText size="small" color="text-base">
					{{ locale.baseText('evaluations.wizardSidepanel.step.addTestCases.runFirst') }}
				</N8nText>
				<N8nButton
					size="small"
					type="button"
					data-test-id="evaluations-wizard-sidepanel-run-workflow"
					@click="runEntireWorkflow('main')"
				>
					{{ locale.baseText('evaluations.wizardSidepanel.step.addTestCases.runButton') }}
				</N8nButton>
			</div>
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

.runFirstCallout {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	background-color: var(--background--subtle);
	border-bottom: var(--border);
}

.runFirstIcon {
	flex-shrink: 0;
	margin-top: var(--spacing--4xs);
	color: var(--color--secondary);
}

.runFirstContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
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
