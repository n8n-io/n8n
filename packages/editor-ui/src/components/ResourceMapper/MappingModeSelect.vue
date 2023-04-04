<script setup lang="ts">
import { ResourceMapperFields, ResourceMapperTypeOptions } from 'n8n-workflow';
import { computed, getCurrentInstance, ref } from 'vue';

export interface Props {
	initialValue: string;
	fieldsToMap: ResourceMapperFields['fields'];
	inputSize: string;
	labelSize: string;
	typeOptions: ResourceMapperTypeOptions | undefined;
	serviceName: string;
	loading: boolean;
	loadingError: boolean;
}

const instance = getCurrentInstance();

const props = defineProps<Props>();

const mappingModeOptions = [
	{
		name: instance?.proxy.$locale.baseText('resourceMapper.mappingMode.defineBelow.name'),
		value: 'defineBelow',
		description: instance?.proxy.$locale.baseText(
			'resourceMapper.mappingMode.defineBelow.description',
			{
				interpolate: {
					fieldWord:
						props.typeOptions?.fieldWords?.singular ||
						instance?.proxy.$locale.baseText('generic.field'),
				},
			},
		),
	},
	{
		name: instance?.proxy.$locale.baseText('resourceMapper.mappingMode.autoMapInputData.name'),
		value: 'autoMapInputData',
		description: instance?.proxy.$locale.baseText(
			'resourceMapper.mappingMode.autoMapInputData.description',
			{
				interpolate: {
					fieldWord:
						props.typeOptions?.fieldWords?.plural ||
						instance?.proxy.$locale.baseText('generic.fields'),
					serviceName: props.serviceName || instance?.proxy.$locale.baseText('generic.service'),
				},
			},
		),
	},
];

const emit = defineEmits<{
	(event: 'modeChanged', value: string): void;
	(event: 'retryFetch'): void;
}>();

const selected = ref(props.initialValue);

const errorMessage = computed<string>(() => {
	if (selected.value === 'defineBelow' && instance) {
		if (props.loadingError) {
			return instance?.proxy.$locale.baseText('resourceMapper.fetchingFields.errorMessage', {
				interpolate: {
					fieldWord:
						props.typeOptions?.fieldWords?.plural ||
						instance?.proxy.$locale.baseText('generic.fields'),
				},
			});
		}
		if (props.fieldsToMap.length === 0) {
			return (
				props.typeOptions?.noFieldsError ||
				instance?.proxy.$locale.baseText('resourceMapper.fetchingFields.noFieldsFound', {
					interpolate: {
						fieldWord:
							props.typeOptions?.fieldWords?.plural ||
							instance?.proxy.$locale.baseText('generic.fields'),
						serviceName: props.serviceName || instance?.proxy.$locale.baseText('generic.service'),
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
	<div>
		<n8n-input-label
			:label="$locale.baseText('resourceMapper.mappingMode.label')"
			:bold="false"
			:required="true"
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
							$locale.baseText('resourceMapper.fetchingFields.message', {
								interpolate: {
									fieldWord:
										props.typeOptions?.fieldWords?.plural ||
										instance?.proxy.$locale.baseText('generic.fields') ||
										'fields',
								},
							})
						}}
					</n8n-text>
					<n8n-text v-else-if="errorMessage !== ''" size="small" color="danger">
						<n8n-icon icon="exclamation-triangle" size="xsmall" />
						{{ errorMessage }}
						<n8n-link size="small" theme="danger" :underline="true" @click="onRetryClick">
							{{ $locale.baseText('generic.retry') }}
						</n8n-link>
					</n8n-text>
				</div>
			</template>
		</n8n-input-label>
	</div>
</template>
