<template>
	<div class="node-icon-wrapper" :style="iconStyleData" :class="{shrink: isSvgIcon && shrink, full: !shrink}">
		<div v-if="nodeIconData !== null" class="icon">
			<img v-if="nodeIconData.type === 'file'" :src="nodeIconData.fileBuffer || nodeIconData.path" style="max-width: 100%; max-height: 100%;" />
			<font-awesome-icon v-else :icon="nodeIconData.icon || nodeIconData.path" />
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
		'shrink',
		'disabled',
	],
	computed: {
		iconStyleData (): object {
			const color = this.disabled ? '#ccc' : this.nodeType.defaults && this.nodeType.defaults.color;
			if (!this.size) {
				return {color};
			}

			const size = parseInt(this.size, 10);

			return {
				color,
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

			if (this.nodeType.iconData) {
				return this.nodeType.iconData;
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
	width: 26px;
	height: 26px;
	border-radius: 4px;
	color: #444;
	line-height: 26px;
	font-size: 1.1em;
	overflow: hidden;
	text-align: center;
	font-weight: bold;
	font-size: 20px;

	&.full .icon {
		height: 100%;
		width: 100%;

		display: flex;
		justify-content: center;
		align-items: center;
	}

	&.shrink .icon {
		margin: 0.24em;
	}

	.node-icon-placeholder {
		text-align: center;
	}
}

</style>
