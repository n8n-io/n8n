<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import {
	isResourceLocatorValue,
	type INodeProperties,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { isValueExpression } from '@/utils/nodeTypesUtils';
import { computed } from 'vue';
import { useNDVStore } from '@/stores/ndv.store';
import { AI_TRANSFORM_NODE_TYPE } from '@/constants';
import { getParameterTypeOption } from '@/utils/nodeSettingsUtils';

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
}

const props = withDefaults(defineProps<Props>(), {
	showOptions: true,
	showExpressionSelector: true,
	customActions: () => [],
	iconOrientation: 'vertical',
	loading: false,
	loadingMessage: () => useI18n().baseText('genericHelpers.loading'),
	isContentOverridden: false,
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
const isHtmlEditor = computed(
	() => getParameterTypeOption(props.parameter, 'editor') === 'htmlEditor',
);
const shouldShowExpressionSelector = computed(
	() => !props.parameter.noDataExpression && props.showExpressionSelector && !props.isReadOnly,
);

const canBeOpenedInFocusPanel = computed(
	() =>
		!props.parameter.isNodeSetting &&
		!props.isReadOnly &&
		!props.isContentOverridden &&
		activeNode.value && // checking that it's inside ndv
		(props.parameter.type === 'string' || props.parameter.type === 'json'),
);

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

	if (isHtmlEditor.value && !isValueAnExpression.value) {
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
			<n8n-text v-if="loading" size="small">
				<n8n-icon icon="refresh-cw" size="xsmall" :spin="true" />
				{{ loadingMessage }}
			</n8n-text>
		</div>
		<div v-else :class="$style.controlsContainer">
			<N8nTooltip v-if="canBeOpenedInFocusPanel">
				<template #content>{{ i18n.baseText('parameterInput.focusParameter') }}</template>
				<N8nIcon
					size="medium"
					:icon="'panel-right'"
					:class="$style.focusButton"
					@click="$emit('update:modelValue', 'focus')"
				/>
			</N8nTooltip>
			<div
				:class="{
					[$style.noExpressionSelector]: !shouldShowExpressionSelector,
				}"
			>
				<n8n-action-toggle
					v-if="shouldShowOptions"
					placement="bottom-end"
					size="small"
					color="foreground-xdark"
					icon-size="small"
					:actions="actions"
					:icon-orientation="iconOrientation"
					@action="(action: string) => $emit('update:modelValue', action)"
					@visible-change="onMenuToggle"
				/>
			</div>
			<n8n-radio-buttons
				v-if="shouldShowExpressionSelector"
				size="small"
				:model-value="selectedView"
				:disabled="isReadOnly"
				:options="[
					{ label: i18n.baseText('parameterInput.fixed'), value: 'fixed' },
					{ label: i18n.baseText('parameterInput.expression'), value: 'expression' },
				]"
				@update:model-value="onViewSelected"
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
	padding-bottom: var(--spacing-4xs);

	& > span {
		line-height: 1em;
	}
}
.controlsContainer {
	display: flex;
	align-items: center;
	flex-direction: row;
}

.noExpressionSelector {
	margin-bottom: var(--spacing-4xs);

	span {
		padding-right: 0 !important;
	}
}

.focusButton {
	&:hover {
		cursor: pointer;
		color: var(--color-primary);
	}
}
</style>
