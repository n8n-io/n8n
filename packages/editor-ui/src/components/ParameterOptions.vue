<template>
	<div class="parameter-options" v-if="displayOptionsComputed">
		<el-dropdown trigger="click" @command="optionSelected" size="mini">
			<span class="el-dropdown-link">
				<font-awesome-icon icon="cogs" class="reset-icon clickable" :title="$locale.baseText('parameterInput.parameterOptions')"/>
			</span>
			<el-dropdown-menu slot="dropdown">
				<el-dropdown-item command="addExpression" v-if="parameter.noDataExpression !== true && !isValueExpression">{{ $locale.baseText('parameterInput.addExpression') }}</el-dropdown-item>
				<el-dropdown-item command="removeExpression" v-if="parameter.noDataExpression !== true && isValueExpression">{{ $locale.baseText('parameterInput.removeExpression') }}</el-dropdown-item>
				<el-dropdown-item command="refreshOptions" v-if="hasRemoteMethod">{{ $locale.baseText('parameterInput.refreshList') }}</el-dropdown-item>
				<el-dropdown-item command="resetValue" :disabled="isDefault" divided>{{ $locale.baseText('parameterInput.resetValue') }}</el-dropdown-item>
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

<style scoped lang="scss">
.parameter-options {
	width: 25px;
	text-align: right;
	float: right;
}
</style>
