<template>
	<n8n-text size="small" color="text-light" class="hint" v-if="hint">
		<span ref="hint" v-html="hint"></span>
	</n8n-text>

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
