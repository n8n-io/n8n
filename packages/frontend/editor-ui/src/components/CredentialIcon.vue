<script setup lang="ts">
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/stores/ui.store';
import { getThemedValue } from '@/utils/nodeTypesUtils';
import type { ICredentialType } from 'n8n-workflow';
import { computed } from 'vue';

import { N8nNodeIcon } from '@n8n/design-system';
const props = defineProps<{
	credentialTypeName: string | null;
}>();

const credentialsStore = useCredentialsStore();
const rootStore = useRootStore();
const uiStore = useUIStore();
const nodeTypesStore = useNodeTypesStore();

const credentialWithIcon = computed(() => getCredentialWithIcon(props.credentialTypeName));

const nodeBasedIconUrl = computed(() => {
	const icon = getThemedValue(credentialWithIcon.value?.icon);
	if (!icon?.startsWith('node:')) return null;
	return nodeTypesStore.getNodeType(icon.replace('node:', ''))?.iconUrl;
});

const iconSource = computed(() => {
	const themeIconUrl = getThemedValue(
		nodeBasedIconUrl.value ?? credentialWithIcon.value?.iconUrl,
		uiStore.appliedTheme,
	);

	if (!themeIconUrl) {
		return undefined;
	}

	return rootStore.baseUrl + themeIconUrl;
});

const iconType = computed(() => {
	if (iconSource.value) return 'file';
	else if (iconName.value) return 'icon';
	return 'unknown';
});

const iconName = computed(() => {
	const icon = getThemedValue(credentialWithIcon.value?.icon, uiStore.appliedTheme);
	if (!icon?.startsWith('fa:')) return undefined;
	return icon.replace('fa:', '');
});

const iconColor = computed(() => {
	const { iconColor: color } = credentialWithIcon.value ?? {};
	if (!color) return undefined;
	return `var(--color-node-icon-${color})`;
});

function getCredentialWithIcon(name: string | null): ICredentialType | null {
	if (!name) {
		return null;
	}

	const type = credentialsStore.getCredentialTypeByName(name);

	if (!type) {
		return null;
	}

	if (type.icon ?? type.iconUrl) {
		return type;
	}

	if (type.extends) {
		let parentCred = null;
		type.extends.forEach((credType) => {
			parentCred = getCredentialWithIcon(credType);
			if (parentCred !== null) return;
		});
		return parentCred;
	}

	return null;
}
</script>

<template>
	<N8nNodeIcon
		:class="$style.icon"
		:type="iconType"
		:size="26"
		:src="iconSource"
		:name="iconName"
		:color="iconColor"
	/>
</template>

<style lang="scss" module>
.icon {
	--node-icon-color: var(--color--foreground--shade-1);
}
</style>
