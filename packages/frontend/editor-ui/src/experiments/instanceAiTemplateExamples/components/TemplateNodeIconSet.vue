<!-- Experiment cleanup: remove with InstanceAiTemplateExamplesExperiment -->
<script lang="ts" setup>
import { computed } from 'vue';
import { N8nTooltip } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import type { IInstanceAiExampleWorkflow } from '@n8n/rest-api-client/api/templates';
import type { VersionNode } from '@n8n/rest-api-client/api/versions';

type ExampleNode = IInstanceAiExampleWorkflow['nodes'][number];

const MAX_VISIBLE = 3;

const DARK_MODE_INVERT_NODES = new Set([
	'n8n-nodes-base.notion',
	'n8n-nodes-base.twitter',
	'n8n-nodes-base.perplexity',
	'n8n-nodes-base.openAi',
	'n8n-nodes-base.github',
	'n8n-nodes-base.mailchimp',
	'@n8n/n8n-nodes-langchain.openAi',
]);

const NATIVE_NODES = new Set([
	'n8n-nodes-base.code',
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.html',
	'n8n-nodes-base.crypto',
	'n8n-nodes-base.editImage',
	'n8n-nodes-base.ftp',
	'n8n-nodes-base.evaluation',
	'n8n-nodes-base.emailSend',
	'n8n-nodes-base.sms77',
	'n8n-nodes-base.apiTemplateIo',
]);

function isNativeNode(name: string): boolean {
	if (NATIVE_NODES.has(name)) return true;
	if (name.startsWith('@n8n/n8n-nodes-langchain.')) return true;
	return false;
}

const props = withDefaults(
	defineProps<{
		nodes: ExampleNode[];
		showAll?: boolean;
	}>(),
	{ showAll: false },
);

const thirdPartyNodes = computed(() =>
	props.showAll ? props.nodes : props.nodes.filter((node) => !isNativeNode(node.name)),
);
const visibleNodes = computed(() => thirdPartyNodes.value.slice(0, MAX_VISIBLE));
const hiddenNodes = computed(() => thirdPartyNodes.value.slice(MAX_VISIBLE));
const hiddenCount = computed(() => hiddenNodes.value.length);
const hiddenTooltip = computed(() => hiddenNodes.value.map((node) => node.displayName).join(', '));
</script>

<template>
	<div :class="$style.container">
		<div
			v-for="node in visibleNodes"
			:key="node.name"
			:class="[$style.iconWrapper, DARK_MODE_INVERT_NODES.has(node.name) && $style.invertOnDark]"
		>
			<NodeIcon :node-type="node as unknown as VersionNode" :size="20" :show-tooltip="true" />
		</div>
		<N8nTooltip v-if="hiddenCount > 0" :content="hiddenTooltip" placement="right">
			<div :class="$style.overflow">+{{ hiddenCount }}</div>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: var(--radius--s);
}

.invertOnDark {
	:global(body[data-theme='dark']) & {
		filter: invert(1);
	}
}

@media (prefers-color-scheme: dark) {
	.invertOnDark {
		:global(body:not([data-theme])) & {
			filter: invert(1);
		}
	}
}

.overflow {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 32px;
	padding: 0 var(--spacing--3xs);
	border-radius: var(--radius--s);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
}
</style>
