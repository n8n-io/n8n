<template>
	<n8n-tabs
		:options="[
		{
			label: $locale.baseText('nodeSettings.parameters'),
			value: 'params'
		},
		{
			label: $locale.baseText('nodeSettings.docs'),
			value: 'docs',
			href: documentationUrl,
		},
		{
			icon: 'cog',
			value: 'settings',
			align: 'right',
		}]"
		:value="value"
		@input="onTabSelect"
	/>
</template>

<script lang="ts">
import { externalHooks } from '@/components/mixins/externalHooks';
import { INodeTypeDescription } from 'n8n-workflow';

import mixins from 'vue-typed-mixins';

export default mixins(
	externalHooks,
).extend({
	name: 'NodeTabs',
	props: {
		value: {
			type: String,
		},
		nodeType: {
		},
	},
	computed: {
		documentationUrl (): string {
			const nodeType = this.nodeType as INodeTypeDescription | null;
			if (!nodeType) {
				return '';
			}

			if (nodeType.documentationUrl && nodeType.documentationUrl.startsWith('http')) {
				return nodeType.documentationUrl;
			}

			if (nodeType.documentationUrl || (nodeType.name && nodeType.name.startsWith('n8n-nodes-base'))) {
				return 'https://docs.n8n.io/nodes/' + (nodeType.documentationUrl || nodeType.name) + '?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=' + nodeType.name;
			}

			return '';
		},
	},
	methods: {
		onTabSelect(tab: string) {
			if (tab === 'docs' && this.nodeType) {
				this.$externalHooks().run('dataDisplay.onDocumentationUrlClick', { nodeType: this.nodeType as INodeTypeDescription, documentationUrl: this.documentationUrl });
			}

			if(tab === 'settings' && this.nodeType) {
				this.$telemetry.track('User viewed node settings', { node_type: (this.nodeType as INodeTypeDescription).name, workflow_id: this.$store.getters.workflowId });
			}

			if (tab === 'settings' || tab === 'params') {
				this.$emit('input', tab);
			}
		},
	},
});
</script>
