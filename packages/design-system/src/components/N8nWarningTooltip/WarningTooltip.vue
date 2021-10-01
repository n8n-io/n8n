<template>
	<el-tooltip  content=" " :placement="placement" >h
		<div slot="content"><slot /></div>
		<n8n-icon :class="$style['icon']" icon="exclamation-triangle"></n8n-icon>
	</el-tooltip>
</template>

<script lang="ts">
import Vue from 'vue';

import ElTooltip from 'element-ui/lib/tooltip';
import N8nTooltip from '../N8nTooltip';
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

<style lang="scss" module>
	.icon {
		font-size: 14px;
		height: 18px;
		color: $--warning-tooltip-color;
	}
</style>
