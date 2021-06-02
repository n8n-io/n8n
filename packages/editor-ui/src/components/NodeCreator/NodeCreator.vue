<template>
	<div class="node-creator-wrapper">
		<SlideTransition>
			<div class="node-creator" v-if="active" v-click-outside="closeCreator">
				<div class="border"></div>
				<div class="close-button clickable close-on-click" @click="closeCreator" title="Close">
					<i class="el-icon-close close-on-click"></i>
				</div>

				<node-create-list ref="list" @nodeTypeSelected="nodeTypeSelected"></node-create-list>
			</div>
		</SlideTransition>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';
import SlideTransition from '../transitions/SlideTransition.vue';

import NodeCreateList from './NodeCreateList.vue';

export default Vue.extend({
	name: 'NodeCreator',
	components: {
		NodeCreateList,
		SlideTransition,
	},
	props: [
		'active',
	],
	watch: {
		active (newValue, oldValue) {
			if (newValue === true) {
				// Try to set focus directly on the filter-input-field
				setTimeout(() => {
					// @ts-ignore
					if (this.$refs.list && this.$refs.list.$refs.inputField) {
						// @ts-ignore
						this.$refs.list.$refs.inputField.focus();
					}
				});
			}
		},
	},
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
	color: #fff;
	background-color: $--custom-header-background;
	border-radius: 18px 0 0 18px;
	z-index: 110;
	font-size: 1.7em;
	text-align: center;
	line-height: 50px;
	height: 50px;
	width: 50px;

	.close-on-click {
		color: #fff;
		font-weight: 400;

		&:hover {
			transform: scale(1.2);
		}
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
	color: #555;
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
