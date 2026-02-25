<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import {
	N8nDropdownMenu,
	type DropdownMenuItemProps,
} from '@n8n/design-system/v2/components/DropdownMenu';
import { getNodeAuthOptions, getAuthTypeForNodeCredential } from '@/app/utils/nodeTypesUtils';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';

export interface CredentialModeOption {
	type: string;
	customOauth?: boolean;
	quickConnectEnabled?: boolean;
}

interface Option {
	name: string;
	value: CredentialModeOption;
}

const props = defineProps<{
	credentialType: ICredentialType;
	useCustomOauth?: boolean;
	showManagedOauthOptions?: boolean;
	quickConnectAvailable?: boolean;
	isQuickConnectMode?: boolean;
}>();

const emit = defineEmits<{
	'update:authType': [value: CredentialModeOption];
}>();

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const i18n = useI18n();
const { isOAuthCredentialType } = useCredentialOAuth();

const activeNode = computed(() => ndvStore.activeNode);
const activeNodeType = computed<INodeTypeDescription | null>(() => {
	if (!activeNode.value) return null;
	return nodeTypesStore.getNodeType(activeNode.value.type, activeNode.value.typeVersion);
});

const selectedAuthType = computed(() => {
	const selectedCredentialDescription = activeNodeType.value?.credentials?.find(
		(cred) => cred.name === props.credentialType.name,
	);

	return getAuthTypeForNodeCredential(activeNodeType.value, selectedCredentialDescription);
});

const isOAuthCredential = computed(() => isOAuthCredentialType(props.credentialType.name));
const hasManagedOAuth = computed(() => isOAuthCredential.value && props.showManagedOauthOptions);

const managedOAuthOptions = computed<Option[]>(() => [
	{
		name: i18n.baseText('credentialEdit.credentialConfig.oauthModeManaged'),
		value: { type: 'oAuth2', customOauth: false },
	},
	{
		name: i18n.baseText('credentialEdit.credentialConfig.oauthModeCustom'),
		value: { type: 'oAuth2', customOauth: true },
	},
]);

const quickConnectOption = computed<Option | null>(() => {
	if (!props.quickConnectAvailable) return null;
	return {
		name: i18n.baseText('credentialEdit.credentialConfig.quickConnect'),
		value: {
			type: selectedAuthType.value?.value ?? '',
			quickConnectEnabled: true,
		},
	};
});

const manualOptions = computed<Option[]>(() => {
	// If this credential type is not linked to any auth option of the node, don't show the selector
	if (activeNodeType.value && !selectedAuthType.value && !hasManagedOAuth.value) {
		return [];
	}

	const authOptions = getNodeAuthOptions(activeNodeType.value, activeNode.value?.typeVersion);

	if (authOptions.length === 0 && hasManagedOAuth.value) {
		return managedOAuthOptions.value;
	}

	return authOptions.flatMap<Option>((option) => {
		if (props.showManagedOauthOptions && option.value === 'oAuth2') {
			return managedOAuthOptions.value;
		}

		return {
			name: option.name,
			value: { type: option.value },
		};
	});
});

const options = computed<Option[]>(() => {
	const manual = manualOptions.value;
	const qc = quickConnectOption.value;

	if (!qc) return manual;

	// When QC is available but no manual auth options exist (single-credential nodes),
	// add a generic "Enter manually" option so the user can switch between QC and manual
	const manualOrFallback =
		manual.length > 0
			? manual
			: [
					{
						name: i18n.baseText('credentialEdit.credentialConfig.setupManually'),
						value: { type: '' },
					},
				];

	return [qc, ...manualOrFallback];
});

function isSelected(option: CredentialModeOption): boolean {
	if (option.quickConnectEnabled) {
		return !!props.isQuickConnectMode;
	}

	// When in quick connect mode, no manual option is selected
	if (props.isQuickConnectMode) {
		return false;
	}

	// Fallback manual option for single-cred nodes
	if (option.type === '' && option.customOauth === undefined) {
		return true;
	}

	if (option.customOauth !== undefined) {
		return isOAuthCredential.value && !!props.useCustomOauth === option.customOauth;
	}

	return option.type === selectedAuthType.value?.value;
}

const showSelector = computed(() => options.value.length >= 2);
const showDropdown = computed(() => options.value.length > 2);
const selectedOption = computed(() => {
	const selected = options.value.find((option) => isSelected(option.value)) ?? null;
	return selected;
});

const otherOption = computed(() => {
	if (showDropdown.value) return null;
	return options.value.find((option) => !isSelected(option.value)) ?? null;
});

const headingText = computed(() => {
	if (props.isQuickConnectMode) {
		return i18n.baseText('credentialEdit.credentialConfig.quickConnectTitle');
	}

	if (options.value.length > 2) {
		return i18n.baseText('credentialEdit.credentialConfig.setupCredential');
	}

	if (props.showManagedOauthOptions) {
		if (props.useCustomOauth) {
			return i18n.baseText('credentialEdit.credentialConfig.oauthModeCustomTitle');
		}
		return i18n.baseText('credentialEdit.credentialConfig.oauthModeManagedTitle');
	}

	const authName = selectedAuthType.value?.name;
	if (!authName) {
		return i18n.baseText('credentialEdit.credentialConfig.setupCredential');
	}

	return i18n.baseText('credentialEdit.credentialConfig.genericTitle', {
		interpolate: { credential: authName },
	});
});

const menuItems = computed<Array<DropdownMenuItemProps<CredentialModeOption>>>(() => {
	return options.value.map((opt) => ({
		id: opt.value,
		label: opt.name,
		checked: isSelected(opt.value),
	}));
});

function onOptionChange(value: CredentialModeOption): void {
	if (isSelected(value)) return;
	emit('update:authType', value);
}

function switchToOther(): void {
	if (otherOption.value) {
		onOptionChange(otherOption.value.value);
	}
}
</script>

<template>
	<div v-if="showSelector" data-test-id="credential-mode-selector">
		<div :class="$style.headerRow">
			<N8nText tag="span" :bold="true" size="large">
				{{ headingText }}
			</N8nText>

			<N8nLink
				v-if="otherOption"
				theme="secondary"
				underline
				size="small"
				:class="$style.switchLink"
				data-test-id="credential-mode-switch-link"
				@click="switchToOther"
			>
				{{ otherOption?.name }}
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
					<N8nButton variant="subtle" text data-test-id="credential-mode-dropdown-trigger">
						{{ selectedOption?.name }}
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
	--link--color--secondary: var(--color--text);

	&:hover,
	&:focus,
	&:active {
		:global(span) {
			color: var(--color--text--shade-1);
		}
	}
}

.dropdownContent {
	width: auto;
	z-index: var(--modals--z);
}
</style>
