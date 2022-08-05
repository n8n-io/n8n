<template>
	<div class="n8n-tree-node">
		<div v-if="isSimple(input)">{{ input }}</div>
		<div v-else v-for="(label, i) in Object.keys(input)" :key="i">
			<div :class="$style.simple" v-if="isSimple(input[label])">
				<span>{{ label }} :</span>
				<span>{{ input[label] }}</span>
			</div>
			<div v-else>
				<span>{{ label }}</span>
				<div :class="$style.indent">
					<n8n-tree-node :input="input[label]" />
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
	},
	computed: {
	},
	methods: {
		isSimple(data: unkown): boolean {
			return typeof data !== 'object';
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

</style>
