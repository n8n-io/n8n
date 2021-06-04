<template>
	<div>
		<SlideTransition>
			<div class="node-creator" v-if="active" v-click-outside="closeCreator">
				<div class="border"></div>
				<div class="close-button clickable" @click="closeCreator" title="Close">
					<i class="el-icon-close"></i>
				</div>

				<MainPanel ref="list" @nodeTypeSelected="nodeTypeSelected"></MainPanel>
			</div>
		</SlideTransition>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';
import SlideTransition from '../transitions/SlideTransition.vue';

import MainPanel from './MainPanel.vue';

export default Vue.extend({
	name: 'NodeCreator',
	components: {
		MainPanel,
		SlideTransition,
	},
	props: [
		'active',
	],
	methods: {
		closeCreator () {
			this.$emit('closeNodeCreator');
		},
		nodeTypeSelected (nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
	},
});
</script>

<style scoped lang="scss">
/deep/ *, *:before, *:after {
	box-sizing: border-box;
}

.close-button {
	position: absolute;
	top: 0;
	left: -50px;
	color: $--node-creator-close-button-color;
	background-color: $--custom-header-background;
	border-radius: 18px 0 0 18px;
	z-index: 110;
	font-size: 1.7em;
	text-align: center;
	line-height: 50px;
	height: 50px;
	width: 50px;
	font-weight: 400;

	> i:hover {
			transform: scale(1.2);
	}
}

.node-creator {
	position: fixed;
	top: 65px;
	right: 0;
	width: $--node-creator-width;
	height: 100%;
	background-color: $--node-creator-background-color;
	z-index: 200;
	color: $--node-creator-text-color;
}

// todo
/deep/ .border {
	position: absolute;
	height: 100%;
	width: 100%;
	border-left: 1px solid $--node-creator-border-color;
	z-index: -1;
}

// todo
/deep/ .scrollable {
	overflow-y: auto;

	&::-webkit-scrollbar {
		display: none;
	}

	> div {
		padding-bottom: 30px;
	}
}

</style>
