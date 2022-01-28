<template>
	<div :class="$style.list">
		<div :class="$style.container" v-for="node in nodes.slice(0, 4)" :key="node.name">
			<img
				v-if="node.iconData.fileBuffer"
				:class="$style.image"
				:src="node.iconData.fileBuffer"
			/>
			<FontAwesomeIcon v-else :icon="node.iconData.icon" :color="node.defaults.color" />
		</div>
		<div :class="$style.nodes" v-if="nodes.length > 4">+{{ nodes.length - 4 }}</div>
	</div>
</template>

<script lang="ts">
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplateCard',
	props: {
		nodes: Array,
	},
	components: {
		FontAwesomeIcon,
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

	.container {
		width: 16px;
		height: 16px;
		margin-left: 10px;
		position: relative;
		display: block;

		.image {
			width: 16px;
			height: 16px;
			display: block;
		}
	}

	.nodes {
		width: 20px;
		height: 20px;
		margin-left: 10px;
		padding: 3px;
		display: block;
		background: #f8f9fb;
		border: 1px solid #dbdfe7;
		border-radius: 4px;
		font-weight: 600;
		font-size: 10px;
	}
}
</style>
