<template>
	<div class="node-creator-wrapper">
		<transition name="el-zoom-in-top">
			<div class="node-creator" v-show="active">
				<div class="close-button clickable close-on-click" @click="closeCreator" title="Close">
					<i class="el-icon-close close-on-click"></i>
				</div>
				<div class="header">
					Create Node
				</div>

				<node-create-list v-if="active" ref="list" @nodeTypeSelected="nodeTypeSelected"></node-create-list>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

import NodeCreateList from '@/components/NodeCreateList.vue';

export default Vue.extend({
	name: 'NodeCreator',
	components: {
		NodeCreateList,
	},
	props: [
		'active',
	],
	data () {
		return {
		};
	},
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
	width: 350px;
	height: calc(100% - 65px);
	background-color: #fff4f1;
	z-index: 200;
	color: #555;

	.header {
		font-size: 1.2em;
		margin: 20px 15px;
		height: 25px;
	}
}

</style>
