<template>
	<n8n-tabs
		:options="options"
		:value="value"
		@input="onTabSelect"
		@tooltipClick="onTooltipClick"
	/>
</template>

<script lang="ts">
import { externalHooks } from '@/components/mixins/externalHooks';
import { COMMUNITY_NODES_INSTALLATION_DOCS_URL, NPM_PACKAGE_DOCS_BASE_URL } from '@/constants';
import { INodeUi, ITab } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';

import mixins from 'vue-typed-mixins';
import { isCommunityPackageName } from './helpers';

export default mixins(
	externalHooks,
).extend({
	name: 'NodeSettingsTabs',
	props: {
		value: {
			type: String,
		},
		nodeType: {
		},
		sessionId: {
			type: String,
		},
	},
	computed: {
		activeNode(): INodeUi {
			return this.$store.getters.activeNode;
		},
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

			return this.isCommunityNode ? `${NPM_PACKAGE_DOCS_BASE_URL}${nodeType.name.split('.')[0]}` : '';
		},
		isCommunityNode(): boolean {
			const nodeType = this.nodeType as INodeTypeDescription | null;
			if (nodeType) {
				return isCommunityPackageName(nodeType.name);
			}
			return false;
		},
		packageName(): string {
			const nodeType = this.nodeType as INodeTypeDescription;
			return nodeType.name.split('.')[0];
		},
		options (): ITab[] {
			const options: ITab[] = [
				{
					label: this.$locale.baseText('nodeSettings.parameters'),
					value: 'params',
				},
			];
			if (this.documentationUrl) {
				options.push({
					label: this.$locale.baseText('nodeSettings.docs'),
					value: 'docs',
					href: this.documentationUrl,
				});
			}
			if (this.isCommunityNode) {
				options.push({
					icon: 'cube',
					value: 'communityNode',
					align: 'right',
					tooltip: this.$locale.baseText('generic.communityNode.tooltip', {
						interpolate: {
							docUrl: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
							packageName: this.packageName,
						},
					}),
				});
			}
			// If both tabs have align right, both will have excessive left margin
			const pushCogRight = this.isCommunityNode ? false : true;
			options.push(
				{
					icon: 'cog',
					value: 'settings',
					align: pushCogRight ? 'right': undefined,
				},
			);

			return options;
		},
	},
	methods: {
		onTabSelect(tab: string) {
			if (tab === 'docs' && this.nodeType) {
				this.$externalHooks().run('dataDisplay.onDocumentationUrlClick', { nodeType: this.nodeType as INodeTypeDescription, documentationUrl: this.documentationUrl });
				this.$telemetry.track('User clicked ndv link', {
					node_type: this.activeNode.type,
					workflow_id: this.$store.getters.workflowId,
					session_id: this.sessionId,
					pane: 'main',
					type: 'docs',
				});
			}

			if(tab === 'settings' && this.nodeType) {
				this.$telemetry.track('User viewed node settings', { node_type: (this.nodeType as INodeTypeDescription).name, workflow_id: this.$store.getters.workflowId });
			}

			if (tab === 'settings' || tab === 'params') {
				this.$emit('input', tab);
			}
		},
		onTooltipClick(tab: string, event: MouseEvent) {
			if (tab === 'communityNode' && (event.target as Element).localName === 'a') {
				this.$telemetry.track('user clicked cnr docs link', { source: 'node details view' });
			}
		},
	},
});
</script>

<style lang="scss">

#communityNode > div {
	cursor: auto;

	&:hover {
		color: unset;
	}
}

</style>
