<script setup lang="ts">
import NodeExecuteButton from '@/app/components/NodeExecuteButton.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeDocsUrl } from '@/app/composables/useNodeDocsUrl';
import { APP_MODALS_ELEMENT_ID, ExpressionLocalResolveContextSymbol } from '@/app/constants';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import type { INodeUi, ITab } from '@/Interface';
import InputPanel from '@/features/ndv/panel/components/InputPanel.vue';
import NodeErrorView from '@/features/ndv/runData/components/error/NodeErrorView.vue';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import {
	type ContextMenuAction,
	useContextMenuItems,
} from '@/features/shared/contextMenu/composables/useContextMenuItems';
import { useExpressionResolveCtx } from '@/features/workflows/canvas/experimental/composables/useExpressionResolveCtx';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useStyles } from '@n8n/composables/useStyles';
import {
	N8nButton,
	N8nBadge,
	N8nDropdownMenu,
	N8nIcon,
	N8nIconButton,
	N8nInlineTextEdit,
	N8nKeyboardShortcut,
	N8nPopover,
	N8nTabs,
	N8nText,
	N8nTooltip,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { NodeHelpers, isCommunityPackageName, type NodeError } from 'n8n-workflow';
import { useThrottleFn } from '@vueuse/core';
import { computed, onBeforeUnmount, provide, ref, useTemplateRef, watch } from 'vue';
import ExperimentalCanvasNodeSettings from './ExperimentalCanvasNodeSettings.vue';
import ExperimentalNodePanelData from './ExperimentalNodePanelData.vue';
import { type NodePanelTab, useExperimentalNdvStore } from '../experimentalNdv.store';

const props = defineProps<{
	node: INodeUi;
	nodeIds: string[];
	isReadOnly?: boolean;
	isParameterEditorOpen?: boolean;
}>();

const emit = defineEmits<{
	close: [];
	contextMenuAction: [ContextMenuAction, nodeIds: string[]];
	selectNode: [nodeId: string];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const ndvStore = injectNDVStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
const nodeTypesStore = useNodeTypesStore();
const experimentalNdvStore = useExperimentalNdvStore();
const { renameNode } = useCanvasOperations();
const { APP_Z_INDEXES } = useStyles();
const expressionResolveCtx = useExpressionResolveCtx(computed(() => props.node));
const contextMenuItems = useContextMenuItems(computed(() => props.nodeIds));
const headerMenuItems = computed<Array<DropdownMenuItemProps<ContextMenuAction>>>(() =>
	contextMenuItems.value
		.filter(({ id }) => ['toggle_activation', 'toggle_pin', 'duplicate', 'delete'].includes(id))
		.map(({ id, label, disabled, divided, checked }) => ({
			id,
			label,
			disabled,
			divided,
			checked,
		})),
);
const panelRef = useTemplateRef<HTMLElement>('panel');
const isDataMaximized = ref(false);
const selectedInputNodeName = ref<string>();
const ndvCloseTimes = ref(0);

const nodeTypeDescription = computed(() =>
	nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion),
);
const { docsUrl } = useNodeDocsUrl({ nodeType: nodeTypeDescription });
const isCommunityNode = computed(() => isCommunityPackageName(props.node.type));
const isSubNode = computed(() => NodeHelpers.isSubNodeType(nodeTypeDescription.value));
const parentNode = computed(() => {
	if (!isSubNode.value) return undefined;

	const parentName = workflowDocumentStore.value.getChildNodes(
		props.node.name,
		'ALL_NON_MAIN',
		1,
	)?.[0];
	return parentName ? workflowDocumentStore.value.getNodeByName(parentName) : undefined;
});
const nodeSettingsViewKey = computed(() => `${props.node.id}|${ndvCloseTimes.value}`);

const panelState = computed(() => experimentalNdvStore.getNodePanelState(props.node.id));
const selectedTab = computed({
	get: () => panelState.value.selectedTab,
	set: (selectedTab: NodePanelTab) =>
		experimentalNdvStore.updateNodePanelState(props.node.id, { selectedTab }),
});
const updateScrollPosition = useThrottleFn((nodeId: string, scrollTop: number) => {
	experimentalNdvStore.updateNodePanelState(nodeId, { scrollTop });
}, 100);
const isDataTab = computed(() => selectedTab.value !== 'properties');
const dataTab = computed(() =>
	selectedTab.value === 'input' || selectedTab.value === 'output' ? selectedTab.value : 'input',
);
const tabs = computed<Array<ITab<NodePanelTab>>>(() => [
	{ value: 'properties', label: i18n.baseText('nodePanel.properties') },
	{ value: 'input', label: i18n.baseText('ndv.input') },
	{ value: 'output', label: i18n.baseText('ndv.output') },
]);

const parentNodeNames = computed(() =>
	workflowDocumentStore.value.getParentNodesByDepth(props.node.name, 1).map(({ name }) => name),
);
const workflowRunData = computed(
	() => workflowExecutionStateStore.value.activeExecution?.data?.resultData?.runData,
);
const latestTaskData = computed(() => workflowRunData.value?.[props.node.name]?.at(-1));
function isNodeError(error: unknown): error is NodeError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'node' in error &&
		'messages' in error &&
		Array.isArray(error.messages)
	);
}

const latestNodeError = computed(() => {
	const error = latestTaskData.value?.error;
	return isNodeError(error) ? error : undefined;
});
const preferredInputNodeName = computed(() => {
	return (
		parentNodeNames.value.find(
			(name) =>
				workflowDocumentStore.value.pinnedDataByNodeName?.[name] !== undefined ||
				workflowRunData.value?.[name] !== undefined,
		) ?? parentNodeNames.value[0]
	);
});
const inputRun = computed(() => {
	const runs = selectedInputNodeName.value
		? workflowRunData.value?.[selectedInputNodeName.value]
		: undefined;
	return runs?.length ? runs.length - 1 : 0;
});
const panelElement = computed(() => panelRef.value);
const maximizeLabel = computed(() =>
	i18n.baseText('nodePanel.maximizeData', {
		interpolate: {
			tab: i18n
				.baseText(dataTab.value === 'input' ? 'ndv.input' : 'ndv.output')
				.toLocaleLowerCase(),
		},
	}),
);

watch(
	() => props.node.id,
	() => {
		selectedInputNodeName.value = preferredInputNodeName.value;
		isDataMaximized.value = false;
	},
	{ immediate: true },
);

watch(preferredInputNodeName, (nodeName) => {
	if (
		!selectedInputNodeName.value ||
		!parentNodeNames.value.includes(selectedInputNodeName.value)
	) {
		selectedInputNodeName.value = nodeName;
	}
});

watch(
	() => ndvStore.value.activeNodeName,
	(name, oldName) => {
		if (name === null && oldName !== null) ndvCloseTimes.value += 1;
	},
);

function closePanel() {
	experimentalNdvStore.setMapperPinned(false);
	isDataMaximized.value = false;
	emit('close');
}

function handleEscape(event: KeyboardEvent) {
	if (isDataMaximized.value) {
		isDataMaximized.value = false;
		return;
	}

	if (experimentalNdvStore.isMapperPinned) {
		experimentalNdvStore.setMapperPinned(false);
		return;
	}

	if (event.target instanceof HTMLElement && event.target !== panelRef.value) {
		event.target.blur();
		return;
	}

	closePanel();
}

function handleExecute() {
	selectedTab.value = 'output';
	telemetry.track('User executed node from focus panel', {
		nodeId: props.node.id,
		nodeType: props.node.type,
		parameterPath: '',
	});
}

function selectParentNode() {
	if (!parentNode.value) return;
	emit('selectNode', parentNode.value.id);
}

function handleRename(newName: string) {
	void renameNode(props.node.name, newName);
}

function handleMenuSelect(action: ContextMenuAction) {
	emit('contextMenuAction', action, props.nodeIds);
}

provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);

onBeforeUnmount(() => {
	experimentalNdvStore.setMapperPinned(false);
});
</script>

<template>
	<div
		ref="panel"
		:class="$style.component"
		data-test-id="node-panel"
		tabindex="-1"
		@keydown.esc.stop.prevent="handleEscape"
	>
		<N8nText v-if="nodeIds.length > 1" tag="div" color="text-base" :class="$style.multipleNodes">
			<div>{{ nodeIds.length }} nodes selected</div>
			<ul :class="$style.multipleNodesActions">
				<li v-for="action of contextMenuItems" :key="action.id" :class="$style.multipleNodesAction">
					<N8nButton
						variant="subtle"
						:disabled="action.disabled"
						@click="emit('contextMenuAction', action.id, nodeIds)"
					>
						{{ action.label }}
						<N8nKeyboardShortcut v-if="action.shortcut" v-bind="action.shortcut" />
					</N8nButton>
				</li>
			</ul>
		</N8nText>

		<template v-else>
			<header :class="[$style.header, { [$style.disabled]: node.disabled }]">
				<NodeIcon :node-type="nodeTypeDescription" :size="20" />
				<div v-if="!isParameterEditorOpen" :class="$style.titleGroup">
					<button
						v-if="parentNode"
						type="button"
						:class="$style.breadcrumb"
						@click="selectParentNode"
					>
						{{ parentNode.name }}
						<N8nText tag="span" color="text-base">/</N8nText>
					</button>
					<N8nInlineTextEdit
						:model-value="node.name"
						:min-width="0"
						:max-width="280"
						:read-only="isReadOnly"
						:placeholder="i18n.baseText('ndv.title.rename.placeholder')"
						:class="$style.title"
						@update:model-value="handleRename"
					/>
				</div>
				<div v-else :class="$style.titleGroup" />
				<N8nTooltip v-if="isCommunityNode" placement="bottom">
					<template #content>{{ i18n.baseText('generic.communityNode') }}</template>
					<N8nBadge theme="tertiary">{{ i18n.baseText('nodePanel.community') }}</N8nBadge>
				</N8nTooltip>
				<NodeExecuteButton
					v-if="!isReadOnly"
					:node-name="node.name"
					:label="i18n.baseText('ndv.execute.testStep')"
					:aria-label="i18n.baseText('ndv.execute.testStep')"
					telemetry-source="node_panel"
					variant="ghost"
					size="small"
					square
					hide-label
					@execute="handleExecute"
				/>
				<N8nTooltip placement="bottom">
					<template #content>
						{{
							i18n.baseText(
								experimentalNdvStore.isMapperPinned
									? 'nodePanel.hideInputData'
									: 'nodePanel.showInputData',
							)
						}}
					</template>
					<N8nIconButton
						variant="ghost"
						icon="database"
						size="small"
						:class="{ [$style.activeAction]: experimentalNdvStore.isMapperPinned }"
						:aria-label="
							i18n.baseText(
								experimentalNdvStore.isMapperPinned
									? 'nodePanel.hideInputData'
									: 'nodePanel.showInputData',
							)
						"
						@click="experimentalNdvStore.setMapperPinned(!experimentalNdvStore.isMapperPinned)"
					/>
				</N8nTooltip>
				<N8nTooltip v-if="docsUrl" placement="bottom">
					<template #content>{{ i18n.baseText('nodePanel.openDocs') }}</template>
					<a
						:href="docsUrl"
						target="_blank"
						rel="noopener noreferrer"
						:class="$style.iconAction"
						:aria-label="i18n.baseText('nodePanel.openDocs')"
					>
						<N8nIcon icon="book-open" size="small" />
					</a>
				</N8nTooltip>
				<N8nDropdownMenu
					v-if="headerMenuItems.length > 0"
					:items="headerMenuItems"
					placement="bottom-end"
					@select="handleMenuSelect"
				>
					<template #trigger>
						<N8nIconButton
							variant="ghost"
							icon="ellipsis-vertical"
							size="small"
							:aria-label="i18n.baseText('nodePanel.moreActions')"
						/>
					</template>
				</N8nDropdownMenu>
			</header>

			<div :class="$style.tabBar">
				<N8nTabs v-model="selectedTab" :options="tabs" variant="modern" size="small" />
				<N8nTooltip v-if="isDataTab" placement="bottom">
					<template #content>{{ maximizeLabel }}</template>
					<N8nIconButton
						variant="ghost"
						icon="maximize-2"
						size="small"
						:aria-label="maximizeLabel"
						@click="isDataMaximized = true"
					/>
				</N8nTooltip>
			</div>

			<main
				:class="$style.body"
				role="tabpanel"
				:aria-label="tabs.find(({ value }) => value === selectedTab)?.label"
			>
				<div v-if="latestNodeError && selectedTab === 'properties'" :class="$style.errorBanner">
					<NodeErrorView :error="latestNodeError" compact />
				</div>
				<KeepAlive :max="5">
					<ExperimentalCanvasNodeSettings
						v-if="selectedTab === 'properties'"
						:key="nodeSettingsViewKey"
						:class="$style.settings"
						:node-id="node.id"
						:is-read-only="isReadOnly"
						hide-header
						progressive-disclosure
						:always-show-all-settings="true"
						:initial-scroll-top="panelState.scrollTop"
						@scroll-position-changed="updateScrollPosition(node.id, $event)"
					/>
				</KeepAlive>
				<ExperimentalNodePanelData
					v-if="selectedTab !== 'properties'"
					:node="node"
					:tab="dataTab"
					:input-node-name="selectedInputNodeName"
					:is-read-only="isReadOnly"
					@input-node-changed="selectedInputNodeName = $event"
					@execute="handleExecute"
				/>
			</main>
		</template>

		<N8nPopover
			v-if="panelElement && selectedInputNodeName"
			:open="experimentalNdvStore.isMapperPinned"
			side="left"
			:side-flip="false"
			align="start"
			width="360px"
			:max-height="`calc(100vh - var(--spacing--sm) * 2)`"
			:reference="panelElement"
			:suppress-auto-focus="true"
			:z-index="APP_Z_INDEXES.NDV + 1"
			content-class="ignore-key-press-canvas ignore-key-press-node-creator"
		>
			<template #content>
				<InputPanel
					:run-index="inputRun"
					compact
					push-ref=""
					display-mode="schema"
					disable-display-mode-selection
					:active-node-name="node.name"
					:current-node-name="selectedInputNodeName"
					:is-mapping-onboarded="ndvStore.isMappingOnboarded"
					:focused-mappable-input="ndvStore.focusedMappableInput"
					node-not-run-message-variant="simple"
					:truncate-limit="60"
					search-shortcut="ctrl+f"
					:class="$style.mapper"
					@change-input-node="selectedInputNodeName = $event"
				/>
			</template>
		</N8nPopover>

		<Teleport v-if="isDataMaximized" :to="`#${APP_MODALS_ELEMENT_ID}`">
			<div
				:class="$style.overlayBackdrop"
				:style="{ zIndex: APP_Z_INDEXES.NDV }"
				@click="isDataMaximized = false"
			></div>
			<dialog
				open
				aria-modal="true"
				:aria-label="maximizeLabel"
				:class="$style.overlay"
				:style="{ zIndex: APP_Z_INDEXES.NDV + 1 }"
			>
				<header :class="$style.overlayHeader">
					<N8nText tag="h2" size="large" bold>
						{{ i18n.baseText(dataTab === 'input' ? 'ndv.input' : 'ndv.output') }}
					</N8nText>
					<N8nIconButton
						variant="ghost"
						icon="x"
						size="small"
						:aria-label="i18n.baseText('nodePanel.closeMaximizedData')"
						@click="isDataMaximized = false"
					/>
				</header>
				<div :class="$style.overlayBody">
					<ExperimentalNodePanelData
						:node="node"
						:tab="dataTab"
						:input-node-name="selectedInputNodeName"
						:is-read-only="isReadOnly"
						@input-node-changed="selectedInputNodeName = $event"
						@execute="handleExecute"
					/>
				</div>
			</dialog>
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.component {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	background: var(--background--surface);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--2xl);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: 1px solid var(--border-color--subtle);

	&.disabled {
		background: var(--background--info);
	}
}

.title {
	min-width: 0;
	flex: 1;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.titleGroup {
	display: flex;
	align-items: center;
	min-width: 0;
	flex: 1;
	gap: var(--spacing--4xs);
}

.breadcrumb {
	display: inline-flex;
	align-items: center;
	flex: 0 1 auto;
	min-width: 0;
	gap: var(--spacing--4xs);
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--text-color--subtle);
	font: inherit;
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}
}

.iconAction {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--md);
	height: var(--height--md);
	border-radius: var(--radius--sm);
	color: var(--text-color--subtle);

	&:hover {
		background: var(--background--hover);
		color: var(--text-color);
	}
}

.activeAction {
	color: var(--color--primary);
	background: var(--background--active);
}

.tabBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--xs) 0;
	border-bottom: 1px solid var(--border-color--subtle);
}

.body {
	display: flex;
	flex-direction: column;
	min-height: 0;
	flex: 1;
	overflow: hidden;
}

.settings {
	min-height: 0;
	flex: 1;
}

.errorBanner {
	flex: 0 0 auto;
	margin: var(--spacing--xs) var(--spacing--xs) 0;
	padding: var(--spacing--xs);
	border: 1px solid var(--border-color--danger);
	border-radius: var(--radius--md);
	background: var(--background--danger);
}

.mapper {
	height: 100%;
	overflow: auto;
	padding: var(--spacing--2xs);
	background: var(--background--surface);
}

.overlayBackdrop {
	position: fixed;
	inset: 0;
	background: var(--dialog--overlay--color--background--dark);
}

.overlay {
	position: fixed;
	inset: var(--spacing--2xl);
	display: flex;
	flex-direction: column;
	width: auto;
	height: auto;
	margin: 0;
	padding: 0;
	border: 1px solid var(--border-color);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	box-shadow: var(--shadow--xl);
}

.overlayHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm);
	border-bottom: 1px solid var(--border-color--subtle);
}

.overlayBody {
	min-height: 0;
	flex: 1;
	overflow: hidden;
}

.multipleNodes {
	min-height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: start;
	padding: var(--spacing--3xl) var(--spacing--md);
	gap: var(--spacing--md);
}

.multipleNodesActions {
	align-self: stretch;
	list-style-type: none;
}

.multipleNodesAction {
	margin-top: -1px;

	button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
}
</style>
