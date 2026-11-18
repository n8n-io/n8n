<script setup lang="ts">
import { N8nSegmentControl } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { RULE_SEVERITIES, type RuleSeverity } from '@n8n/workflow-rules';
import { computed } from 'vue';

import { SEVERITY_TEXT } from '../workflow-rules.constants';

const props = withDefaults(
	defineProps<{
		modelValue: RuleSeverity;
		/** Severities below this one are disabled, because a project may not relax the rule. */
		minimum?: RuleSeverity;
		disabled?: boolean;
	}>(),
	{ minimum: 'off', disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [severity: RuleSeverity] }>();

const i18n = useI18n();

const options = computed(() =>
	RULE_SEVERITIES.map((severity) => ({
		label: i18n.baseText(SEVERITY_TEXT[severity]),
		value: severity,
		disabled: RULE_SEVERITIES.indexOf(severity) < RULE_SEVERITIES.indexOf(props.minimum),
	})),
);

function onChange(value: string | boolean) {
	const severity = RULE_SEVERITIES.find((candidate) => candidate === value);
	if (severity) emit('update:modelValue', severity);
}
</script>

<template>
	<N8nSegmentControl
		:model-value="modelValue"
		:options="options"
		:disabled="disabled"
		size="small"
		data-test-id="workflow-rule-severity"
		@update:model-value="onChange"
	/>
</template>
