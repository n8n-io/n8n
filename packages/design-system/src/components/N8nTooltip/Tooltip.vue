<template>
	<el-tooltip v-bind="$attrs">
		<template v-for="(_, scopedSlotName) in $scopedSlots" #[scopedSlotName]="slotData">
			<slot :name="scopedSlotName" v-bind="slotData"/>
		</template>
		<template v-for="(_, slotName) in $slots" #[slotName]>
			<slot :name="slotName"/>
		</template>
	</el-tooltip>
</template>

<script lang="ts">
import Vue from "vue";
import ElTooltip from 'element-ui/lib/tooltip';

export default Vue.extend({
	name: 'n8n-tooltip',
	inheritAttrs: false,
	components: {
		ElTooltip, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
	},
});
</script>
