<script lang="ts">
import { ElOption } from 'element-plus';
import { defineComponent } from 'vue';

export default defineComponent({
	props: {
		...ElOption.props,
	},
	components: {
		ElOption,
	},
});
</script>

<template>
	<el-option v-bind="{ ...$props, ...$attrs }"><slot /></el-option>
</template>
