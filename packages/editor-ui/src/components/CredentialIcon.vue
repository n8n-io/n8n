<template>
	<div>
		<img v-if="filePath" :class="$style.credIcon" :src="filePath" />
		<NodeIcon v-else-if="relevantNode" :nodeType="relevantNode" :size="28" />
		<span :class="$style.fallback" v-else></span>
	</div>
</template>

<script lang="ts">
import { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import Vue from 'vue';

export default Vue.extend({
	props: {
		credentialTypeName: {
			type: String,
		},
	},
	computed: {
		credentialWithIcon(): ICredentialType | null {
			return this.credentialTypeName ? this.getCredentialWithIcon(this.credentialTypeName) : null;
		},

		filePath(): string | null {
			if (!this.credentialWithIcon || !this.credentialWithIcon.icon || !this.credentialWithIcon.icon.startsWith('file:')) {
				return null;
			}

			const restUrl = this.$store.getters.getRestUrl;

			return `${restUrl}/credential-icon/${this.credentialWithIcon.name}`;
		},
		relevantNode(): INodeTypeDescription | null	 {
			if (this.credentialWithIcon && this.credentialWithIcon.icon && this.credentialWithIcon.icon.startsWith('node:')) {
				const nodeType = this.credentialWithIcon.icon.replace('node:', '');

				return this.$store.getters['nodeTypes/getNodeType'](nodeType);
			}

			const nodesWithAccess = this.$store.getters['credentials/getNodesWithAccess'](this.credentialTypeName);

			if (nodesWithAccess.length) {
				return nodesWithAccess[0];
			}

			return null;
		},
	},
	methods: {
		getCredentialWithIcon(name: string): ICredentialType | null {
			const type = this.$store.getters['credentials/getCredentialTypeByName'](name);

			if (!type) {
				return null;
			}

			if (type.icon) {
				return type;
			}

			if (type.extends) {
				return type.extends.reduce((accu: string | null, type: string) => {
					return accu || this.getCredentialWithIcon(type);
				}, null);
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
