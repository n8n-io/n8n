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
					iconSize="small"
					:actions="actions"
					:iconOrientation="iconOrientation"
					@action="(action) => $emit('optionSelected', action)"
					@visible-change="onMenuToggle"
				/>
			</div>
			<n8n-radio-buttons
				v-if="shouldShowExpressionSelector"
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
	</div>
</template>

<script lang="ts">
import type { NodeParameterValueType } from 'n8n-workflow';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { isValueExpression, isResourceLocatorValue } from '@/utils';

export default defineComponent({
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
				return this.$locale.baseText('genericHelpers.loading');
			},
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
		shouldShowExpressionSelector(): boolean {
			return this.parameter.noDataExpression !== true && this.showExpressionSelector;
		},
		shouldShowOptions(): boolean {
			if (this.isReadOnly === true) {
				return false;
			}

			if (this.parameter.type === 'collection' || this.parameter.type === 'credentialsSelect') {
				return false;
			}

			if (this.parameter.typeOptions?.editor === 'codeNodeEditor') {
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
.loader > span {
	line-height: 1em;
}

.controlsContainer {
	display: flex;
}

.noExpressionSelector {
	margin-bottom: var(--spacing-4xs);

	span {
		padding-right: 0 !important;
	}
}
</style>
