<script setup lang="ts">
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { N8nText, N8nInput } from '@n8n/design-system';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { isValueExpression } from '@/utils/nodeTypesUtils';
import { useNodeSettingsParameters } from '@/composables/useNodeSettingsParameters';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

defineOptions({ name: 'FocusPanel' });

const locale = useI18n();

const focusPanelStore = useFocusPanelStore();
const nodeTypesStore = useNodeTypesStore();
const nodeSettingsParameters = useNodeSettingsParameters();

const focusedNodeParameter = computed(() => focusPanelStore.focusedNodeParameters[0]);
const resolvedParameter = computed(() =>
	focusPanelStore.isRichParameter(focusedNodeParameter.value)
		? focusedNodeParameter.value
		: undefined,
);

const focusPanelActive = computed(() => focusPanelStore.focusPanelActive);

const isCodeBlock = computed(() => resolvedParameter.value?.parameterPath === 'parameters.jsCode');

const expressionModeEnabled = computed(
	() =>
		resolvedParameter.value &&
		isValueExpression(resolvedParameter.value.parameter, resolvedParameter.value.value),
);

const isToolNode = computed(() =>
	resolvedParameter.value ? nodeTypesStore.isToolNode(resolvedParameter.value?.node.type) : false,
);

function optionSelected() {
	// TODO: Handle the option selected (command: string) from the dropdown
}

function valueChanged(value: string) {
	if (resolvedParameter.value === undefined) {
		return;
	}

	nodeSettingsParameters.updateNodeParameter(
		{ value, name: `parameters.${focusedNodeParameter.value.parameter.name}` },
		value,
		resolvedParameter.value.node,
		isToolNode.value,
	);
}

function executeFocusedNode() {
	// TODO: Implement execution of the focused node
}
</script>

<template>
	<div v-if="focusPanelActive" :class="$style.container">
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
					<N8nText color="text-dark" size="small">{{
						resolvedParameter.parameter.displayName
					}}</N8nText>
					<N8nText color="text-base" size="xsmall">{{ resolvedParameter.node.name }}</N8nText>
				</div>
				<N8nTooltip>
					<n8n-button
						v-bind="{ icon: 'play', square: true }"
						size="small"
						type="primary"
						@click="executeFocusedNode"
					/>
					<template #content>
						<N8nText size="small">
							{{ locale.baseText('nodeView.focusPanel.executeButtonTooltip') }}
						</N8nText>
					</template>
				</N8nTooltip>
			</div>
			<div :class="$style.parameterDetailsWrapper">
				<div :class="$style.parameterOptionsWrapper">
					<div></div>
					<ParameterOptions
						:parameter="focusedNodeParameter.parameter"
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
							parameterPath: focusedNodeParameter.parameterPath,
						}"
						@change="valueChanged($event.value)"
					/>
					<N8nInput
						v-else
						v-model="resolvedParameter.value"
						:class="$style.editor"
						type="textarea"
						resize="none"
						@change="valueChanged"
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

			.editor {
				display: flex;
				height: 100%;
				width: 100%;
				font-size: var(--font-size-xs);
			}
		}
	}
}
</style>
