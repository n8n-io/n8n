<script lang="ts">
import { ElInputNumber } from 'element-plus';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'N8nInputNumber',
	props: {
		...ElInputNumber.props,
	},
	components: {
		ElInputNumber,
	},
});
</script>

<template>
	<el-input-number v-bind="{ ...$props, ...$attrs }" />
</template>
