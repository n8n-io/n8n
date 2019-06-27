<template>
	<transition name="el-fade-in">
		<div class="data-display-wrapper close-on-click" v-show="node" @click="close">
			<div class="data-display" >
				<NodeSettings @valueChanged="valueChanged" />
				<RunData />
				<div class="close-button clickable close-on-click" @click="close" title="Close">
					<i class="el-icon-close close-on-click"></i>
				</div>
			</div>
		</div>
	</transition>
</template>

<script lang="ts">

import Vue from 'vue';

import {
	IRunData,
} from 'n8n-workflow';
import {
	INodeUi,
	IUpdateInformation,
} from '../Interface';

import NodeSettings from '@/components/NodeSettings.vue';
import RunData from '@/components/RunData.vue';

export default Vue.extend({
	name: 'DataDisplay',
	components: {
		NodeSettings,
		RunData,
	},
	computed: {
		node (): INodeUi {
			return this.$store.getters.activeNode;
		},
	},
	methods: {
		valueChanged (parameterData: IUpdateInformation) {
			this.$emit('valueChanged', parameterData);
		},
		nodeTypeSelected (nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
		close (e: MouseEvent) {
			// @ts-ignore
			if (e.target.className && e.target.className.includes && e.target.className.includes('close-on-click')) {
				this.$store.commit('setActiveNode', null);
			}
		},
	},
});
</script>

<style lang="scss">

.data-display-wrapper {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 20;
	background-color: #9d8d9dd8;

	.close-button {
		position: absolute;
		top: 0;
		right: -50px;
		color: #fff;
		background-color: $--custom-header-background;
		border-radius: 0 18px 18px 0;
		z-index: 110;
		font-size: 1.7em;
		text-align: center;
		line-height: 50px;
		height: 50px;
		width: 50px;

		.close-on-click {
			color: #fff;
			font-weight: 400;
		}

		.close-on-click:hover {
			transform: scale(1.2);
		}
	}

	.data-display {
		position: relative;
		width: 80%;
		height: 80%;
		margin: 6em auto;
		background-color: #fff;
		border-radius: 2px;
		@media (max-height: 720px) {
			margin: 1em auto;
			height: 95%;
		}
	}
}

</style>
