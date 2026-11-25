<script setup lang="ts">
import type { ITab } from '@/Interface';
import { COMMUNITY_NODES_INSTALLATION_DOCS_URL } from '@/features/settings/communityNodes/communityNodes.constants';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { computed } from 'vue';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useInstalledCommunityPackage } from '@/features/settings/communityNodes/composables/useInstalledCommunityPackage';
import { useNodeDocsUrl } from '@/app/composables/useNodeDocsUrl';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import type { NodeSettingsTab } from '@/app/types/nodeSettings';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nLink, N8nTabs, N8nTooltip } from '@n8n/design-system';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

type Props = {
	modelValue?: NodeSettingsTab;
	nodeType?: INodeTypeDescription | null;
	pushRef?: string;
	hideDocs?: boolean;
	includeAction?: boolean;
	includeCredential?: boolean;
	hasCredentialIssue?: boolean;
	compact?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	modelValue: 'params',
	nodeType: undefined,
	pushRef: '',
	hasCredentialIssue: false,
});
const emit = defineEmits<{
	'update:model-value': [tab: NodeSettingsTab];
}>();

const externalHooks = useExternalHooks();
const ndvStore = injectNDVStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const i18n = useI18n();
const telemetry = useTelemetry();
const { docsUrl } = useNodeDocsUrl({ nodeType: () => props.nodeType });

const activeNode = computed(() => ndvStore.value.activeNode);

const nodeTypeName = computed(() => props.nodeType?.name);
const { isCommunityNode, canUpdatePackage, hasUpdateAvailable } =
	useInstalledCommunityPackage(nodeTypeName);

const packageName = computed(() => props.nodeType?.name.split('.')[0] ?? '');

const documentationUrl = computed(() => {
	if (props.hideDocs) {
		return '';
	}

	return docsUrl.value;
});

const options = computed(() => {
	const ret: Array<ITab<NodeSettingsTab>> = [];

	if (props.includeAction) {
		ret.push({
			label: i18n.baseText('nodeSettings.action'),
			value: 'action',
		});
	}

	if (props.includeCredential) {
		ret.push({
			label: i18n.baseText('nodeSettings.credential'),
			value: 'credential',
			...(props.hasCredentialIssue && {
				icon: 'triangle-alert',
				iconPosition: 'right',
				iconColor: 'danger',
			}),
		});
	}

	ret.push(
		{
			label: i18n.baseText(
				props.compact ? 'nodeSettings.parametersShort' : 'nodeSettings.parameters',
			),
			value: 'params',
		},
		{
			value: 'settings',
			notification: canUpdatePackage.value && hasUpdateAvailable.value ? true : undefined,
			label: i18n.baseText('nodeSettings.settings'),
		},
	);

	if (isCommunityNode.value) {
		ret.push({
			label: i18n.baseText('generic.communityNode'),
			icon: 'box',
			value: 'communityNode',
			align: 'right',
			tooltip: i18n.baseText('generic.communityNode.tooltip', {
				interpolate: {
					docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
					packageName: packageName.value,
				},
			}),
		});
	}

	return ret;
});

function onDocsClick() {
	if (props.nodeType) {
		void externalHooks.run('dataDisplay.onDocumentationUrlClick', {
			nodeType: props.nodeType,
			documentationUrl: documentationUrl.value,
		});

		telemetry.track('User clicked ndv link', {
			node_type: activeNode.value?.type,
			workflow_id: workflowDocumentStore.value.workflowId,
			push_ref: props.pushRef,
			pane: NodeConnectionTypes.Main,
			type: 'docs',
		});
	}
}

function onTabSelect(tab: NodeSettingsTab) {
	if (tab === 'settings' && props.nodeType) {
		telemetry.track('User viewed node settings', {
			node_type: props.nodeType.name,
			workflow_id: workflowDocumentStore.value.workflowId,
		});
	}

	if (tab === 'settings' || tab === 'params' || tab === 'action' || tab === 'credential') {
		emit('update:model-value', tab);
	}
}

function onTooltipClick(tab: NodeSettingsTab, event: MouseEvent) {
	if (tab === 'communityNode' && (event.target as Element).localName === 'a') {
		telemetry.track('user clicked cnr docs link', { source: 'node details view' });
	}
}
</script>

<template>
	<N8nTabs
		:options="options"
		:model-value="modelValue"
		:size="compact ? 'small' : 'medium'"
		:class="$style.tabs"
		@update:model-value="onTabSelect"
		@tooltip-click="onTooltipClick"
	>
		<template v-if="documentationUrl" #suffix>
			<N8nTooltip
				:disabled="!compact"
				:content="i18n.baseText('nodeSettings.docs')"
				placement="bottom"
				:show-after="100"
			>
				<N8nLink
					:to="documentationUrl"
					new-window
					:underline="false"
					theme="text"
					:class="$style.docsLink"
					:aria-label="compact ? i18n.baseText('nodeSettings.docs') : undefined"
					data-test-id="tab-docs"
					@click="onDocsClick"
				>
					<N8nIcon v-if="compact" icon="book-open" size="small" />
					<template v-else>
						{{ i18n.baseText('nodeSettings.docs') }}
						<N8nIcon icon="external-link" size="small" />
					</template>
				</N8nLink>
			</N8nTooltip>
		</template>
	</N8nTabs>
</template>

<style lang="scss" module>
.tabs {
	width: 100%;
}
.docsLink {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--sm);
	font-size: var(--font-size--sm);
}
</style>
