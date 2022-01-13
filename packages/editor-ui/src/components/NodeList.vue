<template>
		<div :class="$style.nodeList">
			<div :class="$style.nodeContainer" v-for="node in nodes.slice(0,4)" :key="node.name">
				<img v-if="node.iconData.fileBuffer" :class="$style.nodeImage" :src="node.iconData.fileBuffer">
				<FontAwesomeIcon v-else :icon="node.iconData.icon" :color="node.defaults.color"/>
			</div>
			<div :class="$style.plusNodes" v-if="nodes.length > 4 && showMore">+{{nodes.length-4}}</div>
		</div>

</template>

<script lang="ts">

import mixins from 'vue-typed-mixins';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';


export default mixins(
	genericHelpers,
).extend({
	name: 'TemplateCard',
	props: {
		nodes: Array,
		showMore: Boolean,
	},
	components: {
		FontAwesomeIcon,
	},
});
</script>

<style lang="scss" module>

.nodeList {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	height: 20px;
	max-width: 100px;

	.nodeContainer {
		position: relative;
		display:block;
		width: 16px;
		height: 16px;
		margin-left: 10px;

		.nodeImage {
			display: block;
			width: 16px;
			height: 16px;
		}
	}

	.plusNodes {
		display: block;
		background: #F8F9FB;
		border: 1px solid #DBDFE7;
		border-radius: 4px;
		font-weight: 600;
		font-size: 10px;
		height: 20px;
		width: 20px;
		padding: 3px;
		margin-left: 10px;
	}

}


</style>
