<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import {
	isResourceLocatorValue,
	type INodeProperties,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { isValueExpression } from '@/app/utils/nodeTypesUtils';
import { computed } from 'vue';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { AI_TRANSFORM_NODE_TYPE } from '@/app/constants/nodeTypes';
import { getParameterTypeOption } from '@/features/ndv/shared/ndv.utils';
import { useIsInExperimentalNdv } from '@/features/workflows/canvas/experimental/composables/useIsInExperimentalNdv';
import { useExperimentalNdvStore } from '@/features/workflows/canvas/experimental/experimentalNdv.store';

import {
	N8nActionToggle,
	N8nIcon,
	N8nIconButton,
	N8nRadioButtons,
	N8nText,
} from '@n8n/design-system';
interface Props {
	parameter: INodeProperties;
	isReadOnly: boolean;
	value: NodeParameterValueType;
	showOptions?: boolean;
	showExpressionSelector?: boolean;
	customActions?: Array<{ label: string; value: string; disabled?: boolean }>;
	iconOrientation?: 'horizontal' | 'vertical';
	loading?: boolean;
	loadingMessage?: string;
	isContentOverridden?: boolean;
	showDelete?: boolean;
	onDelete?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
	showOptions: true,
	showExpressionSelector: true,
	customActions: () => [],
	iconOrientation: 'vertical',
	loading: false,
	loadingMessage: () => useI18n().baseText('genericHelpers.loading'),
	isContentOverridden: false,
	showDelete: false,
	onDelete: undefined,
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	'menu-expanded': [visible: boolean];
}>();

const i18n = useI18n();
const ndvStore = useNDVStore();

const activeNode = computed(() => ndvStore.activeNode);
const isDefault = computed(() => props.parameter.default === props.value);
const isValueAnExpression = computed(() => isValueExpression(props.parameter, props.value));
const editor = computed(() => getParameterTypeOption(props.parameter, 'editor'));
const shouldShowExpressionSelector = computed(
	() => !props.parameter.noDataExpression && props.showExpressionSelector && !props.isReadOnly,
);
const isInEmbeddedNdv = useIsInExperimentalNdv();
const experimentalNdvStore = useExperimentalNdvStore();

const canBeOpenedInFocusPanel = computed(() => {
	if (props.parameter.isNodeSetting || props.isReadOnly || props.isContentOverridden) {
		return false;
	}

	if (!activeNode.value && !isInEmbeddedNdv.value) {
		// The current parameter is focused parameter in focus panel
		return false;
	}

	if (experimentalNdvStore.isNdvInFocusPanelEnabled) {
		return (props.parameter.typeOptions?.rows ?? 1) > 1 || editor.value !== undefined;
	}

	return props.parameter.type === 'string' || props.parameter.type === 'json';
});

const shouldShowOptions = computed(() => {
	if (props.isReadOnly) {
		return false;
	}

	if (props.parameter.type === 'collection' || props.parameter.type === 'credentialsSelect') {
		return false;
	}

	if (['codeNodeEditor', 'sqlEditor'].includes(props.parameter.typeOptions?.editor ?? '')) {
		return false;
	}

	if (props.showOptions) {
		return true;
	}

	return false;
});
const selectedView = computed(() => (isValueAnExpression.value ? 'expression' : 'fixed'));
const hasRemoteMethod = computed(
	() =>
		!!props.parameter.typeOptions?.loadOptionsMethod || !!props.parameter.typeOptions?.loadOptions,
);
const resetValueLabel = computed(() => {
	if (activeNode.value && [AI_TRANSFORM_NODE_TYPE].includes(activeNode.value.type)) {
		return i18n.baseText('parameterInput.clearContents');
	}

	return i18n.baseText('parameterInput.resetValue');
});

const actions = computed(() => {
	if (Array.isArray(props.customActions) && props.customActions.length > 0) {
		return props.customActions;
	}

	if (editor.value === 'htmlEditor' && !isValueAnExpression.value) {
		return [
			{
				label: i18n.baseText('parameterInput.formatHtml'),
				value: 'formatHtml',
			},
		];
	}

	const resetAction = {
		label: resetValueLabel.value,
		value: 'resetValue',
		disabled: isDefault.value,
	};

	// The reset value action is not working correctly for these
	const hasResetAction = !['codeNodeEditor', 'sqlEditor'].includes(
		props.parameter.typeOptions?.editor ?? '',
	);

	const parameterActions = [hasResetAction ? resetAction : []].flat();

	if (
		hasRemoteMethod.value ||
		(props.parameter.type === 'resourceLocator' &&
			isResourceLocatorValue(props.value) &&
			props.value.mode === 'list')
	) {
		return [
			{
				label: i18n.baseText('parameterInput.refreshList'),
				value: 'refreshOptions',
			},
			...parameterActions,
		];
	}

	return parameterActions;
});

const onMenuToggle = (visible: boolean) => emit('menu-expanded', visible);
const onViewSelected = (selected: string) => {
	if (selected === 'expression') {
		emit('update:modelValue', isValueAnExpression.value ? 'openExpression' : 'addExpression');
	}

	if (selected === 'fixed' && isValueAnExpression.value) {
		emit('update:modelValue', 'removeExpression');
	}
};
</script>

<template>
	<div :class="$style.container" data-test-id="parameter-options-container">
		<div v-if="loading" :class="$style.loader" data-test-id="parameter-options-loader">
			<N8nText v-if="loading" size="small">
				<N8nIcon icon="refresh-cw" size="xsmall" :spin="true" />
				{{ loadingMessage }}
			</N8nText>
		</div>
		<div v-else :class="$style.controlsContainer">
			<N8nIconButton
				v-if="canBeOpenedInFocusPanel"
				type="tertiary"
				text
				size="small"
				icon-size="large"
				icon="panel-right"
				:class="$style.focusButton"
				:title="i18n.baseText('parameterInput.focusParameter')"
				data-test-id="parameter-focus-button"
				@click="$emit('update:modelValue', 'focus')"
			/>

			<div>
				<N8nActionToggle
					v-if="shouldShowOptions"
					placement="bottom-end"
					size="small"
					theme="dark"
					icon-size="large"
					:actions="actions"
					:icon-orientation="iconOrientation"
					@action="(action: string) => $emit('update:modelValue', action)"
					@visible-change="onMenuToggle"
				/>
			</div>

			<N8nRadioButtons
				v-if="shouldShowExpressionSelector"
				size="small"
				:class="$style.expressionSwitch"
				:model-value="selectedView"
				:disabled="isReadOnly"
				:options="[
					{ label: i18n.baseText('parameterInput.fixed'), value: 'fixed' },
					{ label: i18n.baseText('parameterInput.expression'), value: 'expression' },
				]"
				@update:model-value="onViewSelected"
			/>

			<N8nIconButton
				v-if="showDelete && onDelete"
				type="tertiary"
				text
				size="small"
				icon-size="large"
				icon="trash-2"
				:class="$style.deleteButton"
				:title="i18n.baseText('parameterInputList.delete')"
				data-test-id="parameter-delete-button"
				@click="onDelete"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
$container-height: 22px;

.container {
	display: flex;
	min-height: $container-height;
	max-height: $container-height;
}

.loader {
	padding-bottom: var(--spacing--4xs);

	& > span {
		line-height: 1em;
	}
}
.controlsContainer {
	display: flex;
	align-items: center;
	flex-direction: row;
}

.expressionSwitch {
	margin-right: var(--spacing--4xs);
}

.focusButton {
	color: var(--color--text--shade-1);

	&:hover {
		color: var(--color--primary);
	}
}

.deleteButton {
	color: var(--color--text--shade-1);

	&:hover {
		color: var(--color--danger);
	}
}
</style>
