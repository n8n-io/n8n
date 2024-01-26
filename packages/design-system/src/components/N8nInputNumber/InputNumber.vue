<script lang="ts">
import { ElInputNumber } from 'element-plus';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'N8nInputNumber',
	components: {
		ElInputNumber,
	},
	props: {
		...ElInputNumber.props,
	},
});
</script>

<template>
	<ElInputNumber v-bind="{ ...$props, ...$attrs }" />
</template>
