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

interface Option {
	name: string;
	value: { oauthMode: 'managed' | 'custom' } | { type: string };
}

const props = defineProps<{
	credentialType: ICredentialType;
	useCustomOauth?: boolean;
	showManagedOauthOptions?: boolean;
}>();

const emit = defineEmits<{
	'update:authType': [value: { type: string; useCustomOauth?: boolean }];
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
		value: { oauthMode: 'managed' },
	},
	{
		name: i18n.baseText('credentialEdit.credentialConfig.oauthModeCustom'),
		value: { oauthMode: 'custom' },
	},
]);

const options = computed<Option[]>(() => {
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
	if (options.value.length > 2) {
		return i18n.baseText('credentialEdit.credentialConfig.setupCredential');
	}

	if (props.showManagedOauthOptions) {
		if (props.useCustomOauth) {
			return i18n.baseText('credentialEdit.credentialConfig.oauthModeCustomTitle');
		}
		return i18n.baseText('credentialEdit.credentialConfig.oauthModeManagedTitle');
	}

	return i18n.baseText('credentialEdit.credentialConfig.genericTitle', {
		interpolate: { credential: selectedAuthType.value?.name ?? '' },
	});
});

const menuItems = computed<Array<DropdownMenuItemProps<Option['value']>>>(() => {
	return options.value.map((opt) => ({
		id: opt.value,
		label: opt.name,
		checked: isSelected(opt.value),
	}));
});

function onOptionChange(value: Option['value']): void {
	if (isSelected(value)) return;

	if ('oauthMode' in value) {
		emit('update:authType', {
			type: 'oAuth2',
			useCustomOauth: value.oauthMode === 'custom',
		});
		return;
	}

	emit('update:authType', { type: value.type });
}

function switchToOther(): void {
	if (otherOption.value) {
		onOptionChange(otherOption.value.value);
	}
}

function isSelected(option: Option['value']): boolean {
	if ('oauthMode' in option) {
		const selectedOAuthMode = props.useCustomOauth ? 'custom' : 'managed';
		return isOAuthCredential.value && selectedOAuthMode === option.oauthMode;
	}

	if ('type' in option) {
		return option.type === selectedAuthType.value?.value;
	}

	return false;
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
