<template>
	<div :class="$style.container">
		<div v-if="loading" :class="$style.loader">
			<n8n-text v-if="loading" size="small">
				<n8n-icon icon="sync-alt" size="xsmall" :spin="true" />
				{{ loadingMessage }}
			</n8n-text>
		</div>
		<div v-else :class="$style.controlsContainer">
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
					{ label: $locale.baseText('parameterInput.fixed'), value: 'fixed' },
					{ label: $locale.baseText('parameterInput.expression'), value: 'expression' },
				]"
				@update:model-value="onViewSelected"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import type { INodeProperties, NodeParameterValueType } from 'n8n-workflow';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { isResourceLocatorValue } from '@/utils/typeGuards';
import { isValueExpression } from '@/utils/nodeTypesUtils';
import { i18n } from '@/plugins/i18n';

export default defineComponent({
	name: 'ParameterOptions',
	props: {
		parameter: {
			type: Object as PropType<INodeProperties>,
			required: true,
		},
		isReadOnly: {
			type: Boolean,
		},
		value: {
			type: [Object, String, Number, Boolean, Array] as PropType<NodeParameterValueType>,
		},
		showOptions: {
			type: Boolean,
			default: true,
		},
		showExpressionSelector: {
			type: Boolean,
			default: true,
		},
		customActions: {
			type: Array as PropType<Array<{ label: string; value: string; disabled?: boolean }>>,
			default: () => [],
		},
		iconOrientation: {
			type: String,
			default: 'vertical',
			validator: (value: string): boolean => ['horizontal', 'vertical'].includes(value),
		},
		loading: {
			type: Boolean,
			default: false,
		},
		loadingMessage: {
			type: String,
			default() {
				return i18n.baseText('genericHelpers.loading');
			},
		},
	},
	emits: ['update:modelValue', 'menu-expanded'],
	computed: {
		isDefault(): boolean {
			return this.parameter.default === this.value;
		},
		isValueExpression(): boolean {
			return isValueExpression(this.parameter, this.value);
		},
		isHtmlEditor(): boolean {
			return this.getArgument('editor') === 'htmlEditor';
		},
		shouldShowExpressionSelector(): boolean {
			return this.parameter.noDataExpression !== true && this.showExpressionSelector;
		},
		shouldShowOptions(): boolean {
			if (this.isReadOnly) {
				return false;
			}

			if (this.parameter.type === 'collection' || this.parameter.type === 'credentialsSelect') {
				return false;
			}

			if (['codeNodeEditor', 'sqlEditor'].includes(this.parameter.typeOptions?.editor ?? '')) {
				return false;
			}

			if (this.showOptions) {
				return true;
			}

			return false;
		},
		selectedView() {
			if (this.isValueExpression) {
				return 'expression';
			}

			return 'fixed';
		},
		hasRemoteMethod(): boolean {
			return !!this.getArgument('loadOptionsMethod') || !!this.getArgument('loadOptions');
		},
		actions(): Array<{ label: string; value: string; disabled?: boolean }> {
			if (Array.isArray(this.customActions) && this.customActions.length > 0) {
				return this.customActions;
			}

			if (this.isHtmlEditor && !this.isValueExpression) {
				return [
					{
						label: this.$locale.baseText('parameterInput.formatHtml'),
						value: 'formatHtml',
					},
				];
			}

			const actions = [
				{
					label: this.$locale.baseText('parameterInput.resetValue'),
					value: 'resetValue',
					disabled: this.isDefault,
				},
			];

			if (
				this.hasRemoteMethod ||
				(this.parameter.type === 'resourceLocator' &&
					isResourceLocatorValue(this.value) &&
					this.value.mode === 'list')
			) {
				return [
					{
						label: this.$locale.baseText('parameterInput.refreshList'),
						value: 'refreshOptions',
					},
					...actions,
				];
			}

			return actions;
		},
	},
	methods: {
		onMenuToggle(visible: boolean) {
			this.$emit('menu-expanded', visible);
		},
		onViewSelected(selected: string) {
			if (selected === 'expression') {
				this.$emit(
					'update:modelValue',
					this.isValueExpression ? 'openExpression' : 'addExpression',
				);
			}

			if (selected === 'fixed' && this.isValueExpression) {
				this.$emit('update:modelValue', 'removeExpression');
			}
		},
		getArgument(argumentName: string): string | number | boolean | undefined {
			if (this.parameter.typeOptions === undefined) {
				return undefined;
			}

			if (this.parameter.typeOptions[argumentName] === undefined) {
				return undefined;
			}

			return this.parameter.typeOptions[argumentName];
		},
	},
});
</script>

<style lang="scss" module>
.container {
	display: flex;
	min-height: 22px;
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
</style>
