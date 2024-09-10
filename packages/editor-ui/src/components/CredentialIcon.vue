<script setup lang="ts">
import { computed } from 'vue';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useRootStore } from '@/stores/root.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { ICredentialType } from 'n8n-workflow';
import NodeIcon from '@/components/NodeIcon.vue';
import { getThemedValue } from '@/utils/nodeTypesUtils';
import { useUIStore } from '@/stores/ui.store';

const props = defineProps<{
	credentialTypeName: string | null;
}>();

const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const rootStore = useRootStore();
const uiStore = useUIStore();

const credentialWithIcon = computed(() => getCredentialWithIcon(props.credentialTypeName));

const filePath = computed(() => {
	const themeIconUrl = getThemedValue(credentialWithIcon.value?.iconUrl, uiStore.appliedTheme);

	if (!themeIconUrl) {
		return null;
	}

	return rootStore.baseUrl + themeIconUrl;
});

const relevantNode = computed(() => {
	const icon = credentialWithIcon.value?.icon;
	if (typeof icon === 'string' && icon.startsWith('node:')) {
		const nodeType = icon.replace('node:', '');
		return nodeTypesStore.getNodeType(nodeType);
	}
	if (!props.credentialTypeName) {
		return null;
	}

	const nodesWithAccess = credentialsStore.getNodesWithAccess(props.credentialTypeName);
	if (nodesWithAccess.length) {
		return nodesWithAccess[0];
	}

	return null;
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
		type.extends.forEach((iconName) => {
			parentCred = getCredentialWithIcon(iconName);
			if (parentCred !== null) return;
		});
		return parentCred;
	}

	return null;
}
</script>

<template>
	<div>
		<img v-if="filePath" :class="$style.credIcon" :src="filePath" />
		<NodeIcon v-else-if="relevantNode" :node-type="relevantNode" :size="28" />
		<span v-else :class="$style.fallback"></span>
	</div>
</template>

<style lang="scss" module>
.credIcon {
	height: 26px;
}

.fallback {
	height: 28px;
	width: 28px;
	display: flex;
	border-radius: 50%;
	background-color: var(--color-foreground-base);
}
</style>
