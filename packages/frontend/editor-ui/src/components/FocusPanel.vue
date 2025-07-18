<script setup lang="ts">
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { N8nText, N8nInput, N8nResizeWrapper, N8nInfoTip } from '@n8n/design-system';
import { computed, nextTick, ref, watch, toRef } from 'vue';
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
	isResourceLocatorValue,
} from 'n8n-workflow';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useDebounce } from '@/composables/useDebounce';
import { htmlEditorEventBus } from '@/event-bus';
import { hasFocusOnInput, isFocusableEl } from '@/utils/typesUtils';
import type { ResizeData, TargetNodeParameterContext } from '@/Interface';
import { useThrottleFn } from '@vueuse/core';
import { useStyles } from '@/composables/useStyles';
import { useExecutionData } from '@/composables/useExecutionData';
import { useWorkflowsStore } from '@/stores/workflows.store';

defineOptions({ name: 'FocusPanel' });

const props = defineProps<{
	isCanvasReadOnly: boolean;
}>();

const emit = defineEmits<{
	focus: [];
	saveKeyboardShortcut: [event: KeyboardEvent];
}>();

// ESLint: false positive
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const inputField = ref<InstanceType<typeof N8nInput> | HTMLElement>();

const locale = useI18n();
const nodeHelpers = useNodeHelpers();
const focusPanelStore = useFocusPanelStore();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const nodeSettingsParameters = useNodeSettingsParameters();
const environmentsStore = useEnvironmentsStore();
const deviceSupport = useDeviceSupport();
const { debounce } = useDebounce();
const styles = useStyles();

const focusedNodeParameter = computed(() => focusPanelStore.focusedNodeParameters[0]);
const resolvedParameter = computed(() =>
	focusedNodeParameter.value && focusPanelStore.isRichParameter(focusedNodeParameter.value)
		? focusedNodeParameter.value
		: undefined,
);

const focusPanelActive = computed(() => focusPanelStore.focusPanelActive);
const focusPanelHidden = computed(() => focusPanelStore.focusPanelHidden);
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

const isExecutable = computed(() => {
	if (!resolvedParameter.value) return false;

	if (!isDisplayed.value) return false;

	const foreignCredentials = nodeHelpers.getForeignCredentialsIfSharingEnabled(
		resolvedParameter.value.node.credentials,
	);
	return nodeHelpers.isNodeExecutable(
		resolvedParameter.value.node,
		!props.isCanvasReadOnly,
		foreignCredentials,
	);
});

const node = computed(() => resolvedParameter.value?.node);

const { hasNodeRun } = useExecutionData({ node });

function getTypeOption<T>(optionName: string): T | undefined {
	return resolvedParameter.value
		? getParameterTypeOption<T>(resolvedParameter.value.parameter, optionName)
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

const editorRows = computed(() => getTypeOption<number>('rows'));

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

const isNodeExecuting = computed(() => workflowsStore.isNodeExecuting(node.value?.name ?? ''));

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

const valueChangedDebounced = debounce(valueChanged, { debounceTime: 0 });

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

function onResize(event: ResizeData) {
	focusPanelStore.updateWidth(event.width);
}

const onResizeThrottle = useThrottleFn(onResize, 10);
</script>

<template>
	<div v-if="focusPanelActive" v-show="!focusPanelHidden" :class="$style.wrapper" @keydown.stop>
		<N8nResizeWrapper
			:width="focusPanelWidth"
			:supported-directions="['left']"
			:min-width="300"
			:max-width="1000"
			:grid-size="8"
			:style="{ width: `${focusPanelWidth}px`, zIndex: styles.APP_Z_INDEXES.FOCUS_PANEL }"
			@resize="onResizeThrottle"
		>
			<div :class="$style.container">
				<div v-if="resolvedParameter" :class="$style.content">
					<div :class="$style.tabHeader">
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
							></NodeExecuteButton>
							<N8nIcon
								:class="$style.closeButton"
								icon="x"
								color="text-base"
								size="xlarge"
								@click="focusPanelStore.closeFocusPanel"
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
								:model-value="resolvedParameter.value"
								:class="$style.editor"
								:is-read-only="isReadOnly"
								:path="resolvedParameter.parameterPath"
								data-test-id="expression-modal-input"
								:target-node-parameter-context="targetNodeParameterContext"
								@change="valueChangedDebounced($event.value)"
							/>
							<template v-else-if="['json', 'string'].includes(resolvedParameter.parameter.type)">
								<CodeNodeEditor
									v-if="editorType === 'codeNodeEditor'"
									:id="resolvedParameter.parameterPath"
									ref="inputField"
									:class="$style.heightFull"
									:mode="codeEditorMode"
									:model-value="resolvedParameter.value"
									:default-value="resolvedParameter.parameter.default"
									:language="editorLanguage"
									:is-read-only="isReadOnly"
									:target-node-parameter-context="targetNodeParameterContext"
									fill-parent
									:disable-ask-ai="true"
									@update:model-value="valueChangedDebounced" />
								<HtmlEditor
									v-else-if="editorType === 'htmlEditor'"
									ref="inputField"
									:model-value="resolvedParameter.value"
									:is-read-only="isReadOnly"
									:rows="editorRows"
									:disable-expression-coloring="!isHtmlNode"
									:disable-expression-completions="!isHtmlNode"
									fullscreen
									@update:model-value="valueChangedDebounced" />
								<CssEditor
									v-else-if="editorType === 'cssEditor'"
									ref="inputField"
									:model-value="resolvedParameter.value"
									:is-read-only="isReadOnly"
									:rows="editorRows"
									fullscreen
									@update:model-value="valueChangedDebounced" />
								<SqlEditor
									v-else-if="editorType === 'sqlEditor'"
									ref="inputField"
									:model-value="resolvedParameter.value"
									:dialect="getTypeOption('sqlDialect')"
									:is-read-only="isReadOnly"
									:rows="editorRows"
									fullscreen
									@update:model-value="valueChangedDebounced" />
								<JsEditor
									v-else-if="editorType === 'jsEditor'"
									ref="inputField"
									:model-value="resolvedParameter.value"
									:is-read-only="isReadOnly"
									:rows="editorRows"
									:posthog-capture="shouldCaptureForPosthog"
									fill-parent
									@update:model-value="valueChangedDebounced" />
								<JsonEditor
									v-else-if="resolvedParameter.parameter.type === 'json'"
									ref="inputField"
									:model-value="resolvedParameter.value"
									:is-read-only="isReadOnly"
									:rows="editorRows"
									fullscreen
									fill-parent
									@update:model-value="valueChangedDebounced" />
								<N8nInput
									v-else
									ref="inputField"
									:model-value="resolvedParameter.value"
									:class="$style.editor"
									:readonly="isReadOnly"
									type="textarea"
									resize="none"
									@update:model-value="valueChangedDebounced"
								></N8nInput
							></template>
						</div>
					</div>
				</div>
				<div v-else :class="[$style.content, $style.emptyContent]">
					<div :class="$style.emptyText">
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
						<N8nText color="text-base" size="medium" :bold="true">
							{{ locale.baseText('nodeView.focusPanel.noParameters.title') }}
						</N8nText>
						<N8nText color="text-base" size="small">
							{{ locale.baseText('nodeView.focusPanel.noParameters.subtitle') }}
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
	flex-direction: row nowrap;
	border-left: 1px solid var(--color-foreground-base);
	background: var(--color-background-xlight);
	overflow-y: hidden;
	height: 100%;
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

		.emptyText {
			margin: 0 var(--spacing-xl);
			display: flex;
			flex-direction: column;
			gap: var(--spacing-2xs);

			.focusParameterWrapper {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: var(--spacing-2xs);
				margin-bottom: var(--spacing-m);

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
	}

	.tabHeader {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--color-foreground-base);
		padding: var(--spacing-2xs);

		.tabHeaderText {
			display: flex;
			gap: var(--spacing-4xs);
			align-items: baseline;
		}

		.buttonWrapper {
			display: flex;
			gap: var(--spacing-2xs);
			align-items: center;
		}
	}

	.parameterDetailsWrapper {
		display: flex;
		height: 100%;
		flex-direction: column;
		gap: var(--spacing-2xs);
		padding: var(--spacing-2xs);

		.parameterOptionsWrapper {
			display: flex;
			justify-content: space-between;
		}

		.noExecutionDataTip {
			align-content: center;
		}

		.editorContainer {
			height: 100%;
			overflow-y: auto;

			.editor {
				display: flex;
				height: 100%;
				width: 100%;
				font-size: var(--font-size-2xs);

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
