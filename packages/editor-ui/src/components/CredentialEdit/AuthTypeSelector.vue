<script setup lang="ts">
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import type { IUpdateInformation, NodeAuthenticationOption } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import {
	getAuthTypeForNodeCredential,
	getNodeAuthFields,
	getNodeAuthOptions,
	isAuthRelatedParameter,
} from '@/utils';
import type { INodeProperties, INodeTypeDescription, NodeParameterValue } from 'n8n-workflow';
import { computed, onMounted, ref } from 'vue';
import Vue from 'vue';

export interface Props {
	credentialType: Object;
}

const emit = defineEmits<{
	(event: 'authTypeChanged', value: string): void;
}>();

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();

const props = defineProps<Props>();

const selected = ref('');
const authRelatedFieldsValues = ref({} as { [key: string]: NodeParameterValue });

onMounted(() => {
	if (activeNodeType.value?.credentials) {
		const credentialsForType =
			activeNodeType.value.credentials.find((cred) => cred.name === props.credentialType.name) ||
			null;
		const authOptionForCred = getAuthTypeForNodeCredential(
			activeNodeType.value,
			credentialsForType,
		);
		selected.value = authOptionForCred?.value || '';
	}

	// Populate default values of related fields
	authRelatedFields.value.forEach((field) => {
		Vue.set(authRelatedFieldsValues.value, field.name, field.default);
	});
});

const activeNodeType = computed<INodeTypeDescription | null>(() => {
	const activeNode = ndvStore.activeNode;
	if (activeNode) {
		return nodeTypesStore.getNodeType(activeNode.type, activeNode.typeVersion);
	}
	return null;
});

const authOptions = computed<NodeAuthenticationOption[]>(() => {
	return getNodeAuthOptions(activeNodeType.value, ndvStore.activeNode?.typeVersion);
});

const filteredNodeAuthOptions = computed<NodeAuthenticationOption[]>(() => {
	return authOptions.value.filter((option) => shouldShowAuthOption(option));
});

// These are node properties that authentication fields depend on
// (have them in their display options). They all are show here
// instead of in the NDV
const authRelatedFields = computed<INodeProperties[]>(() => {
	const nodeAuthFields = getNodeAuthFields(activeNodeType.value);
	return (
		activeNodeType.value?.properties.filter((prop) =>
			isAuthRelatedParameter(nodeAuthFields, prop),
		) || []
	);
});

function shouldShowAuthOption(option: NodeAuthenticationOption): boolean {
	// Node auth radio button should be shown if any of the fields that it depends on
	// has value specified in it's displayOptions.show
	if (authRelatedFields.value.length === 0) {
		// If there are no related fields, show option
		return true;
	}

	let shouldDisplay = false;
	Object.keys(authRelatedFieldsValues.value).forEach((fieldName) => {
		if (option.displayOptions && option.displayOptions.show) {
			if (
				option.displayOptions.show[fieldName]?.includes(authRelatedFieldsValues.value[fieldName])
			) {
				shouldDisplay = true;
				return;
			}
		}
	});
	return shouldDisplay;
}

function onAuthTypeChange(newType: string): void {
	emit('authTypeChanged', newType);
}

function valueChanged(data: IUpdateInformation): void {
	Vue.set(authRelatedFieldsValues.value, data.name, data.value);
}

defineExpose({
	onAuthTypeChange,
});
</script>

<template>
	<div v-if="filteredNodeAuthOptions.length > 0" data-test-id="node-auth-type-selector">
		<div v-for="parameter in authRelatedFields" :key="parameter.name" class="mb-l">
			<parameter-input-full
				:parameter="parameter"
				:value="authRelatedFieldsValues[parameter.name] || parameter.default"
				:path="parameter.name"
				:displayOptions="false"
				@valueChanged="valueChanged"
			/>
		</div>
		<div>
			<n8n-input-label
				:label="$locale.baseText('credentialEdit.credentialConfig.authTypeSelectorLabel')"
				:tooltipText="$locale.baseText('credentialEdit.credentialConfig.authTypeSelectorTooltip')"
				:required="true"
			/>
		</div>
		<el-radio
			v-for="prop in filteredNodeAuthOptions"
			:key="prop.value"
			v-model="selected"
			:label="prop.value"
			:class="$style.authRadioButton"
			border
			@change="onAuthTypeChange"
			>{{ prop.name }}</el-radio
		>
	</div>
</template>

<style lang="scss" module>
.authRadioButton {
	margin-right: 0 !important;
	& + & {
		margin-left: 8px !important;
	}
}
</style>
