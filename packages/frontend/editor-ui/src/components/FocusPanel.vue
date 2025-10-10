<script setup lang="ts">
import CodeNodeEditor from '@/features/editors/components/CodeNodeEditor/CodeNodeEditor.vue';
import CssEditor from '@/features/editors/components/CssEditor/CssEditor.vue';
import ExpressionEditorModalInput from '@/components/ExpressionEditorModal/ExpressionEditorModalInput.vue';
import HtmlEditor from '@/features/editors/components/HtmlEditor/HtmlEditor.vue';
import JsEditor from '@/features/editors/components/JsEditor/JsEditor.vue';
import JsonEditor from '@/features/editors/components/JsonEditor/JsonEditor.vue';
import NodeExecuteButton from '@/components/NodeExecuteButton.vue';
import ParameterOptions from '@/components/ParameterOptions.vue';
import SqlEditor from '@/features/editors/components/SqlEditor/SqlEditor.vue';
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { computed, nextTick, ref, watch, toRef, useTemplateRef } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	formatAsExpression,
	getParameterTypeOption,
	isValidParameterOption,
	parseFromExpression,
} from '@/utils/nodeSettingsUtils';
import { isValueExpression } from '@/utils/nodeTypesUtils';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useNodeSettingsParameters } from '@/composables/useNodeSettingsParameters';
import { useResolvedExpression } from '@/composables/useResolvedExpression';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import {
	AI_TRANSFORM_NODE_TYPE,
	type CodeExecutionMode,
	type CodeNodeEditorLanguage,
	type EditorType,
	HTML_NODE_TYPE,
	type INodeProperties,
	isResourceLocatorValue,
} from 'n8n-workflow';
import { useEnvironmentsStore } from '@/features/environments.ee/environments.store';
import { htmlEditorEventBus } from '@/event-bus';
import { hasFocusOnInput, isFocusableEl } from '@/utils/typesUtils';
import type { INodeUi, ResizeData, TargetNodeParameterContext } from '@/Interface';
import { useTelemetry } from '@/composables/useTelemetry';
import { useActiveElement, useThrottleFn } from '@vueuse/core';
import { useExecutionData } from '@/composables/useExecutionData';
import { useWorkflowsStore } from '@/stores/workflows.store';
import ExperimentalNodeDetailsDrawer from '@/features/canvas/experimental/components/ExperimentalNodeDetailsDrawer.vue';
import { useExperimentalNdvStore } from '@/features/canvas/experimental/experimentalNdv.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useVueFlow } from '@vue-flow/core';
import ExperimentalFocusPanelHeader from '@/features/canvas/experimental/components/ExperimentalFocusPanelHeader.vue';
import { useTelemetryContext } from '@/composables/useTelemetryContext';
import { type ContextMenuAction } from '@/features/ui/contextMenu/composables/useContextMenuItems';
import { type CanvasNode, CanvasNodeRenderType } from '@/features/canvas/canvas.types';
import { useCanvasOperations } from '@/composables/useCanvasOperations';

import {
	N8nIcon,
	N8nInfoTip,
	N8nInput,
	N8nRadioButtons,
	N8nResizeWrapper,
	N8nText,
} from '@n8n/design-system';
import { injectWorkflowState } from '@/composables/useWorkflowState';
defineOptions({ name: 'FocusPanel' });

const props = defineProps<{
	isCanvasReadOnly: boolean;
}>();

const emit = defineEmits<{
	focus: [];
	saveKeyboardShortcut: [event: KeyboardEvent];
	contextMenuAction: [action: ContextMenuAction, nodeIds: string[]];
}>();

// ESLint: false positive
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const inputField = ref<InstanceType<typeof N8nInput> | HTMLElement>();
const wrapperRef = useTemplateRef('wrapper');

const locale = useI18n();
const nodeHelpers = useNodeHelpers();
const focusPanelStore = useFocusPanelStore();
const workflowsStore = useWorkflowsStore();
const workflowState = injectWorkflowState();
const nodeTypesStore = useNodeTypesStore();
const telemetry = useTelemetry();
const nodeSettingsParameters = useNodeSettingsParameters();
const environmentsStore = useEnvironmentsStore();
const experimentalNdvStore = useExperimentalNdvStore();
const ndvStore = useNDVStore();
const deviceSupport = useDeviceSupport();
const vueFlow = useVueFlow(workflowsStore.workflowId);
const activeElement = useActiveElement();
const { renameNode } = useCanvasOperations();

useTelemetryContext({ view_shown: 'focus_panel' });

const resolvedParameter = computed(() => focusPanelStore.resolvedParameter);

const inputValue = ref<string>('');

const focusPanelActive = computed(() => focusPanelStore.focusPanelActive);
const focusPanelWidth = computed(() => focusPanelStore.focusPanelWidth);

const isDisabled = computed(() => {
	if (!resolvedParameter.value) return false;

	// shouldDisplayNodeParameter returns true if disabledOptions exists and matches, OR if disabledOptions doesn't exist
	return (
		!!resolvedParameter.value.parameter.disabledOptions &&
		nodeSettingsParameters.shouldDisplayNodeParameter(
			resolvedParameter.value.node.parameters,
			resolvedParameter.value.node,
			resolvedParameter.value.parameter,
			resolvedParameter.value.parameterPath.split('.').slice(1, -1).join('.'),
			'disabledOptions',
		)
	);
});

const isDisplayed = computed(() => {
	if (!resolvedParameter.value) return true;

	return nodeSettingsParameters.shouldDisplayNodeParameter(
		resolvedParameter.value.node.parameters,
		resolvedParameter.value.node,
		resolvedParameter.value.parameter,
		resolvedParameter.value.parameterPath.split('.').slice(1, -1).join('.'),
		'displayOptions',
	);
});

const node = computed<INodeUi | undefined>(() => {
	if (!experimentalNdvStore.isNdvInFocusPanelEnabled || resolvedParameter.value) {
		return resolvedParameter.value?.node;
	}

	const selected: CanvasNode | undefined = vueFlow.getSelectedNodes.value[0];

	return selected?.data?.render.type === CanvasNodeRenderType.Default
		? workflowsStore.allNodes.find((n) => n.id === selected.id)
		: undefined;
});
const multipleNodesSelected = computed(() => vueFlow.getSelectedNodes.value.length > 1);

const isExecutable = computed(() => {
	if (!node.value) return false;

	if (!isDisplayed.value) return false;

	const foreignCredentials = nodeHelpers.getForeignCredentialsIfSharingEnabled(
		node.value.credentials,
	);
	return nodeHelpers.isNodeExecutable(node.value, !props.isCanvasReadOnly, foreignCredentials);
});

const { workflowRunData } = useExecutionData({ node });

const hasNodeRun = computed(() => {
	if (!node.value) return true;
	const parentNode = workflowsStore.workflowObject.getParentNodes(node.value.name, 'main', 1)[0];
	return Boolean(
		parentNode &&
			workflowRunData.value &&
			Object.prototype.hasOwnProperty.bind(workflowRunData.value)(parentNode),
	);
});

function getTypeOption<T extends keyof NonNullable<INodeProperties['typeOptions']>>(optionName: T) {
	return resolvedParameter.value
		? getParameterTypeOption(resolvedParameter.value.parameter, optionName)
		: undefined;
}

const codeEditorMode = computed<CodeExecutionMode>(() => {
	return resolvedParameter.value?.node.parameters.mode as CodeExecutionMode;
});

const editorType = computed<EditorType | 'json' | 'code' | 'cssEditor' | undefined>(() => {
	return getTypeOption('editor') ?? undefined;
});

const editorLanguage = computed<CodeNodeEditorLanguage>(() => {
	if (editorType.value === 'json' || resolvedParameter.value?.parameter.type === 'json')
		return 'json' as CodeNodeEditorLanguage;

	return getTypeOption('editorLanguage') ?? 'javaScript';
});

const editorRows = computed(() => getTypeOption('rows'));

const isToolNode = computed(() =>
	resolvedParameter.value ? nodeTypesStore.isToolNode(resolvedParameter.value?.node.type) : false,
);

const isHtmlNode = computed(
	() => !!resolvedParameter.value && resolvedParameter.value.node.type === HTML_NODE_TYPE,
);

const expressionModeEnabled = computed(
	() =>
		resolvedParameter.value &&
		isValueExpression(resolvedParameter.value.parameter, resolvedParameter.value.value),
);

const expression = computed(() => {
	if (!expressionModeEnabled.value) return '';
	return isResourceLocatorValue(resolvedParameter.value)
		? resolvedParameter.value.value
		: resolvedParameter.value;
});

const shouldCaptureForPosthog = computed(
	() => resolvedParameter.value?.node.type === AI_TRANSFORM_NODE_TYPE,
);

const isReadOnly = computed(() => props.isCanvasReadOnly || isDisabled.value);

const resolvedAdditionalExpressionData = computed(() => {
	return {
		$vars: environmentsStore.variablesAsObject,
	};
});

const targetNodeParameterContext = computed<TargetNodeParameterContext | undefined>(() => {
	if (!resolvedParameter.value) return undefined;
	return {
		nodeName: resolvedParameter.value.node.name,
		parameterPath: resolvedParameter.value.parameterPath,
	};
});

const isNodeExecuting = computed(() =>
	workflowState.executingNode.isNodeExecuting(node.value?.name ?? ''),
);

const selectedNodeIds = computed(() => vueFlow.getSelectedNodes.value.map((n) => n.id));

const emptyTitle = computed(() =>
	experimentalNdvStore.isNdvInFocusPanelEnabled
		? locale.baseText('nodeView.focusPanel.v2.noParameters.title')
		: locale.baseText('nodeView.focusPanel.noParameters.title'),
);

const emptySubtitle = computed(() =>
	experimentalNdvStore.isNdvInFocusPanelEnabled
		? locale.baseText('nodeView.focusPanel.v2.noParameters.subtitle')
		: locale.baseText('nodeView.focusPanel.noParameters.subtitle'),
);

const { resolvedExpression } = useResolvedExpression({
	expression,
	additionalData: resolvedAdditionalExpressionData,
	stringifyObject:
		resolvedParameter.value && resolvedParameter.value.parameter.type !== 'multiOptions',
});

function valueChanged(value: string) {
	if (resolvedParameter.value === undefined) {
		return;
	}

	nodeSettingsParameters.updateNodeParameter(
		toRef(resolvedParameter.value.node.parameters),
		{ value, name: resolvedParameter.value.parameterPath as `parameters.${string}` },
		value,
		resolvedParameter.value.node,
		isToolNode.value,
	);
}

async function setFocus() {
	await nextTick();

	if (inputField.value) {
		if (hasFocusOnInput(inputField.value)) {
			inputField.value.focusOnInput();
		} else if (isFocusableEl(inputField.value)) {
			inputField.value.focus();
		}
	}

	emit('focus');
}

function optionSelected(command: string) {
	if (!resolvedParameter.value) return;

	switch (command) {
		case 'resetValue': {
			if (typeof resolvedParameter.value.parameter.default === 'string') {
				valueChanged(resolvedParameter.value.parameter.default);
			}
			void setFocus();
			break;
		}

		case 'addExpression': {
			const newValue = formatAsExpression(
				resolvedParameter.value.value,
				resolvedParameter.value.parameter.type,
			);
			valueChanged(typeof newValue === 'string' ? newValue : newValue.value);
			void setFocus();
			break;
		}

		case 'removeExpression': {
			const newValue = parseFromExpression(
				resolvedParameter.value.value,
				resolvedExpression.value,
				resolvedParameter.value.parameter.type,
				resolvedParameter.value.parameter.default,
				(resolvedParameter.value.parameter.options ?? []).filter(isValidParameterOption),
			);
			if (typeof newValue === 'string') {
				valueChanged(newValue);
			} else if (newValue && typeof (newValue as { value?: unknown }).value === 'string') {
				valueChanged((newValue as { value: string }).value);
			}
			void setFocus();
			break;
		}

		case 'formatHtml':
			htmlEditorEventBus.emit('format-html');
			break;
	}
}

function closeFocusPanel() {
	if (experimentalNdvStore.isNdvInFocusPanelEnabled && resolvedParameter.value) {
		focusPanelStore.unsetParameters();

		telemetry.track('User removed focused param', {
			source: 'closeIcon',
			parameters: focusPanelStore.focusedNodeParametersInTelemetryFormat,
		});

		return;
	}

	telemetry.track('User closed focus panel', {
		source: 'closeIcon',
		parameters: focusPanelStore.focusedNodeParametersInTelemetryFormat,
	});

	focusPanelStore.closeFocusPanel();
}

function onExecute() {
	telemetry.track(
		'User executed node from focus panel',
		focusPanelStore.focusedNodeParametersInTelemetryFormat[0],
	);
}

function onInputChange(val: string) {
	inputValue.value = val;
	valueChanged(val);
}

// Wait for editor to mount before focusing
function focusWithDelay() {
	setTimeout(() => {
		void setFocus();
	}, 50);
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 's' && deviceSupport.isCtrlKeyPressed(event)) {
		event.stopPropagation();
		event.preventDefault();
		if (isReadOnly.value) return;

		emit('saveKeyboardShortcut', event);
	}
}

const registerKeyboardListener = () => {
	document.addEventListener('keydown', handleKeydown, true);
};

const unregisterKeyboardListener = () => {
	document.removeEventListener('keydown', handleKeydown, true);
};

watch([() => focusPanelStore.lastFocusTimestamp, () => expressionModeEnabled.value], () =>
	focusWithDelay(),
);

watch(
	() => focusPanelStore.focusPanelActive,
	(newValue) => {
		if (newValue) {
			registerKeyboardListener();
		} else {
			unregisterKeyboardListener();
		}
	},
	{ immediate: true },
);

watch(
	() => resolvedParameter.value,
	(newValue) => {
		if (newValue) {
			const value = newValue.value;
			if (typeof value === 'string' && value !== inputValue.value) {
				inputValue.value = value;
			}
		}
	},
	{ immediate: true },
);

watch(activeElement, (active) => {
	if (!node.value || !active || !wrapperRef.value?.contains(active)) {
		return;
	}

	const path = active.closest('.parameter-input')?.getAttribute('data-parameter-path');

	if (!path) {
		return;
	}

	telemetry.track('User focused focus panel', {
		node_id: node.value.id,
		node_type: node.value.type,
		parameter_path: path,
	});
});

function onResize(event: ResizeData) {
	focusPanelStore.updateWidth(event.width);
}

const onResizeThrottle = useThrottleFn(onResize, 10);

function onOpenNdv() {
	if (node.value) {
		ndvStore.setActiveNodeName(node.value.name, 'focus_panel');
	}
}

function onRenameNode(value: string) {
	if (node.value) {
		void renameNode(node.value.name, value);
	}
}
</script>

<template>
	<div
		v-if="focusPanelActive"
		ref="wrapper"
		data-test-id="focus-panel"
		:class="[
			$style.wrapper,
			'ignore-key-press-canvas',
			{ [$style.isNdvInFocusPanelEnabled]: experimentalNdvStore.isNdvInFocusPanelEnabled },
		]"
		@keydown.stop
	>
		<N8nResizeWrapper
			:width="focusPanelWidth"
			:supported-directions="['left']"
			:min-width="300"
			:max-width="experimentalNdvStore.isNdvInFocusPanelEnabled ? undefined : 1000"
			:grid-size="8"
			:style="{ width: `${focusPanelWidth}px` }"
			@resize="onResizeThrottle"
		>
			<div :class="$style.container">
				<ExperimentalFocusPanelHeader
					v-if="experimentalNdvStore.isNdvInFocusPanelEnabled && node && !multipleNodesSelected"
					:node="node"
					:parameter="resolvedParameter?.parameter"
					:is-executable="isExecutable"
					:read-only="isCanvasReadOnly"
					@execute="onExecute"
					@open-ndv="onOpenNdv"
					@clear-parameter="closeFocusPanel"
					@rename-node="onRenameNode"
				/>
				<div v-if="resolvedParameter" :class="$style.content" data-test-id="focus-parameter">
					<div v-if="!experimentalNdvStore.isNdvInFocusPanelEnabled" :class="$style.tabHeader">
						<div :class="$style.tabHeaderText">
							<N8nText color="text-dark" size="small">
								{{ resolvedParameter.parameter.displayName }}
							</N8nText>
							<N8nText color="text-base" size="xsmall">{{ resolvedParameter.node.name }}</N8nText>
						</div>
						<div :class="$style.buttonWrapper">
							<NodeExecuteButton
								data-test-id="node-execute-button"
								:node-name="resolvedParameter.node.name"
								:tooltip="`Execute ${resolvedParameter.node.name}`"
								:disabled="!isExecutable"
								size="small"
								icon="play"
								:square="true"
								:hide-label="true"
								telemetry-source="focus"
								@execute="onExecute"
							/>
							<N8nIcon
								:class="$style.closeButton"
								icon="x"
								color="text-base"
								size="xlarge"
								@click="closeFocusPanel"
							/>
						</div>
					</div>
					<div :class="$style.parameterDetailsWrapper">
						<div :class="$style.parameterOptionsWrapper">
							<div :class="$style.noExecutionDataTip">
								<N8nInfoTip
									v-if="!hasNodeRun && !isNodeExecuting"
									:class="$style.delayedShow"
									:bold="true"
								>
									{{ locale.baseText('nodeView.focusPanel.noExecutionData') }}
								</N8nInfoTip>
							</div>
							<ParameterOptions
								v-if="isDisplayed"
								:parameter="resolvedParameter.parameter"
								:value="resolvedParameter.value"
								:is-read-only="isReadOnly"
								@update:model-value="optionSelected"
							/>
						</div>
						<div v-if="typeof resolvedParameter.value === 'string'" :class="$style.editorContainer">
							<div v-if="!isDisplayed" :class="[$style.content, $style.emptyContent]">
								<div :class="$style.emptyText">
									<N8nText color="text-base">
										{{ locale.baseText('nodeView.focusPanel.missingParameter') }}
									</N8nText>
								</div>
							</div>
							<ExpressionEditorModalInput
								v-else-if="expressionModeEnabled"
								ref="inputField"
								v-model="inputValue"
								:class="$style.editor"
								:is-read-only="isReadOnly"
								:path="resolvedParameter.parameterPath"
								data-test-id="expression-modal-input"
								:target-node-parameter-context="targetNodeParameterContext"
								@change="onInputChange($event.value)"
							/>
							<template v-else-if="['json', 'string'].includes(resolvedParameter.parameter.type)">
								<CodeNodeEditor
									v-if="editorType === 'codeNodeEditor'"
									:id="resolvedParameter.parameterPath"
									ref="inputField"
									v-model="inputValue"
									:class="$style.heightFull"
									:mode="codeEditorMode"
									:default-value="resolvedParameter.parameter.default"
									:language="editorLanguage"
									:is-read-only="isReadOnly"
									:target-node-parameter-context="targetNodeParameterContext"
									fill-parent
									:disable-ask-ai="true"
									@update:model-value="onInputChange" />
								<HtmlEditor
									v-else-if="editorType === 'htmlEditor'"
									ref="inputField"
									v-model="inputValue"
									:is-read-only="isReadOnly"
									:rows="editorRows"
									:disable-expression-coloring="!isHtmlNode"
									:disable-expression-completions="!isHtmlNode"
									fullscreen
									:target-node-parameter-context="targetNodeParameterContext"
									@update:model-value="onInputChange" />
								<CssEditor
									v-else-if="editorType === 'cssEditor'"
									ref="inputField"
									v-model="inputValue"
									:is-read-only="isReadOnly"
									:rows="editorRows"
									fullscreen
									:target-node-parameter-context="targetNodeParameterContext"
									@update:model-value="onInputChange" />
								<SqlEditor
									v-else-if="editorType === 'sqlEditor'"
									ref="inputField"
									v-model="inputValue"
									:dialect="getTypeOption('sqlDialect')"
									:is-read-only="isReadOnly"
									:rows="editorRows"
									fullscreen
									:target-node-parameter-context="targetNodeParameterContext"
									@update:model-value="onInputChange" />
								<JsEditor
									v-else-if="editorType === 'jsEditor'"
									ref="inputField"
									v-model="inputValue"
									:is-read-only="isReadOnly"
									:rows="editorRows"
									:posthog-capture="shouldCaptureForPosthog"
									fill-parent
									@update:model-value="onInputChange" />
								<JsonEditor
									v-else-if="resolvedParameter.parameter.type === 'json'"
									ref="inputField"
									v-model="inputValue"
									:is-read-only="isReadOnly"
									:rows="editorRows"
									fullscreen
									fill-parent
									@update:model-value="onInputChange" />
								<N8nInput
									v-else
									ref="inputField"
									v-model="inputValue"
									:class="$style.editor"
									:readonly="isReadOnly"
									type="textarea"
									resize="none"
									@update:model-value="onInputChange"
								></N8nInput
							></template>
						</div>
					</div>
				</div>
				<ExperimentalNodeDetailsDrawer
					v-else-if="node && experimentalNdvStore.isNdvInFocusPanelEnabled"
					:node="node"
					:node-ids="selectedNodeIds"
					:is-read-only="isReadOnly"
					@open-ndv="onOpenNdv"
					@context-menu-action="(action, nodeIds) => emit('contextMenuAction', action, nodeIds)"
				/>
				<div v-else :class="[$style.content, $style.emptyContent]">
					<div :class="$style.focusParameterWrapper">
						<div :class="$style.iconWrapper">
							<N8nIcon :class="$style.forceHover" icon="panel-right" size="medium" />
							<N8nIcon
								:class="$style.pointerIcon"
								icon="mouse-pointer"
								color="text-dark"
								size="large"
							/>
						</div>
						<N8nIcon icon="ellipsis-vertical" size="small" color="text-base" />
						<N8nRadioButtons
							size="small"
							:model-value="'expression'"
							:disabled="true"
							:options="[
								{ label: locale.baseText('parameterInput.fixed'), value: 'fixed' },
								{ label: locale.baseText('parameterInput.expression'), value: 'expression' },
							]"
						/>
					</div>
					<div :class="$style.emptyText">
						<N8nText color="text-base" size="medium" :bold="true">
							{{ emptyTitle }}
						</N8nText>
						<N8nText color="text-base" size="small">
							{{ emptySubtitle }}
						</N8nText>
					</div>
				</div>
			</div>
		</N8nResizeWrapper>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	border-left: 1px solid var(--color--foreground);
	background: var(--color--background--light-3);
	overflow-y: hidden;
	height: 100%;
	flex-grow: 0;
	flex-shrink: 0;
}

.container {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.content {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;

	&.emptyContent {
		text-align: center;
		justify-content: center;
		align-items: center;

		.isNdvInFocusPanelEnabled & {
			flex-direction: column-reverse;
		}

		.emptyText {
			margin: 0 var(--spacing--xl);
			display: flex;
			flex-direction: column;
			gap: var(--spacing--2xs);
		}

		.focusParameterWrapper {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: var(--spacing--2xs);
			margin-block: var(--spacing--md);

			.iconWrapper {
				position: relative;
				display: inline-block;
			}

			.pointerIcon {
				position: absolute;
				top: 100%;
				left: 50%;
				transform: translate(-20%, -30%);
				pointer-events: none;
			}

			:global([class*='_disabled_']) {
				cursor: default !important;
			}
		}
	}

	.tabHeader {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--color--foreground);
		padding: var(--spacing--2xs);

		.tabHeaderText {
			display: flex;
			gap: var(--spacing--4xs);
			align-items: baseline;
		}

		.buttonWrapper {
			display: flex;
			gap: var(--spacing--2xs);
			align-items: center;
		}
	}

	.parameterDetailsWrapper {
		display: flex;
		height: 100%;
		flex-direction: column;
		gap: var(--spacing--2xs);
		padding: var(--spacing--2xs);

		.parameterOptionsWrapper {
			display: flex;
			justify-content: space-between;
		}

		.noExecutionDataTip {
			align-content: center;
		}

		.editorContainer {
			height: 0;
			flex-grow: 1;

			.editor {
				display: flex;
				height: 100%;
				width: 100%;
				font-size: var(--font-size--2xs);

				:global(.cm-editor) {
					background-color: var(--color-code-background);
					width: 100%;
				}
			}
		}
	}
}

// We have this animation here to hide the short time between no longer
// executing the node and having runData available
.delayedShow {
	opacity: 0;
	transition: opacity 0.1s none;
	animation: triggerShow 0.1s normal 0.1s forwards;
}

@keyframes triggerShow {
	to {
		opacity: 1;
	}
}

.closeButton {
	cursor: pointer;
}

.heightFull {
	height: 100%;
}

.forceHover {
	color: var(--color-button-secondary-hover-active-focus-font);
	border-color: var(--color-button-secondary-hover-active-focus-border);
	background-color: var(--color-button-secondary-hover-active-focus-background);
}
</style>
