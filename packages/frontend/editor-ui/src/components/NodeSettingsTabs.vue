<script setup lang="ts">
import type { ITab } from '@/Interface';
import { COMMUNITY_NODES_INSTALLATION_DOCS_URL } from '@/constants';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { INodeTypeDescription, PublicInstalledPackage } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { computed, onMounted, ref } from 'vue';

import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { isCommunityPackageName } from '@/utils/nodeTypesUtils';
import { N8nTabs } from '@n8n/design-system';
import { useNodeDocsUrl } from '@/composables/useNodeDocsUrl';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { useUsersStore } from '@/stores/users.store';

export type Tab = 'settings' | 'params' | 'communityNode' | 'docs';
type Props = {
	modelValue?: Tab;
	nodeType?: INodeTypeDescription | null;
	pushRef?: string;
	hideDocs?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	modelValue: 'params',
	nodeType: undefined,
	pushRef: '',
});
const emit = defineEmits<{
	'update:model-value': [tab: Tab];
}>();

const externalHooks = useExternalHooks();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const i18n = useI18n();
const telemetry = useTelemetry();
const { docsUrl } = useNodeDocsUrl({ nodeType: () => props.nodeType });
const communityNodesStore = useCommunityNodesStore();

const activeNode = computed(() => ndvStore.activeNode);

const installedPackage = ref<PublicInstalledPackage | undefined>(undefined);

const isCommunityNode = computed(() => {
	const nodeType = props.nodeType;
	if (nodeType) {
		return isCommunityPackageName(nodeType.name);
	}
	return false;
});

const packageName = computed(() => props.nodeType?.name.split('.')[0] ?? '');

const documentationUrl = computed(() => {
	if (props.hideDocs) {
		return '';
	}

	return docsUrl.value;
});

const options = computed(() => {
	const options: Array<ITab<Tab>> = [
		{
			label: i18n.baseText('nodeSettings.parameters'),
			value: 'params',
		},
		{
			label: i18n.baseText('nodeSettings.settings'),
			value: 'settings',
			notification: installedPackage.value?.updateAvailable ? true : undefined,
		},
	];

	if (isCommunityNode.value) {
		options.push({
			icon: 'box',
			value: 'communityNode',
			align: 'right',
			tooltip: i18n.baseText('generic.communityNode.tooltip', {
				interpolate: {
					docUrl: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
					packageName: packageName.value,
				},
			}),
		});
	}

	if (documentationUrl.value) {
		options.push({
			label: i18n.baseText('nodeSettings.docs'),
			value: 'docs',
			href: documentationUrl.value,
			align: 'right',
		});
	}

	return options;
});

function onTabSelect(tab: string | number) {
	if (tab === 'docs' && props.nodeType) {
		void externalHooks.run('dataDisplay.onDocumentationUrlClick', {
			nodeType: props.nodeType,
			documentationUrl: documentationUrl.value,
		});

		telemetry.track('User clicked ndv link', {
			node_type: activeNode.value?.type,
			workflow_id: workflowsStore.workflowId,
			push_ref: props.pushRef,
			pane: NodeConnectionTypes.Main,
			type: 'docs',
		});
	}

	if (tab === 'settings' && props.nodeType) {
		telemetry.track('User viewed node settings', {
			node_type: props.nodeType.name,
			workflow_id: workflowsStore.workflowId,
		});
	}

	if (tab === 'settings' || tab === 'params') {
		emit('update:model-value', tab);
	}
}

function onTooltipClick(tab: string | number, event: MouseEvent) {
	if (tab === 'communityNode' && (event.target as Element).localName === 'a') {
		telemetry.track('user clicked cnr docs link', { source: 'node details view' });
	}
}

onMounted(async () => {
	if (isCommunityNode.value && useUsersStore().isInstanceOwner) {
		installedPackage.value = await communityNodesStore.getInstalledPackage(packageName.value);
	}
});
</script>

<template>
	<N8nTabs
		:options="options"
		:model-value="modelValue"
		@update:model-value="onTabSelect"
		@tooltip-click="onTooltipClick"
	/>
</template>

<style lang="scss">
#communityNode > div {
	cursor: auto;
	padding-right: 0;
	padding-left: 0;

	&:hover {
		color: unset;
	}
}
</style>
