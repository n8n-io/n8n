<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { ICredentialType, INode, INodeTypeDescription } from 'n8n-workflow';
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { N8nDropdownMenu, type DropdownMenuItemProps } from '@n8n/design-system';
import {
	getAuthTypeForNodeCredential,
	getNodeAuthOptions,
	getNodeCredentialForSelectedAuthType,
} from '@/app/utils/nodeTypesUtils';
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
	contextNode?: INode | null;
}>();

const emit = defineEmits<{
	'update:authType': [value: CredentialModeOption];
}>();

const nodeTypesStore = useNodeTypesStore();
const ndvStore = injectNDVStore();
const i18n = useI18n();
const { canOAuthCredentialQuickConnect, isOAuthCredentialType, hasManualCredentialInputFields } =
	useCredentialOAuth();

const activeNode = computed<INode | null>(() => props.contextNode ?? ndvStore.value.activeNode);
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

// The auth-type value that managed pair options carry when the node has no auth options;
// isSelected must compare against the same fallback. Assumes an unlinked managed-OAuth
// credential has no real node shape (accepted trade-off).
const managedFallbackType = computed(() => selectedAuthType.value?.value ?? 'oAuth2');

const isOAuthCredential = computed(() => isOAuthCredentialType(props.credentialType.name));
const hasManagedOAuth = computed(() => isOAuthCredential.value && props.showManagedOauthOptions);
const hasManualCredentialFields = computed(() =>
	hasManualCredentialInputFields(props.credentialType),
);

function getManagedOAuthOptions(authType: string, authTypeLabel?: string): Option[] {
	return [
		{
			name: authTypeLabel
				? i18n.baseText('credentialEdit.credentialConfig.oauthModeManagedWithAuthType', {
						interpolate: { authType: authTypeLabel },
					})
				: i18n.baseText('credentialEdit.credentialConfig.oauthModeManaged'),
			value: { type: authType, customOauth: false },
		},
		{
			name: authTypeLabel
				? i18n.baseText('credentialEdit.credentialConfig.oauthModeCustomWithAuthType', {
						interpolate: { authType: authTypeLabel },
					})
				: i18n.baseText('credentialEdit.credentialConfig.oauthModeCustom'),
			value: { type: authType, customOauth: true },
		},
	];
}

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
		return getManagedOAuthOptions(managedFallbackType.value);
	}

	const withExpansion = authOptions.map((option) => {
		const credential = activeNodeType.value
			? getNodeCredentialForSelectedAuthType(activeNodeType.value, option.value)
			: null;
		const splitsIntoManagedPair = !!(
			credential &&
			props.showManagedOauthOptions &&
			isOAuthCredentialType(credential.name) &&
			canOAuthCredentialQuickConnect(credential.name)
		);
		return { option, splitsIntoManagedPair };
	});
	// Disambiguate managed labels only when several auth options expand into managed pairs
	const managedPairCount = withExpansion.filter((o) => o.splitsIntoManagedPair).length;
	const recommendedSuffix = i18n.baseText(
		'credentialEdit.credentialConfig.recommendedAuthTypeSuffix',
	);

	return withExpansion.flatMap<Option>(({ option, splitsIntoManagedPair }) => {
		if (splitsIntoManagedPair) {
			// strip the "(recommended)" suffix getNodeAuthOptions appends via the same i18n key
			const label = option.name.endsWith(recommendedSuffix)
				? option.name.slice(0, -recommendedSuffix.length).trimEnd()
				: option.name;
			return getManagedOAuthOptions(option.value, managedPairCount > 1 ? label : undefined);
		}
		return { name: option.name, value: { type: option.value } };
	});
});

const options = computed<Option[]>(() => {
	const manual = manualOptions.value;
	const qc = quickConnectOption.value;

	if (!qc) return manual;

	// When QC is available but no manual auth options exist (single-credential nodes),
	// add a generic "Enter manually" option only when manual input fields exist
	const manualOrFallback = manual.length
		? manual
		: hasManualCredentialFields.value
			? [
					{
						name: i18n.baseText('credentialEdit.credentialConfig.setupManually'),
						value: { type: '' },
					},
				]
			: [];

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
		// Match the auth type too (a node can expose several managed pairs).
		return (
			isOAuthCredential.value &&
			option.type === managedFallbackType.value &&
			!!props.useCustomOauth === option.customOauth
		);
	}

	return option.type === selectedAuthType.value?.value;
}

const showSelector = computed(() => options.value.length >= 2);
const selectedOption = computed(() => {
	return options.value.find((option) => isSelected(option.value)) ?? null;
});

const headingText = computed(() => {
	if (props.isQuickConnectMode) {
		return i18n.baseText('credentialEdit.credentialConfig.quickConnectTitle');
	}
	return i18n.baseText('credentialEdit.credentialConfig.setupCredential');
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
</script>

<template>
	<div v-if="showSelector" data-test-id="credential-mode-selector">
		<div :class="$style.headerRow">
			<N8nText tag="span" :bold="true" size="large">
				{{ headingText }}
			</N8nText>

			<N8nDropdownMenu
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

.dropdownContent {
	width: auto;
	z-index: var(--modals--z);
}
</style>
