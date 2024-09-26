<script setup lang="ts">
import { useCredentialsStore } from '@/stores/credentials.store';
import { useRootStore } from '@/stores/root.store';
import { useUIStore } from '@/stores/ui.store';
import { getThemedValue } from '@/utils/nodeTypesUtils';
import { N8nNodeIcon } from 'n8n-design-system';
import type { ICredentialType } from 'n8n-workflow';
import { computed } from 'vue';

const props = defineProps<{
	credentialTypeName: string | null;
}>();

const credentialsStore = useCredentialsStore();
const rootStore = useRootStore();
const uiStore = useUIStore();

const credentialWithIcon = computed(() => getCredentialWithIcon(props.credentialTypeName));

const iconSource = computed(() => {
	const themeIconUrl = getThemedValue(credentialWithIcon.value?.iconUrl, uiStore.appliedTheme);

	if (!themeIconUrl) {
		return undefined;
	}

	return rootStore.baseUrl + themeIconUrl;
});

const iconType = computed(() => (iconSource.value ? 'file' : 'icon'));
const iconName = computed(() => {
	const icon = getThemedValue(credentialWithIcon.value?.icon, uiStore.appliedTheme);
	if (!icon || !icon?.startsWith('fa:')) return undefined;
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
	<N8nNodeIcon :type="iconType" :size="26" :src="iconSource" :name="iconName" :color="iconColor" />
</template>
