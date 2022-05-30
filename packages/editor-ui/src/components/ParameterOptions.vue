<template>
	<div :class="$style['parameter-options']">
		<el-dropdown
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
					v-if="parameter.noDataExpression !== true && !isValueExpression"
					command="addExpression"
				>
					{{ $locale.baseText('parameterInput.addExpression') }}
				</el-dropdown-item>
				<el-dropdown-item
					v-if="parameter.noDataExpression !== true && isValueExpression"
					command="removeExpression"
				>
					{{ $locale.baseText('parameterInput.removeExpression') }}
				</el-dropdown-item>
				<el-dropdown-item
					v-if="hasRemoteMethod"
					command="refreshOptions"
				>
					{{ $locale.baseText('parameterInput.refreshList') }}
				</el-dropdown-item>
				<el-dropdown-item
					command="resetValue"
					:disabled="isDefault"
					divided
				>
					{{ $locale.baseText('parameterInput.resetValue') }}
				</el-dropdown-item>
			</el-dropdown-menu>
		</el-dropdown>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'ParameterOptions',
	props: [
		'displayOptionsComputed',
		'optionSelected',
		'parameter',
		'isValueExpression',
		'isDefault',
		'hasRemoteMethod',
	],
});
</script>

<style module lang="scss">
.parameter-options {
	width: 25px;
	text-align: right;
	float: right;
}
</style>
