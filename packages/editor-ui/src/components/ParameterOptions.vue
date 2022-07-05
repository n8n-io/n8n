<template>
	<div>
		<el-dropdown
			v-if="displayOptionsComputed"
			trigger="click"
			@command="(opt) => $emit('optionSelected', opt)"
			size="mini"
		>
			<span class="el-dropdown-link">
				<font-awesome-icon
					icon="cogs"
					class="reset-icon clickable"
					:title="$locale.baseText('parameterInput.parameterOptions')"
				/>
			</span>
			<el-dropdown-menu slot="dropdown">
				<el-dropdown-item
					v-if="hasRemoteMethod"
					command="refreshOptions"
				>
					{{ $locale.baseText('parameterInput.refreshList') }}
				</el-dropdown-item>
				<el-dropdown-item
					command="resetValue"
					:disabled="isDefault"
				>
					{{ $locale.baseText('parameterInput.resetValue') }}
				</el-dropdown-item>
			</el-dropdown-menu>
		</el-dropdown>
		<n8n-radio-buttons
			v-if="parameter.noDataExpression !== true"
			size="small"
			:value="selectedView"
			@input="onViewSelected"
			:options="[
				{ label: $locale.baseText('parameterInput.fixed'), value: 'fixed'},
				{ label: $locale.baseText('parameterInput.expression'), value: 'expression'},
			]"
		/>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'ParameterOptions',
	props: [
		'parameter',
		'isReadOnly',
		'value',
		"showOptions",
	],
	computed: {
		isDefault (): boolean {
			return this.parameter.default === this.value;
		},
		displayOptionsComputed (): boolean {
			if (this.isReadOnly === true) {
				return false;
			}

			if (this.parameter.type === 'collection' || this.parameter.type === 'credentialsSelect') {
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
		isValueExpression () {
			if (this.parameter.noDataExpression === true) {
				return false;
			}
			if (typeof this.value === 'string' && this.value.charAt(0) === '=') {
				return true;
			}
			return false;
		},
		hasRemoteMethod (): boolean {
			return !!this.getArgument('loadOptionsMethod') || !!this.getArgument('loadOptions');
		},
	},
	methods: {
		onViewSelected(selected: string) {
			if (selected === 'expression' && !this.isValueExpression) {
				this.$emit('optionSelected', 'addExpression');
			}

			if (selected === 'fixed' && this.isValueExpression) {
				this.$emit('optionSelected', 'removeExpression');
			}
		},
		getArgument (argumentName: string): string | number | boolean | undefined {
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
