<script setup lang="ts">
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import { useI18n } from '@n8n/i18n';
import type { IUpdateInformation, NodeAuthenticationOption } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import {
	getAuthTypeForNodeCredential,
	getNodeAuthFields,
	getNodeAuthOptions,
	isAuthRelatedParameter,
} from '@/utils/nodeTypesUtils';
import type {
	ICredentialType,
	INodeProperties,
	INodeTypeDescription,
	NodeParameterValue,
} from 'n8n-workflow';
import { computed, onMounted, ref } from 'vue';

export interface Props {
	credentialType: ICredentialType;
}

const emit = defineEmits<{
	authTypeChanged: [value: string];
}>();

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();

const i18n = useI18n();

const props = defineProps<Props>();

const selected = ref('');
const authRelatedFieldsValues = ref<{ [key: string]: NodeParameterValue }>({});

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
		authRelatedFieldsValues.value = {
			...authRelatedFieldsValues.value,
			[field.name]: field.default as NodeParameterValue,
		};
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
		if (option.displayOptions?.show) {
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
	authRelatedFieldsValues.value = {
		...authRelatedFieldsValues.value,
		[data.name]: data.value as NodeParameterValue,
	};
}

defineExpose({
	onAuthTypeChange,
});
</script>

<template>
	<div v-if="filteredNodeAuthOptions.length > 0" data-test-id="node-auth-type-selector">
		<div v-for="parameter in authRelatedFields" :key="parameter.name" class="mb-l">
			<ParameterInputFull
				:parameter="parameter"
				:value="authRelatedFieldsValues[parameter.name] || parameter.default"
				:path="parameter.name"
				:display-options="false"
				@update="valueChanged"
			/>
		</div>
		<div>
			<n8n-input-label
				:label="i18n.baseText('credentialEdit.credentialConfig.authTypeSelectorLabel')"
				:tooltip-text="i18n.baseText('credentialEdit.credentialConfig.authTypeSelectorTooltip')"
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
			@update:model-value="onAuthTypeChange"
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
