<template>
	<div>
		<n8n-text size="xsmall" color="text-base" v-if="hint">
			<div ref="hint" v-html="hint"></div>
		</n8n-text>
	</div>
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

