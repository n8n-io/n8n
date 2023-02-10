<template>
	<div>
		<img v-if="filePath" :class="$style.credIcon" :src="filePath" />
		<NodeIcon v-else-if="relevantNode" :nodeType="relevantNode" :size="28" />
		<span :class="$style.fallback" v-else></span>
	</div>
</template>

<script lang="ts">
import { useCredentialsStore } from '@/stores/credentials';
import { useRootStore } from '@/stores/n8nRootStore';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { mapStores } from 'pinia';
import Vue from 'vue';

export default Vue.extend({
	props: {
		credentialTypeName: {
			type: String,
		},
	},
	computed: {
		...mapStores(useCredentialsStore, useNodeTypesStore, useRootStore),
		credentialWithIcon(): ICredentialType | null {
			return this.credentialTypeName ? this.getCredentialWithIcon(this.credentialTypeName) : null;
		},

		filePath(): string | null {
			const iconUrl = this.credentialWithIcon?.iconUrl;
			if (!iconUrl) {
				return null;
			}
			return this.rootStore.getBaseUrl + iconUrl;
		},

		relevantNode(): INodeTypeDescription | null {
			if (this.credentialWithIcon?.icon?.startsWith('node:')) {
				const nodeType = this.credentialWithIcon.icon.replace('node:', '');
				return this.nodeTypesStore.getNodeType(nodeType);
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
