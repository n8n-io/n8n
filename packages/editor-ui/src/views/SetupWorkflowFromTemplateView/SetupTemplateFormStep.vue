<template>
	<li>
		<n8n-heading tag="h2" size="large">
			<div v-if="nodeType" class="heading">
				<span class="headingOrder">{{ order }}.</span>
				<span class="headingIcon"><NodeIcon :node-type="nodeType" /></span>
				{{ appName }}
			</div>
		</n8n-heading>

		<p class="description">
			The credential you select will be used in the
			<span v-html="nodeNames" /> of the workflow template.
		</p>

		<div class="credentials">
			<CredentialPicker
				class="credential-picker"
				:app-name="appName"
				:credentialType="credentialType"
				:selectedCredentialId="selectedCredentialId"
				@credential-selected="onCredentialSelected"
				@credential-deselected="onCredentialDeselected"
			/>

			<IconSuccess
				:class="{
					'credential-ok': true,
					invisible: !selectedCredentialId,
				}"
			/>
		</div>
	</li>
</template>

<script lang="ts">
import N8nHeading from 'n8n-design-system/components/N8nHeading';
import { defineComponent } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';

import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { getAppNameFromNodeName } from '@/utils/nodeTypesUtils';
import { mapStores } from 'pinia';
import { useSetupTemplateStore } from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';
import { formatList } from '@/utils/formatters/listFormatter';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { IWorkflowTemplateNode } from '@/Interface';
import CredentialPicker from '@/components/CredentialPicker/CredentialPicker.vue';
import IconSuccess from './IconSuccess.vue';

export default defineComponent({
	name: 'SetupTemplateFormStep',
	components: {
		N8nHeading,
		NodeIcon,
		CredentialPicker,
		IconSuccess,
	},
	props: {
		order: {
			type: Number,
			required: true,
		},
		credentialName: {
			type: String,
			required: true,
		},
	},
	computed: {
		...mapStores(useSetupTemplateStore, useNodeTypesStore, useCredentialsStore),
		credentials() {
			return this.setupTemplateStore.credentialsByName.get(this.credentialName)!;
		},
		node() {
			return this.credentials.usedBy[0];
		},
		nodeType() {
			return this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
		},
		credentialType() {
			return this.credentials.credentialType;
		},
		appName() {
			return this.nodeType ? getAppNameFromNodeName(this.nodeType.displayName) : this.node.type;
		},
		nodeNames() {
			const formatNodeName = (node: IWorkflowTemplateNode) => `<b>${node.name}</b>`;

			const nodesStr = this.credentials.usedBy.length > 1 ? 'nodes' : 'node';
			const formattedList = formatList(this.credentials.usedBy, formatNodeName);

			return `${formattedList} ${nodesStr}`;
		},
		selectedCredentialId() {
			return this.setupTemplateStore.selectedCredentialIdByName[this.credentialName];
		},
		availableCredentials() {
			return this.credentialsStore.getCredentialsByType(this.credentialType);
		},
	},
	methods: {
		onCredentialSelected(credentialId: string) {
			this.setupTemplateStore.setSelectedCredentialId(this.credentialName, credentialId);
		},
		onCredentialDeselected() {
			this.setupTemplateStore.unsetSelectedCredential(this.credentialName);
		},
	},
});
</script>

<style lang="scss" scoped>
.heading {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing-xs);
}

.headingOrder {
	font-weight: var(--font-weight-bold);
	margin-right: var(--spacing-xs);
}

.headingIcon {
	margin-right: var(--spacing-2xs);
}

.description {
	margin-bottom: var(--spacing-l);
}

.credentials {
	max-width: 400px;
	display: flex;
	align-items: center;
}

.credential-picker {
	flex: 1;
}

.credential-ok {
	margin-left: var(--spacing-2xs);
}

li {
	list-style: none;
	margin-bottom: var(--spacing-l);
}

li:not(:last-of-type) {
	border-bottom: 2px solid var(--prim-gray-420);
	padding-bottom: var(--spacing-xl);
	margin-bottom: var(--spacing-xl);
}

.invisible {
	visibility: hidden;
}
</style>
