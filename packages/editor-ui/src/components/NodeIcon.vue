<template>
	<div class="node-icon-wrapper" :style="iconStyleData" :class="{full: isSvgIcon}">
		<div v-if="nodeIconData !== null" class="icon">
			<img :src="nodeIconData.path" style="width: 100%; height: 100%;" v-if="nodeIconData.type === 'file'"/>
			<font-awesome-icon :icon="nodeIconData.path" v-else-if="nodeIconData.type === 'fa'" />
		</div>
		<div v-else class="node-icon-placeholder">
			{{nodeType !== null ? nodeType.displayName.charAt(0) : '?' }}
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

interface NodeIconData {
	type: string;
	path: string;
	fileExtension?: string;
}

export default Vue.extend({
	name: 'NodeIcon',
	props: [
		'nodeType',
		'size',
	],
	computed: {
		iconStyleData (): object {
			if (!this.size) {
				return {};
			}

			const size = parseInt(this.size, 10);

			return {
				width: size + 'px',
				height: size + 'px',
				'font-size': Math.floor(parseInt(this.size, 10) * 0.6) + 'px',
				'line-height': size + 'px',
				'border-radius': Math.ceil(size / 2) + 'px',
			};
		},
		isSvgIcon (): boolean {
			if (this.nodeIconData && this.nodeIconData.type === 'file' && this.nodeIconData.fileExtension === 'svg') {
				return true;
			}
			return false;
		},
		nodeIconData (): null | NodeIconData {
			if (this.nodeType === null) {
				return null;
			}

			const restUrl = this.$store.getters.getRestUrl;

			if (this.nodeType.icon) {
				let type, path;
				[type, path] = this.nodeType.icon.split(':');
				const returnData: NodeIconData = {
					type,
					path,
				};

				if (type === 'file') {
					returnData.path = restUrl + '/node-icon/' + this.nodeType.name;
					returnData.fileExtension = path.split('.').slice(-1).join();
				}

				return returnData;
			}
			return null;
		},
	},
});
</script>

<style lang="scss">

.node-icon-wrapper {
	width: 30px;
	height: 30px;
	border-radius: 15px;
	color: #444;
	line-height: 30px;
	font-size: 1.1em;
	overflow: hidden;
	background-color: #fff;
	text-align: center;
	font-weight: bold;
	font-size: 20px;

	&.full .icon {
		margin: 0.24em;
	}

	.node-icon-placeholder {
		text-align: center;
	}
}

</style>
