<script setup lang="ts">
import type { INodePropertyTypeOptions, ResourceMapperFields } from 'n8n-workflow';
import { computed, ref, watch } from 'vue';
import { i18n as locale } from '@n8n/i18n';
import { useNodeSpecificationValues } from '@/composables/useNodeSpecificationValues';
import { N8nInputLabel, N8nSelect, N8nText } from '@n8n/design-system';

interface Props {
	initialValue: string;
	fieldsToMap: ResourceMapperFields['fields'];
	inputSize: 'small' | 'medium';
	labelSize: 'small' | 'medium';
	typeOptions: INodePropertyTypeOptions | undefined;
	serviceName: string;
	loading: boolean;
	loadingError: boolean;
	teleported?: boolean;
	isReadOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), { isReadOnly: false });
const { resourceMapperTypeOptions, pluralFieldWord, singularFieldWord } =
	useNodeSpecificationValues(props.typeOptions);

// Mapping mode options: Labels here use field words defined in parameter type options
const mappingModeOptions = [
	{
		name: locale.baseText('resourceMapper.mappingMode.defineBelow.name'),
		value: 'defineBelow',
		description: locale.baseText('resourceMapper.mappingMode.defineBelow.description', {
			interpolate: {
				fieldWord: singularFieldWord.value,
			},
		}),
	},
	{
		name: locale.baseText('resourceMapper.mappingMode.autoMapInputData.name'),
		value: 'autoMapInputData',
		description: locale.baseText('resourceMapper.mappingMode.autoMapInputData.description', {
			interpolate: {
				fieldWord: pluralFieldWord.value,
				serviceName: props.serviceName,
			},
		}),
	},
];

const emit = defineEmits<{
	modeChanged: [value: string];
	retryFetch: [];
}>();

const selected = ref(props.initialValue);

watch(
	() => props.initialValue,
	() => {
		selected.value = props.initialValue;
	},
);

const errorMessage = computed<string>(() => {
	if (selected.value === 'defineBelow') {
		// Loading error message
		if (props.loadingError) {
			return locale.baseText('resourceMapper.fetchingFields.errorMessage', {
				interpolate: {
					fieldWord: pluralFieldWord.value,
				},
			});
		}
		// No data error message
		if (props.fieldsToMap.length === 0) {
			return (
				// Use custom error message if defined
				resourceMapperTypeOptions.value?.noFieldsError ||
				locale.baseText('resourceMapper.fetchingFields.noFieldsFound', {
					interpolate: {
						fieldWord: pluralFieldWord.value,
						serviceName: props.serviceName,
					},
				})
			);
		}
		return '';
	}
	return '';
});

function onModeChanged(value: string): void {
	selected.value = value;
	emit('modeChanged', value);
}

function onRetryClick(): void {
	emit('retryFetch');
}

defineExpose({
	selected,
	onModeChanged,
	mappingModeOptions,
});
</script>

<template>
	<div data-test-id="mapping-mode-select">
		<N8nInputLabel
			:label="locale.baseText('resourceMapper.mappingMode.label')"
			:bold="false"
			:required="false"
			:size="labelSize"
			color="text-dark"
		>
			<div class="mt-5xs">
				<N8nSelect
					:model-value="selected"
					:teleported="teleported"
					:size="props.inputSize"
					:disabled="isReadOnly"
					@update:model-value="onModeChanged"
				>
					<N8nOption
						v-for="option in mappingModeOptions"
						:key="option.value"
						:value="option.value"
						:label="option.name"
						description="sadasd"
					>
						<div class="list-option">
							<div class="option-headline">
								{{ option.name }}
							</div>
							<div v-n8n-html="option.description" class="option-description" />
						</div>
					</N8nOption>
				</N8nSelect>
			</div>
			<div class="mt-5xs">
				<N8nText v-if="loading" size="small">
					<N8nIcon icon="refresh-cw" size="xsmall" :spin="true" />
					{{
						locale.baseText('resourceMapper.fetchingFields.message', {
							interpolate: {
								fieldWord: pluralFieldWord,
							},
						})
					}}
				</N8nText>
				<N8nText v-else-if="errorMessage !== ''" size="small" color="danger">
					<N8nIcon icon="triangle-alert" size="xsmall" />
					{{ errorMessage }}
					<N8nLink size="small" theme="danger" :underline="true" @click="onRetryClick">
						{{ locale.baseText('generic.retry') }}
					</N8nLink>
				</N8nText>
			</div>
		</N8nInputLabel>
	</div>
</template>
