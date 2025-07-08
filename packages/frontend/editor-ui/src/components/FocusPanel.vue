<script setup lang="ts">
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { N8nText, N8nInput } from '@n8n/design-system';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { formatAsExpression, parseFromExpression } from '@/utils/nodeSettingsUtils';
import { isValueExpression } from '@/utils/nodeTypesUtils';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useNodeSettingsParameters } from '@/composables/useNodeSettingsParameters';
import { useResolvedExpression } from '@/composables/useResolvedExpression';
import {
	AI_TRANSFORM_NODE_TYPE,
	type CodeExecutionMode,
	type CodeNodeEditorLanguage,
	type EditorType,
	HTML_NODE_TYPE,
	isResourceLocatorValue,
} from 'n8n-workflow';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useDebounce } from '@/composables/useDebounce';
import { htmlEditorEventBus } from '@/event-bus';
import type { TargetNodeParameterContext } from '@/Interface';

defineOptions({ name: 'FocusPanel' });

const props = defineProps<{
	isCanvasReadOnly: boolean;
}>();

const locale = useI18n();
const nodeHelpers = useNodeHelpers();
const focusPanelStore = useFocusPanelStore();
const nodeTypesStore = useNodeTypesStore();
const nodeSettingsParameters = useNodeSettingsParameters();
const externalSecretsStore = useExternalSecretsStore();
const environmentsStore = useEnvironmentsStore();
const { debounce } = useDebounce();

const focusedNodeParameter = computed(() => focusPanelStore.focusedNodeParameters[0]);
const resolvedParameter = computed(() =>
	focusedNodeParameter.value && focusPanelStore.isRichParameter(focusedNodeParameter.value)
		? focusedNodeParameter.value
		: undefined,
);

const focusPanelActive = computed(() => focusPanelStore.focusPanelActive);

const isExecutable = computed(() => {
	if (!resolvedParameter.value) return false;

	const foreignCredentials = nodeHelpers.getForeignCredentialsIfSharingEnabled(
		resolvedParameter.value.node.credentials,
	);
	return nodeHelpers.isNodeExecutable(
		resolvedParameter.value.node,
		!props.isCanvasReadOnly,
		foreignCredentials,
	);
});

function getArgument<T = string | number | boolean | undefined>(argumentName: string): T {
	return resolvedParameter.value?.parameter.typeOptions?.[argumentName] as T;
}

const codeEditorMode = computed<CodeExecutionMode>(() => {
	return resolvedParameter.value?.node.parameters.mode as CodeExecutionMode;
});

const editorType = computed<EditorType | 'json' | 'code' | 'cssEditor'>(() => {
	return getArgument('editor');
});

const editorLanguage = computed<CodeNodeEditorLanguage>(() => {
	if (editorType.value === 'json' || resolvedParameter.value?.parameter.type === 'json')
		return 'json' as CodeNodeEditorLanguage;

	return getArgument('editorLanguage') ?? 'javaScript';
});

const editorRows = computed(() => getArgument<number>('rows'));

const isToolNode = computed(() =>
	resolvedParameter.value ? nodeTypesStore.isToolNode(resolvedParameter.value?.node.type) : false,
);

const isHtmlNode = computed(
	() => !!resolvedParameter.value && resolvedParameter.value.node.type === HTML_NODE_TYPE,
);

const isDisabled = computed(() => {
	if (!resolvedParameter.value) return false;

	return nodeSettingsParameters.shouldDisplayNodeParameter(
		resolvedParameter.value.node.parameters,
		resolvedParameter.value.node,
		resolvedParameter.value.parameter,
		'',
		'disabledOptions',
	);
});

const isDisplayed = computed(() => {
	if (!resolvedParameter.value) return true;

	return nodeSettingsParameters.shouldDisplayNodeParameter(
		resolvedParameter.value.node.parameters,
		resolvedParameter.value.node,
		resolvedParameter.value.parameter,
		'',
		'displayOptions',
	);
});

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

// TODO: get correct value
const isForCredential = false;

const resolvedAdditionalExpressionData = computed(() => {
	return {
		$vars: environmentsStore.variablesAsObject,
		...(externalSecretsStore.isEnterpriseExternalSecretsEnabled && isForCredential
			? { $secrets: externalSecretsStore.secretsAsObject }
			: {}),
	};
});

const targetNodeParameterContext = computed<TargetNodeParameterContext | undefined>(() => {
	if (!resolvedParameter.value) return undefined;
	return {
		nodeName: resolvedParameter.value.node.name,
		parameterPath: resolvedParameter.value.parameterPath,
	};
});

const { resolvedExpression } = useResolvedExpression({
	expression,
	additionalData: resolvedAdditionalExpressionData,
	isForCredential,
	stringifyObject:
		resolvedParameter.value && resolvedParameter.value.parameter.type !== 'multiOptions',
});

function valueChanged(value: string) {
	if (resolvedParameter.value === undefined) {
		return;
	}
	nodeSettingsParameters.updateNodeParameter(
		{ value, name: resolvedParameter.value.parameterPath as `parameters.${string}` },
		value,
		resolvedParameter.value.node,
		isToolNode.value,
	);
}

function optionSelected(command: string) {
	if (!resolvedParameter.value) return;

	switch (command) {
		case 'resetValue':
			return (
				typeof resolvedParameter.value.parameter.default === 'string' &&
				valueChanged(resolvedParameter.value.parameter.default)
			);

		case 'addExpression': {
			const newValue = formatAsExpression(
				resolvedParameter.value.value,
				resolvedParameter.value.parameter.type,
			);
			valueChanged(typeof newValue === 'string' ? newValue : newValue.value);
			// await setFocus();
			break;
		}

		case 'removeExpression': {
			// isFocused.value = false;
			const newValue = parseFromExpression(
				resolvedParameter.value.value,
				resolvedExpression.value,
				resolvedParameter.value.parameter.type,
				resolvedParameter.value.parameter.default,
				[], // TODO: get parameterOptions
			);
			if (typeof newValue === 'string') {
				valueChanged(newValue);
			} else if (newValue && typeof (newValue as { value?: unknown }).value === 'string') {
				valueChanged((newValue as { value: string }).value);
			}
			break;
		}

		case 'formatHtml':
			htmlEditorEventBus.emit('format-html');
			return;
	}
}

const valueChangedDebounced = debounce(valueChanged, { debounceTime: 0 });
</script>

<template>
	<div v-if="focusPanelActive" :class="$style.container" @keydown.stop>
		<div :class="$style.header">
			<N8nText size="small" :bold="true">
				{{ locale.baseText('nodeView.focusPanel.title') }}
			</N8nText>
			<div :class="$style.closeButton" @click="focusPanelStore.closeFocusPanel">
				<n8n-icon icon="arrow-right" color="text-base" />
			</div>
		</div>
		<div v-if="resolvedParameter" :class="$style.content">
			<div :class="$style.tabHeader">
				<div :class="$style.tabHeaderText">
					<N8nText color="text-dark" size="small">
						{{ resolvedParameter.parameter.displayName }}
					</N8nText>
					<N8nText color="text-base" size="xsmall">{{ resolvedParameter.node.name }}</N8nText>
				</div>
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
			</div>
			<div :class="$style.parameterDetailsWrapper">
				<div :class="$style.parameterOptionsWrapper">
					<div></div>
					<ParameterOptions
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
							:mode="codeEditorMode"
							:model-value="resolvedParameter.value"
							:default-value="resolvedParameter.parameter.default"
							:language="editorLanguage"
							:is-read-only="isReadOnly"
							:target-node-parameter-context="targetNodeParameterContext"
							fill-parent
							@update:model-value="valueChangedDebounced" />
						<HtmlEditor
							v-else-if="editorType === 'htmlEditor'"
							:model-value="resolvedParameter.value"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							:disable-expression-coloring="!isHtmlNode"
							:disable-expression-completions="!isHtmlNode"
							fullscreen
							@update:model-value="valueChangedDebounced" />
						<CssEditor
							v-else-if="editorType === 'cssEditor'"
							:model-value="resolvedParameter.value"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							fullscreen
							@update:model-value="valueChangedDebounced" />
						<SqlEditor
							v-else-if="editorType === 'sqlEditor'"
							:model-value="resolvedParameter.value"
							:dialect="getArgument('sqlDialect')"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							fullscreen
							@update:model-value="valueChangedDebounced" />
						<JsEditor
							v-else-if="editorType === 'jsEditor'"
							:model-value="resolvedParameter.value"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							:posthog-capture="shouldCaptureForPosthog"
							fill-parent
							@update:model-value="valueChangedDebounced" />
						<JsonEditor
							v-else-if="resolvedParameter.parameter.type === 'json'"
							:model-value="resolvedParameter.value"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							fullscreen
							fill-parent
							@update:model-value="valueChangedDebounced" />
						<N8nInput
							v-else
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
				<N8nText color="text-base">
					{{ locale.baseText('nodeView.focusPanel.noParameters') }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	width: 528px;
	border-left: 1px solid var(--color-foreground-base);
	background: var(--color-foreground-light);
	overflow-y: hidden;
}

.closeButton:hover {
	cursor: pointer;
}

.header {
	display: flex;
	padding: var(--spacing-2xs);
	justify-content: space-between;
	border-bottom: 1px solid var(--color-foreground-base);
	background: var(--color-foreground-xlight);
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
			max-width: 300px;
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
			padding: 6px 8px 6px 34px;
			justify-content: flex-end;
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

		.editorContainer {
			height: 100%;
			overflow-y: auto;

			.editor {
				display: flex;
				height: 100%;
				width: 100%;
				font-size: var(--font-size-2xs);

				:global(.cm-editor) {
					width: 100%;
				}
			}
		}
	}
}
</style>
