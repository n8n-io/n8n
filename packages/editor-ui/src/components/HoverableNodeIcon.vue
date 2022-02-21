<template>
	<div
		:class="$style.wrapper"
		:style="iconStyleData"
		@click="(e) => $emit('click', nodeType)"
		@mouseover="showTooltip = true"
		@mouseleave="showTooltip = false"
	>
		<div :class="$style.tooltip">
			<n8n-tooltip placement="top" :manual="true" :value="showTooltip">
				<div slot="content" v-text="nodeType.displayName"></div>
				<span />
			</n8n-tooltip>
		</div>
		<div v-if="nodeIconData !== null" :class="$style.icon" title="">
			<NodeIcon :nodeType="nodeType" />
		</div>
		<div v-else :class="$style.placeholder">
			{{ nodeType !== null ? nodeType.displayName.charAt(0) : '?' }}
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';

import { ITemplatesNode } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';

interface NodeIconData {
	type: string;
	path?: string;
	fileExtension?: string;
	fileBuffer?: string;
}

export default Vue.extend({
	name: 'HoverableNodeIcon',
	props: {
		circle: {
			type: Boolean,
			default: false,
		},
		clickButton: {
			type: Function,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		nodeType: {
			type: Object,
		},
		size: {
			type: Number,
		},
	},
	components: {
		NodeIcon,
	},
	computed: {
		iconStyleData(): object {
			const nodeType = this.nodeType as ITemplatesNode | null;
			const color = nodeType ? nodeType.defaults && nodeType!.defaults.color : '';
			if (!this.size) {
				return { color };
			}

			return {
				color,
				width: this.size + 'px',
				height: this.size + 'px',
				'font-size': this.size + 'px',
				'line-height': this.size + 'px',
				'border-radius': this.circle ? '50%' : '2px',
				...(this.disabled && {
					color: '#ccc',
					'-webkit-filter': 'contrast(40%) brightness(1.5) grayscale(100%)',
					filter: 'contrast(40%) brightness(1.5) grayscale(100%)',
				}),
			};
		},
		nodeIconData(): null | NodeIconData {
			const nodeType = this.nodeType as INodeTypeDescription | ITemplatesNode | null;
			if (nodeType === null) {
				return null;
			}

			if ((nodeType as ITemplatesNode).iconData) {
				return (nodeType as ITemplatesNode).iconData;
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
	data() {
		return {
			showTooltip: false,
		};
	},
});
</script>

<style lang="scss" module>
.wrapper {
	cursor: pointer;
	z-index: 2000;
}

.icon {
	height: 100%;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
}

.placeholder {
	text-align: center;
}

.tooltip {
	left: 10px;
	position: relative;
	z-index: 9999;
}
</style>
