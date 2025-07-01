<script setup lang="ts">
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { N8nText, N8nInput } from '@n8n/design-system';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { isValueExpression } from '@/utils/nodeTypesUtils';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useWorkflowsStore } from '@/stores/workflows.store';

defineOptions({ name: 'FocusPanel' });

const props = defineProps<{
	executable: boolean;
}>();

const locale = useI18n();
const nodeHelpers = useNodeHelpers();
const focusPanelStore = useFocusPanelStore();
const workflowStore = useWorkflowsStore();

const focusedNodeParameter = computed(() => focusPanelStore.focusedNodeParameters[0]);

const focusPanelActive = computed(() => focusPanelStore.focusPanelActive);

const _node = computed(() => workflowStore.getNodeByName(focusedNodeParameter.value.nodeName));

const isExecutable = computed(() => {
	const foreignCredentials = nodeHelpers.getForeignCredentialsIfSharingEnabled(
		_node.value?.credentials,
	);
	return nodeHelpers.isNodeExecutable(_node.value, props.executable, foreignCredentials);
});

const expressionModeEnabled = computed(
	() =>
		focusedNodeParameter.value &&
		isValueExpression(focusedNodeParameter.value.parameter, focusedNodeParameter.value.value),
);

function optionSelected() {
	// TODO: Handle the option selected (command: string) from the dropdown
}

function valueChanged() {
	// TODO: Update parameter value
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
		<div v-if="focusedNodeParameter" :class="$style.content">
			<div :class="$style.tabHeader">
				<div :class="$style.tabHeaderText">
					<N8nText color="text-dark" size="small">
						{{ focusedNodeParameter.parameter.displayName }}
					</N8nText>
					<N8nText color="text-base" size="xsmall">{{ focusedNodeParameter.nodeName }}</N8nText>
				</div>
				<NodeExecuteButton
					data-test-id="node-execute-button"
					:node-name="focusedNodeParameter.nodeName"
					:tooltip="`Execute ${focusedNodeParameter.nodeName}`"
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
						:parameter="focusedNodeParameter.parameter"
						:value="focusedNodeParameter.value"
						:is-read-only="false"
						@update:model-value="optionSelected"
					/>
				</div>
				<div :class="$style.editorContainer">
					<ExpressionEditorModalInput
						v-if="expressionModeEnabled"
						:model-value="focusedNodeParameter.value"
						:class="$style.editor"
						:is-read-only="false"
						:path="focusedNodeParameter.parameterPath"
						data-test-id="expression-modal-input"
						:target-node-parameter-context="{
							nodeName: focusedNodeParameter.nodeName,
							parameterPath: focusedNodeParameter.parameterPath,
						}"
						@change="valueChanged"
					/>
					<N8nInput
						v-else
						v-model="focusedNodeParameter.value"
						:class="$style.editor"
						type="textarea"
						resize="none"
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
