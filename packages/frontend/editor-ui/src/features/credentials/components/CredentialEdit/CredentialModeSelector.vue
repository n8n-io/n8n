<script setup lang="ts">
import ParameterInputFull from '@/features/ndv/parameters/components/ParameterInputFull.vue';
import { useI18n } from '@n8n/i18n';
import type { IUpdateInformation, NodeAuthenticationOption } from '@/Interface';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	getAuthTypeForNodeCredential,
	getNodeAuthFields,
	getNodeAuthOptions,
	isAuthRelatedParameter,
} from '@/app/utils/nodeTypesUtils';
import type {
	ICredentialType,
	INodeProperties,
	INodeTypeDescription,
	NodeParameterValue,
} from 'n8n-workflow';
import { computed, onMounted, ref } from 'vue';
import { N8nButton, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import {
	N8nDropdownMenu,
	type DropdownMenuItemProps,
} from '@n8n/design-system/v2/components/DropdownMenu';

interface ModeOption {
	name: string;
	value: string;
	authValue: string;
	isManaged?: boolean;
}

const props = defineProps<{
	credentialType: ICredentialType;
	useCustomOauth?: boolean;
	showManagedOauthOptions?: boolean;
}>();

const emit = defineEmits<{
	authTypeChanged: [value: string];
	'update:useCustomOauth': [value: boolean];
}>();

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const i18n = useI18n();

const selectedAuthType = ref('');
const authRelatedFieldsValues = ref<Record<string, NodeParameterValue>>({});

onMounted(() => {
	if (activeNodeType.value?.credentials) {
		const credentialsForType =
			activeNodeType.value.credentials.find((cred) => cred.name === props.credentialType.name) ||
			null;
		const authOptionForCred = getAuthTypeForNodeCredential(
			activeNodeType.value,
			credentialsForType,
		);
		selectedAuthType.value = authOptionForCred?.value || '';
	}

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

const filteredAuthOptions = computed<NodeAuthenticationOption[]>(() => {
	return authOptions.value.filter((option) => shouldShowAuthOption(option));
});

const authRelatedFields = computed<INodeProperties[]>(() => {
	const nodeAuthFields = getNodeAuthFields(activeNodeType.value);
	return (
		activeNodeType.value?.properties.filter((prop) =>
			isAuthRelatedParameter(nodeAuthFields, prop),
		) || []
	);
});

const oauthAuthValue = computed(() => {
	if (!props.showManagedOauthOptions) return null;
	const oauthOption = filteredAuthOptions.value.find((opt) => opt.value === selectedAuthType.value);
	if (!oauthOption) return filteredAuthOptions.value[0]?.value ?? null;
	return oauthOption.value;
});

const combinedOptions = computed<ModeOption[]>(() => {
	const result: ModeOption[] = [];

	for (const opt of filteredAuthOptions.value) {
		if (props.showManagedOauthOptions && oauthAuthValue.value === opt.value) {
			result.push({
				name: i18n.baseText('credentialEdit.credentialConfig.oauthModeManaged'),
				value: `${opt.value}:managed`,
				authValue: opt.value,
				isManaged: true,
			});
			result.push({
				name: i18n.baseText('credentialEdit.credentialConfig.oauthModeCustom'),
				value: `${opt.value}:custom`,
				authValue: opt.value,
				isManaged: false,
			});
		} else {
			result.push({
				name: opt.name,
				value: opt.value,
				authValue: opt.value,
			});
		}
	}

	return result;
});

const selectedValue = computed(() => {
	if (props.showManagedOauthOptions && oauthAuthValue.value === selectedAuthType.value) {
		const suffix = props.useCustomOauth ? 'custom' : 'managed';
		return `${selectedAuthType.value}:${suffix}`;
	}
	return selectedAuthType.value;
});

const currentOption = computed(() => {
	return combinedOptions.value.find((opt) => opt.value === selectedValue.value);
});

const otherOption = computed(() => {
	if (combinedOptions.value.length !== 2) return null;
	return combinedOptions.value.find((opt) => opt.value !== selectedValue.value) ?? null;
});

const showSelector = computed(() => combinedOptions.value.length >= 2);

const headingText = computed(() => {
	if (currentOption.value?.isManaged === true) {
		return i18n.baseText('credentialEdit.credentialConfig.oauthModeManagedTitle');
	}
	if (currentOption.value?.isManaged === false) {
		return i18n.baseText('credentialEdit.credentialConfig.oauthModeCustomTitle');
	}
	return currentOption.value?.name ?? '';
});

const menuItems = computed<Array<DropdownMenuItemProps<string>>>(() => {
	return combinedOptions.value.map((opt) => ({
		id: opt.value,
		label: opt.name,
		checked: opt.value === selectedValue.value,
	}));
});

function shouldShowAuthOption(option: NodeAuthenticationOption): boolean {
	if (authRelatedFields.value.length === 0) {
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

function onOptionChange(value: string): void {
	const option = combinedOptions.value.find((opt) => opt.value === value);
	if (!option) return;

	if (option.authValue !== selectedAuthType.value) {
		selectedAuthType.value = option.authValue;
		emit('authTypeChanged', option.authValue);
	}

	if (option.isManaged !== undefined) {
		emit('update:useCustomOauth', !option.isManaged);
	}
}

function switchToOther(): void {
	if (otherOption.value) {
		onOptionChange(otherOption.value.value);
	}
}

function onAuthRelatedFieldChange(data: IUpdateInformation): void {
	authRelatedFieldsValues.value = {
		...authRelatedFieldsValues.value,
		[data.name]: data.value as NodeParameterValue,
	};
}
</script>

<template>
	<div v-if="showSelector" data-test-id="credential-mode-selector">
		<div v-for="parameter in authRelatedFields" :key="parameter.name" class="mb-l">
			<ParameterInputFull
				:parameter="parameter"
				:value="authRelatedFieldsValues[parameter.name] || parameter.default"
				:path="parameter.name"
				:display-options="false"
				@update="onAuthRelatedFieldChange"
			/>
		</div>

		<div :class="$style.headerRow">
			<N8nText tag="span" :bold="true" size="large">
				{{ headingText }}
			</N8nText>

			<N8nLink
				v-if="combinedOptions.length === 2"
				:class="$style.switchLink"
				data-test-id="credential-mode-switch-link"
				@click="switchToOther"
			>
				{{
					i18n.baseText('credentialEdit.credentialConfig.switchTo', {
						interpolate: { name: otherOption?.name ?? '' },
					})
				}}
			</N8nLink>

			<N8nDropdownMenu
				v-else
				:items="menuItems"
				placement="bottom-end"
				:extra-popper-class="$style.dropdownContent"
				data-test-id="credential-mode-dropdown"
				@select="onOptionChange"
			>
				<template #trigger>
					<N8nButton type="secondary" text data-test-id="credential-mode-dropdown-trigger">
						{{ currentOption?.name }}
						<N8nIcon icon="chevron-down" size="small" />
					</N8nButton>
				</template>
			</N8nDropdownMenu>
		</div>
	</div>
</template>

<style lang="scss" module>
.headerRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.switchLink {
	font-size: var(--font-size--sm);
}

.dropdownContent {
	z-index: var(--modals--z);
}
</style>
