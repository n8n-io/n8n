<template>
	<div :class="$style.list">
		<div v-for="node in slicedNodes" :class="$style.container" :key="node.name">
			<HoverableNodeIcon :nodeType="node" :size="nodeSize" :title="node.name" />
		</div>
		<div :class="$style.button" v-if="filteredCoreNodes.length > nodesToBeShown + 1">
			+{{ hiddenNodes }}
		</div>
	</div>
</template>

<script lang="ts">
import HoverableNodeIcon from '@/components/HoverableNodeIcon.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { IVersionNode } from '@/Interface';

import mixins from 'vue-typed-mixins';
import { filterTemplateNodes } from './helpers';

export default mixins(genericHelpers).extend({
	name: 'NodeList',
	props: {
		nodes: {
			type: Array,
		},
		nodesToBeShown: {
			type: Number,
			default: 4,
		},
		nodeSize: {
			type: Number,
			default: 18,
		},
	},
	components: {
		HoverableNodeIcon,
	},
	computed: {
		filteredCoreNodes() {
			return filterTemplateNodes(this.nodes as IVersionNode[]);
		},
		hiddenNodes(): number {
			return this.filteredCoreNodes.length - this.countNodesToBeSliced(this.filteredCoreNodes);
		},
		slicedNodes(): IVersionNode[] {
			return this.filteredCoreNodes.slice(0, this.countNodesToBeSliced(this.filteredCoreNodes));
		},
	},
	methods: {
		countNodesToBeSliced(nodes: IVersionNode[]): number {
			if (nodes.length > this.nodesToBeShown) {
				return this.nodesToBeShown - 1;
			} else {
				return this.nodesToBeShown;
			}
		},
	},
});
</script>

<style lang="scss" module>
.list {
	max-width: 100px;
	height: 20px;
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
}

.container {
	width: 18px;
	height: 18px;
	margin-left: var(--spacing-2xs);
	position: relative;
	display: block;
}

.image {
	width: 18px;
	height: 18px;
	display: block;
}

.button {
	width: 20px;
	min-width: 20px;
	height: 20px;
	margin-left: var(--spacing-2xs);
	top: 0px;
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	background: var(--color-background-light);
	border: 1px var(--color-foreground-base) solid;
	border-radius: var(--border-radius-base);
	font-size: 10px;
	font-weight: var(--font-weight-bold);
	color: var(--color-text-base);
}
</style>
