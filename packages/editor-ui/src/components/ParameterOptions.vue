<template>
	<div :class="$style.container">
		<n8n-action-toggle
			v-if="shouldShowOptions"
			placement="bottom-end"
			size="small"
			color="foreground-xdark"
			iconSize="small"
			:actions="actions"
			@action="(action) => $emit('optionSelected', action)"
			@visible-change="onMenuToggle"
		/>
		<n8n-radio-buttons
			v-if="parameter.noDataExpression !== true && showExpressionSelector"
			size="small"
			:value="selectedView"
			:disabled="isReadOnly"
			@input="onViewSelected"
			:options="[
				{ label: $locale.baseText('parameterInput.fixed'), value: 'fixed' },
				{ label: $locale.baseText('parameterInput.expression'), value: 'expression' },
			]"
		/>
	</div>
</template>

<script lang="ts">
import { NodeParameterValueType } from 'n8n-workflow';
import Vue, { PropType } from 'vue';
import { isValueExpression, isResourceLocatorValue } from '@/utils';

export default Vue.extend({
	name: 'parameter-options',
	props: {
		parameter: {
			type: Object,
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
	},
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
		shouldShowOptions(): boolean {
			if (this.isReadOnly === true) {
				return false;
			}

			if (this.parameter.type === 'collection' || this.parameter.type === 'credentialsSelect') {
				return false;
			}

			if (
				this.parameter.typeOptions &&
				this.parameter.typeOptions.editor &&
				this.parameter.typeOptions.editor === 'codeNodeEditor'
			) {
				return false;
			}

			if (this.showOptions === true) {
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
				this.$emit('optionSelected', this.isValueExpression ? 'openExpression' : 'addExpression');
			}

			if (selected === 'fixed' && this.isValueExpression) {
				this.$emit('optionSelected', 'removeExpression');
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
}
</style>
