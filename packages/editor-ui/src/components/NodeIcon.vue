<template>
	<n8n-node-icon
		:type="nodeIconData.type"
		:path="nodeIconData.path || nodeIconData.icon || nodeIconData.fileBuffer"
		:color="nodeIconData.color"
		:disabled="disabled"
		:size="size"
		:circle="circle"
		:nodeTypeName="nodeType.displayName"
		:showTooltip="showTooltip"
	></n8n-node-icon>
</template>

<script lang="ts">
import { IVersionNode } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';
import N8nNodeIcon from '../../../design-system/src/components/N8nNodeIcon/NodeIcon.vue';
import Vue from 'vue';
interface NodeIconData {
	type: string;
	path?: string;
	fileExtension?: string;
	fileBuffer?: string;
	color?: string;
}
export default Vue.extend({
	name: 'NodeIcon',
	components: {
		N8nNodeIcon,
	},
	props: {
		nodeType: {},
		size: {
			type: Number,
			required: false,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		circle: {
			type: Boolean,
			default: false,
		},
		showTooltip: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		nodeIconData (): null | NodeIconData {
			const nodeType = this.nodeType as INodeTypeDescription | IVersionNode | null;
			const color = nodeType ? nodeType.defaults && nodeType!.defaults.color : '';
			if (nodeType === null) {
				return null;
			}
			if ((nodeType as IVersionNode).iconData) {
				return {
					...(nodeType as IVersionNode).iconData,
					color: color ? color.toString() : '',
				};
			}
			const restUrl = this.$store.getters.getRestUrl;
			if (nodeType.icon) {
				let type, path;
				[type, path] = nodeType.icon.split(':');
				const returnData: NodeIconData = {
					type,
					path,
					color: color ? color.toString() : '',
				};
				if (type === 'file') {
					returnData.path = restUrl + '/node-icon/' + nodeType.name;
					returnData.fileExtension = path.split('.').slice(-1).join();
				}else {
					returnData.type = 'icon';
				}
				return returnData;
			}
			return {
				type: 'unknown',
				color: color ? color.toString() : '',
			};
		},
	},
});
</script>

<style lang="scss">
</style>
