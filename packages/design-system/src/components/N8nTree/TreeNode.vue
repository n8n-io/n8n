<template>
	<div class="n8n-tree-node">
		<div v-for="(label, i) in Object.keys(input)" :key="i" :class="{[$style.indent]: depth > 0}">
			<div :class="$style.simple" v-if="isSimple(input[label])">
				<slot name="label" v-bind:label="label" v-bind:path="getPath(label)" />
				<span>&nbsp:&nbsp;</span>
				<span :class="$style.value">{{ input[label] }}</span>
			</div>
			<div v-else>
				<slot name="label" v-bind:label="label" v-bind:path="getPath(label)" />
				<n8n-tree-node :path="getPath(label)" :depth="depth + 1" :input="input[label]">
					<template v-for="(index, name) in $scopedSlots" v-slot:[name]="data">
						<slot :name="name" v-bind="data"></slot>
					</template>
				</n8n-tree-node>
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
		},
		path: {
			type: Array,
			default: () => [],
		},
		depth: {
			type: Number,
			default: 0,
		},
	},
	methods: {
		isSimple(data: unkown): boolean {
			return typeof data !== 'object';
		},
		getPath(key: string): string[] {
			if (Array.isArray(this.input)) {
				return [...this.path, parseInt(key, 10)];
			}
			return [...this.path, key];
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
