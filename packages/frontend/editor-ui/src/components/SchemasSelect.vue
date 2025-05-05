<script setup lang="ts">
import type { INodeProperties } from 'n8n-workflow';
import { onMounted, ref } from 'vue';
import { N8nOption, N8nSelect } from '@n8n/design-system';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { useSchemaStore } from '@/stores/schemas.store';
import type { Schema } from '@n8n/api-types';

type Props = {
	activeCredentialType: string;
	parameter: INodeProperties;
	node?: INodeUi;
	inputSize?: 'small' | 'large' | 'mini' | 'medium' | 'xlarge';
	displayValue: string;
	isReadOnly: boolean;
	displayTitle: string;
};

const schemaStore = useSchemaStore();

const props = defineProps<Props>();

onMounted(async () => {
	schemas.value = await schemaStore.getAndCacheApiKeys();
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	setFocus: [];
	onBlur: [];
	schemaSelected: [update: INodeUpdatePropertiesInformation];
}>();

const schemas = ref<Schema[]>([]);

const i18n = useI18n();

const innerSelectRef = ref<HTMLSelectElement>();

function focus() {
	if (innerSelectRef.value) {
		innerSelectRef.value.focus();
	}
}

defineExpose({ focus });
</script>

<template>
	<div>
		<div :class="$style['parameter-value-container']">
			<N8nSelect
				ref="innerSelectRef"
				:size="inputSize"
				filterable
				:model-value="displayValue"
				:placeholder="i18n.baseText('parameterInput.select')"
				:title="displayTitle"
				:disabled="isReadOnly"
				data-test-id="schema-select"
				@update:model-value="(value: string) => emit('update:modelValue', value)"
				@keydown.stop
				@focus="emit('setFocus')"
				@blur="emit('onBlur')"
			>
				<N8nOption
					v-for="schema in schemas"
					:key="schema.id"
					:value="schema.id"
					:label="schema.name"
				>
					<div class="list-option">
						<div class="option-headline">
							{{ schema.name }}
						</div>
					</div>
				</N8nOption>
			</N8nSelect>
			<slot name="issues-and-options" />
		</div>
	</div>
</template>

<style module lang="scss">
.parameter-value-container {
	display: flex;
	align-items: center;
}
</style>
