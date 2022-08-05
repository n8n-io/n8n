<template>
	<div class="n8n-tree-node">
		<div v-for="(label, i) in Object.keys(input)" :key="i" :class="{[$style.indent]: depth > 0}">
			<div :class="$style.simple" v-if="isSimple(input[label])">
				<span>{{ label }} :&nbsp;</span>
				<span :class="$style.value">{{ input[label] }}</span>
			</div>
			<div v-else>
				<span>{{ label }}</span>
				<div>
					<n8n-tree-node :path="getPath(label)" :depth="depth + 1" :input="input[label]" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-tree-node',
	components: {
	},
	props: {
		input: {
			type: Object,
		},
		path: {
			type: String,
			default: '',
		},
		depth: {
			type: Number,
			default: 0,
		},
	},
	computed: {
	},
	methods: {
		isSimple(data: unkown): boolean {
			return typeof data !== 'object';
		},
		getPath(key: string): string {
			return `${this.path}["${key}"]`;
		},
	},
});
</script>

<style lang="scss" module>
.indent {
	margin-left: var(--spacing-l);
}

.simple {
	text-indent: -24px;
	margin-left: var(--spacing-l);
}


.value {
	word-break: break-all;
}

</style>
