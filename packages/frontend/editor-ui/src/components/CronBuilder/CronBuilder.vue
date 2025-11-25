<template>
	<div class="cron-builder">
		<div class="cron-builder__mode-selector">
			<N8nRadioButtons
				v-model="currentMode"
				:options="modeOptions"
				@update:model-value="handleModeChange"
			/>
		</div>

		<div class="cron-builder__content">
			<CronTemplateSelector
				v-if="currentMode === 'template'"
				:selected-template="selectedTemplate"
				@template-selected="handleTemplateSelected"
			/>

			<CronSimpleMode
				v-else-if="currentMode === 'simple'"
				:config="simpleConfig"
				@update:config="handleSimpleConfigUpdate"
			/>

			<CronAdvancedMode
				v-else-if="currentMode === 'advanced'"
				:config="advancedConfig"
				@update:config="handleAdvancedConfigUpdate"
			/>

			<div v-else-if="currentMode === 'custom'" class="cron-builder__custom">
				<N8nInputLabel label="Cron Expression" />
				<N8nInput
					v-model="customExpression"
					:placeholder="'0 9 * * 1-5'"
					@update:model-value="handleCustomExpressionUpdate"
				/>
				<div v-if="validation.error" class="cron-builder__error">
					{{ validation.error }}
				</div>
				<div v-if="validation.warning" class="cron-builder__warning">
					{{ validation.warning }}
				</div>
			</div>
		</div>

		<div class="cron-builder__preview">
			<CronNextRunsPreview :expression="currentExpression" :timezone="timezone" />
		</div>

		<div v-if="humanReadable" class="cron-builder__description">
			<N8nText size="small" color="text-light">{{ humanReadable }}</N8nText>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { N8nRadioButtons, N8nInputLabel, N8nInput, N8nText } from '@n8n/design-system';
import type { CronSimpleConfig, CronAdvancedConfig, CronBuilderMode } from './types';
import {
	generateFromSimpleMode,
	generateFromAdvancedMode,
	validateCronExpression,
} from './utils/cronExpressionGenerator';
import {
	parseToSimpleMode,
	parseToAdvancedMode,
	detectBestMode,
	getHumanReadableDescription,
} from './utils/cronParser';
import { getTemplateById } from './utils/cronTemplates';
import CronTemplateSelector from './CronTemplateSelector.vue';
import CronSimpleMode from './CronSimpleMode.vue';
import CronAdvancedMode from './CronAdvancedMode.vue';
import CronNextRunsPreview from './CronNextRunsPreview.vue';

interface Props {
	modelValue?: string;
	timezone?: string;
}

interface Emits {
	(e: 'update:modelValue', value: string): void;
	(e: 'change', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: '0 9 * * 1-5',
	timezone: undefined,
});

const emit = defineEmits<Emits>();

const modeOptions = [
	{ label: 'Templates', value: 'template' },
	{ label: 'Simple', value: 'simple' },
	{ label: 'Advanced', value: 'advanced' },
	{ label: 'Custom', value: 'custom' },
];

const currentMode = ref<CronBuilderMode | 'template' | 'custom'>('template');
const selectedTemplate = ref<string | undefined>(undefined);
const customExpression = ref<string>(props.modelValue);
const simpleConfig = ref<CronSimpleConfig>({ frequency: 'daily', hour: 9, minute: 0 });
const advancedConfig = ref<CronAdvancedConfig>({
	minutes: [],
	hours: [],
	daysOfMonth: [],
	months: [],
	daysOfWeek: [],
});

const validation = computed(() => validateCronExpression(currentExpression.value));

const currentExpression = computed(() => {
	if (currentMode.value === 'template' && selectedTemplate.value) {
		const template = getTemplateById(selectedTemplate.value);
		return template?.expression || props.modelValue;
	} else if (currentMode.value === 'simple') {
		return generateFromSimpleMode(simpleConfig.value);
	} else if (currentMode.value === 'advanced') {
		return generateFromAdvancedMode(advancedConfig.value);
	} else {
		return customExpression.value;
	}
});

const humanReadable = computed(() => {
	if (!validation.value.isValid) return '';
	return getHumanReadableDescription(currentExpression.value);
});

function handleModeChange(mode: string) {
	currentMode.value = mode as CronBuilderMode | 'template' | 'custom';

	if (mode === 'simple') {
		const parsed = parseToSimpleMode(currentExpression.value);
		if (parsed) {
			simpleConfig.value = parsed;
		}
	} else if (mode === 'advanced') {
		advancedConfig.value = parseToAdvancedMode(currentExpression.value);
	} else if (mode === 'custom') {
		customExpression.value = currentExpression.value;
	}
}

function handleTemplateSelected(templateId: string) {
	selectedTemplate.value = templateId;
	const template = getTemplateById(templateId);
	if (template) {
		emitUpdate(template.expression);
	}
}

function handleSimpleConfigUpdate(config: CronSimpleConfig) {
	simpleConfig.value = config;
	const expression = generateFromSimpleMode(config);
	emitUpdate(expression);
}

function handleAdvancedConfigUpdate(config: CronAdvancedConfig) {
	advancedConfig.value = config;
	const expression = generateFromAdvancedMode(config);
	emitUpdate(expression);
}

function handleCustomExpressionUpdate(expression: string) {
	customExpression.value = expression;
	emitUpdate(expression);
}

function emitUpdate(expression: string) {
	emit('update:modelValue', expression);
	emit('change', expression);
}

watch(
	() => props.modelValue,
	(newValue) => {
		if (newValue && newValue !== currentExpression.value) {
			const mode = detectBestMode(newValue);
			if (mode === 'simple') {
				const parsed = parseToSimpleMode(newValue);
				if (parsed) {
					currentMode.value = 'simple';
					simpleConfig.value = parsed;
				}
			} else {
				currentMode.value = 'advanced';
				advancedConfig.value = parseToAdvancedMode(newValue);
			}
		}
	},
	{ immediate: true },
);
</script>

<style lang="scss" scoped>
.cron-builder {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--s);
	padding: var(--spacing--s);
	background: var(--color--background-xlight);
	border: 1px solid var(--color--foreground-base);
	border-radius: var(--radius);

	&__mode-selector {
		display: flex;
		justify-content: center;
		padding-bottom: var(--spacing--xs);
		border-bottom: 1px solid var(--color--foreground-base);
	}

	&__content {
		min-height: 200px;
	}

	&__custom {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--2xs);
	}

	&__error {
		padding: var(--spacing--2xs) var(--spacing--xs);
		background: var(--color--danger-tint-2);
		color: var(--color--danger);
		border-radius: var(--radius);
		font-size: var(--font-size--2xs);
	}

	&__warning {
		padding: var(--spacing--2xs) var(--spacing--xs);
		background: var(--color--warning-tint-2);
		color: var(--color--warning);
		border-radius: var(--radius);
		font-size: var(--font-size--2xs);
	}

	&__preview {
		padding-top: var(--spacing--xs);
		border-top: 1px solid var(--color--foreground-base);
	}

	&__description {
		text-align: center;
		font-style: italic;
	}
}
</style>
