<template>
	<div :class="$style.tabs">
		<div
			:class="{ [$style.activeTab]: value === 'params' }"
			@click="() => handleTabClick('params')"
		>
			{{ $locale.baseText('nodeSettings.parameters') }}
		</div>

		<a
			v-if="documentationUrl"
			target="_blank"
			:href="documentationUrl"
			:class="$style.docsTab"
			@click="onDocumentationUrlClick"
		>
			<div>
				{{ $locale.baseText('nodeSettings.docs') }}
				<font-awesome-icon :class="$style.external" icon="external-link-alt" size="sm" />
			</div>
		</a>

		<div
			:class="{ [$style.settingsTab]: true, [$style.activeTab]: value === 'settings' }"
			@click="() => handleTabClick('settings')"
		>
			<font-awesome-icon icon="cog" />
		</div>
	</div>
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
		onDocumentationUrlClick () {
			if (this.nodeType) {
				this.$externalHooks().run('dataDisplay.onDocumentationUrlClick', { nodeType: this.nodeType as INodeTypeDescription, documentationUrl: this.documentationUrl });
			}
		},
		handleTabClick(tab: string) {
			this.$emit('input', tab);
			if(tab === 'settings' && this.nodeType) {
				this.$telemetry.track('User viewed node settings', { node_type: (this.nodeType as INodeTypeDescription).name, workflow_id: this.$store.getters.workflowId });
			}
		},
	},
});
</script>


<style lang="scss" module>
.tabs {
	color: var(--color-text-base);
	font-weight: var(--font-weight-bold);
	display: flex;
	width: 100%;

	> * {
		padding: 0 var(--spacing-s) var(--spacing-2xs) var(--spacing-s);
		padding-bottom: var(--spacing-2xs);
		font-size: var(--font-size-s);
		cursor: pointer;
		&:hover {
			color: var(--color-primary);
		}
	}
}

.activeTab {
	color: var(--color-primary);
	border-bottom: var(--color-primary) 2px solid;
}

.settingsTab {
	margin-left: auto;
}

.docsTab {
	cursor: pointer;
	color: var(--color-text-base);

	&:hover {
		color: var(--color-primary);

		.external {
			display: inline-block;
		}
	}
}

.external {
	display: none;
}

</style>
