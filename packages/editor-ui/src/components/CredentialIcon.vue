<template>
	<div>
		<img v-if="filePath" :class="$style.credIcon" :src="filePath" />
		<NodeIcon v-else-if="relevantNode" :node-type="relevantNode" :size="28" />
		<span v-else :class="$style.fallback"></span>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';

import { useCredentialsStore } from '@/stores/credentials.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import NodeIcon from '@/components/NodeIcon.vue';
import { getThemedValue } from '@/utils/nodeTypesUtils';
import { useUIStore } from '@/stores/ui.store';

export default defineComponent({
	components: {
		NodeIcon,
	},
	props: {
		credentialTypeName: {
			type: String,
		},
	},
	computed: {
		...mapStores(useCredentialsStore, useNodeTypesStore, useRootStore, useUIStore),
		credentialWithIcon(): ICredentialType | null {
			return this.credentialTypeName ? this.getCredentialWithIcon(this.credentialTypeName) : null;
		},

		filePath(): string | null {
			const themeIconUrl = getThemedValue(
				this.credentialWithIcon?.iconUrl,
				this.uiStore.appliedTheme,
			);

			if (!themeIconUrl) {
				return null;
			}

			return this.rootStore.getBaseUrl + themeIconUrl;
		},

		relevantNode(): INodeTypeDescription | null {
			const icon = this.credentialWithIcon?.icon;
			if (typeof icon === 'string' && icon.startsWith('node:')) {
				const nodeType = icon.replace('node:', '');
				return this.nodeTypesStore.getNodeType(nodeType);
			}
			if (!this.credentialTypeName) {
				return null;
			}

			const nodesWithAccess = this.credentialsStore.getNodesWithAccess(this.credentialTypeName);
			if (nodesWithAccess.length) {
				return nodesWithAccess[0];
			}

			return null;
		},
	},
	methods: {
		getCredentialWithIcon(name: string | null): ICredentialType | null {
			if (!name) {
				return null;
			}

			const type = this.credentialsStore.getCredentialTypeByName(name);

			if (!type) {
				return null;
			}

			if (type.icon || type.iconUrl) {
				return type;
			}

			if (type.extends) {
				let parentCred = null;
				type.extends.forEach((name) => {
					parentCred = this.getCredentialWithIcon(name);
					if (parentCred !== null) return;
				});
				return parentCred;
			}

			return null;
		},
	},
});
</script>

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
