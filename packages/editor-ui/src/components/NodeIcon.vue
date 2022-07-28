<template>
	<div class="node-icon-wrapper" :style="iconStyleData">
		<div v-if="nodeIconData !== null" class="icon">
			<img v-if="nodeIconData.type === 'file'" :src="nodeIconData.fileBuffer || nodeIconData.path" :style="imageStyleData" />
			<font-awesome-icon v-else :icon="nodeIconData.icon || nodeIconData.path" :style="fontStyleData" />
		</div>
		<div v-else class="node-icon-placeholder">
			{{nodeType !== null ? nodeType.displayName.charAt(0) : '?' }}
		</div>
	</div>
</template>

<script lang="ts">

import { IVersionNode } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';
import Vue from 'vue';

interface NodeIconData {
	type: string;
	path?: string;
	fileExtension?: string;
	fileBuffer?: string;
}

export default Vue.extend({
	name: 'NodeIcon',
	props: {
		nodeType: {},
		size: {
			type: Number,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		circle: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		iconStyleData (): object {
			const nodeType = this.nodeType as INodeTypeDescription | IVersionNode | null;
			const color = nodeType ? nodeType.defaults && nodeType!.defaults.color : '';
			if (!this.size) {
				return {color};
			}

			return {
				color,
				width: this.size + 'px',
				height: this.size + 'px',
				'font-size': this.size + 'px',
				'line-height': this.size + 'px',
				'border-radius': this.circle ? '50%': '2px',
				...(this.disabled && {
					color: 'var(--color-text-light)',
					'-webkit-filter': 'contrast(40%) brightness(1.5) grayscale(100%)',
					'filter': 'contrast(40%) brightness(1.5) grayscale(100%)',
				}),
			};
		},
		fontStyleData (): object {
			return {
				'max-width': this.size + 'px',
			};
		},
		imageStyleData (): object {
			return {
				width: '100%',
				'max-width': '100%',
				'max-height': '100%',
			};
		},
		isSvgIcon (): boolean {
			if (this.nodeIconData && this.nodeIconData.type === 'file' && this.nodeIconData.fileExtension === 'svg') {
				return true;
			}
			return false;
		},
		nodeIconData (): null | NodeIconData {
			const nodeType = this.nodeType as INodeTypeDescription | IVersionNode | null;
			if (nodeType === null) {
				return null;
			}

			if ((nodeType as IVersionNode).iconData) {
				return (nodeType as IVersionNode).iconData;
			}

			const restUrl = this.$store.getters.getRestUrl;

			if (nodeType.icon) {
				let type, path;
				[type, path] = nodeType.icon.split(':');
				const returnData: NodeIconData = {
					type,
					path,
				};

				if (type === 'file') {
					returnData.path = restUrl + '/node-icon/' + nodeType.name;
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
	border-radius: 2px;
	color: #444;
	line-height: 26px;
	font-size: 1.1em;
	overflow: hidden;
	text-align: center;
	font-weight: bold;
	font-size: 20px;

	.icon {
		height: 100%;
		width: 100%;

		display: flex;
		justify-content: center;
		align-items: center;
	}

	.node-icon-placeholder {
		text-align: center;
	}
}

</style>
