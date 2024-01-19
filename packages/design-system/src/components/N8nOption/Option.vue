<script lang="ts">
import { ElOption } from 'element-plus';
import { defineComponent } from 'vue';

export default defineComponent({
	components: {
		ElOption,
	},
	props: {
		...ElOption.props,
	},
});
</script>

<template>
	<ElOption v-bind="{ ...$props, ...$attrs }"><slot /></ElOption>
</template>
