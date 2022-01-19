<template>
	<div class="hint" ref="hint" v-if="hint" v-html="hint"></div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	name: 'InputHint',
	props: ['hint'],
	mounted(){
		if(this.$refs.hint){
			(this.$refs.hint as Element).querySelectorAll('a').forEach(a => a.target = "_blank");
		}
	},
});
</script>

<style scoped lang="scss">
.hint {
	margin-top: var(--spacing-2xs);
	color: var(--custom-font-very-light);
	font-size: var(--font-size-3xs);
	font-weight: var(--font-weight-regular);

	a {
		color: var(--color-danger);
		text-decoration: underline;
	}
}
</style>

