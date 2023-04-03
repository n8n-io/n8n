<script setup lang="ts">
import { ResourceMapperTypeOptions } from 'n8n-workflow';
import { getCurrentInstance, ref } from 'vue';

export interface Props {
	initialValue: string;
	inputSize: string;
	typeOptions: ResourceMapperTypeOptions | undefined;
	serviceName: string;
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
				interpolate: { fieldWord: props.typeOptions?.fieldWords?.singular || 'field' },
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
					fieldWord: props.typeOptions?.fieldWords?.plural || 'fields',
					serviceName: props.serviceName || 'the service',
				},
			},
		),
	},
];

const emit = defineEmits<{
	(event: 'modeChanged', value: string): void;
}>();

const selected = ref(props.initialValue);

function onModeChanged(value: string): void {
	selected.value = value;
	emit('modeChanged', value);
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
			color="text-dark"
			size="small"
		>
			<template>
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
			</template>
		</n8n-input-label>
	</div>
</template>
