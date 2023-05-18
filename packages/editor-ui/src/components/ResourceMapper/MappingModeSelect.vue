<script setup lang="ts">
import type { INodePropertyTypeOptions, ResourceMapperFields } from 'n8n-workflow';
import { computed, ref, watch } from 'vue';
import { i18n as locale } from '@/plugins/i18n';
import { useNodeSpecificationValues } from '@/composables';

interface Props {
	initialValue: string;
	fieldsToMap: ResourceMapperFields['fields'];
	inputSize: string;
	labelSize: string;
	typeOptions: INodePropertyTypeOptions | undefined;
	serviceName: string;
	loading: boolean;
	loadingError: boolean;
}

const props = defineProps<Props>();
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
	(event: 'modeChanged', value: string): void;
	(event: 'retryFetch'): void;
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
		<n8n-input-label
			:label="locale.baseText('resourceMapper.mappingMode.label')"
			:bold="false"
			:required="false"
			:size="labelSize"
			color="text-dark"
		>
			<template>
				<div class="mt-5xs">
					<n8n-select :value="selected" :size="props.inputSize" @change="onModeChanged">
						<n8n-option
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
								<div class="option-description" v-html="option.description" />
							</div>
						</n8n-option>
					</n8n-select>
				</div>
				<div class="mt-5xs">
					<n8n-text v-if="loading" size="small">
						<n8n-icon icon="sync-alt" size="xsmall" :spin="true" />
						{{
							locale.baseText('resourceMapper.fetchingFields.message', {
								interpolate: {
									fieldWord: pluralFieldWord,
								},
							})
						}}
					</n8n-text>
					<n8n-text v-else-if="errorMessage !== ''" size="small" color="danger">
						<n8n-icon icon="exclamation-triangle" size="xsmall" />
						{{ errorMessage }}
						<n8n-link size="small" theme="danger" :underline="true" @click="onRetryClick">
							{{ locale.baseText('generic.retry') }}
						</n8n-link>
					</n8n-text>
				</div>
			</template>
		</n8n-input-label>
	</div>
</template>
