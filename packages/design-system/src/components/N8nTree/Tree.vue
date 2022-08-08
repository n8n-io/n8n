<template>
	<div class="n8n-tree">
		<div v-for="row in parsedData" :style="getStyles(row)">
			<slot name="label" v-bind:label="row.label" />
			<span v-if="row.value">&nbsp:&nbsp;</span>
			<span v-if="row.value" :class="$style.value">{{ row.value }}</span>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nTreeNode from './TreeNode.vue';

const INDENT = 24;

export default Vue.extend({
	name: 'n8n-tree',
	props: {
		input: {
		},
		path: {
			type: String,
			default: '',
		},
	},
	computed: {
		parsedData() {
			const data = traverse(this.input);
			console.log(data);
			return data;
		},
	},
	methods: {
		getStyles(row) {
			return {marginLeft: `${INDENT * row.depth}px`};
		},
	},
});

function traverse(data, parsed = [], depth = 0) {
	Object.keys(data).forEach((label, i) => {
		const row = {
			label,
			depth,
		};
		parsed.push(row);
		if (typeof data[label] !== 'object') {
			row.value = data[label];
		}
		else {
			traverse(data[label], parsed, depth + 1);
		}
	});

	return parsed;
}

</script>

<style lang="scss" module>
.simple {
	text-indent: -24px;
	margin-left: var(--spacing-l);
}

.value {
	word-break: break-all;
}
</style>
