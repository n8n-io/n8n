<template>
	<el-tooltip  content=" " :placement="placement" >
		<div slot="content"><slot /></div>
		<n8n-icon icon="exclamation-triangle" theme="danger" />
	</el-tooltip>
</template>

<script lang="ts">
import Vue from 'vue';

import ElTooltip from 'element-ui/lib/tooltip';
import N8nIcon from '../N8nIcon';

export default Vue.extend({
	name: 'n8n-warning-tooltip',
	components: {
		N8nIcon,
		ElTooltip,
	},
	props: {
		placement: {
			type: String,
			default: 'top',
		},
	},
});
</script>

