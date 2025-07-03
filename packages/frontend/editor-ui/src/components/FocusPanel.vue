<script setup lang="ts">
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { N8nText, N8nInput } from '@n8n/design-system';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { isValueExpression } from '@/utils/nodeTypesUtils';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useNodeSettingsParameters } from '@/composables/useNodeSettingsParameters';

defineOptions({ name: 'FocusPanel' });

const props = defineProps<{
	executable: boolean;
}>();

const locale = useI18n();
const nodeHelpers = useNodeHelpers();
const focusPanelStore = useFocusPanelStore();
const nodeTypesStore = useNodeTypesStore();
const nodeSettingsParameters = useNodeSettingsParameters();

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
		props.executable,
		foreignCredentials,
	);
});

const isToolNode = computed(() =>
	resolvedParameter.value ? nodeTypesStore.isToolNode(resolvedParameter.value?.node.type) : false,
);

const expressionModeEnabled = computed(
	() =>
		resolvedParameter.value &&
		isValueExpression(resolvedParameter.value.parameter, resolvedParameter.value.value),
);

function optionSelected() {
	// TODO: Handle the option selected (command: string) from the dropdown
}

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
						:is-read-only="false"
						@update:model-value="optionSelected"
					/>
				</div>
				<div v-if="typeof resolvedParameter.value === 'string'" :class="$style.editorContainer">
					<ExpressionEditorModalInput
						v-if="expressionModeEnabled"
						:model-value="resolvedParameter.value"
						:class="$style.editor"
						:is-read-only="false"
						:path="resolvedParameter.parameterPath"
						data-test-id="expression-modal-input"
						:target-node-parameter-context="{
							nodeName: resolvedParameter.node.name,
							parameterPath: resolvedParameter.parameterPath,
						}"
						@change="valueChanged($event.value)"
					/>
					<N8nInput
						v-else
						:model-value="resolvedParameter.value"
						:class="$style.editor"
						type="textarea"
						resize="none"
						@update:model-value="valueChanged($event)"
					></N8nInput>
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
	background: var(--color-background-base);
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
	background: var(--color-background-xlight);
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
			align-items: center;
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
			display: flex;
			height: 100%;
			overflow-y: auto;

			.editor {
				display: flex;
				height: 100%;
				width: 100%;
				font-size: var(--font-size-xs);

				:global(.cm-editor) {
					width: 100%;
				}
			}
		}
	}
}
</style>
