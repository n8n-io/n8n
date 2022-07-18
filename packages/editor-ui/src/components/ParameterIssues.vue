<template>
	<div :class="$style['parameter-issues']" v-if="issues.length">
		<n8n-tooltip placement="top" >
			<div slot="content" v-html="`${$locale.baseText('parameterInput.issues')}:<br />&nbsp;&nbsp;- ` + issues.join('<br />&nbsp;&nbsp;- ')"></div>
			<font-awesome-icon icon="exclamation-triangle" />
		</n8n-tooltip>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'ParameterIssues',
	props: [
		'issues',
	],
});
</script>

<style module lang="scss">
.parameter-issues {
	width: 20px;
	text-align: right;
	float: right;
	color: #ff8080;
	font-size: var(--font-size-s);
	padding-left: var(--spacing-4xs);
}
</style>
