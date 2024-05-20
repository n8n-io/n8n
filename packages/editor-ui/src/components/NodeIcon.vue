<template>
	<n8n-node-icon
		:type="type"
		:src="iconSource.path || iconSource.fileBuffer"
		:name="iconSource.icon"
		:color="color"
		:disabled="disabled"
		:size="size"
		:circle="circle"
		:node-type-name="nodeName ?? nodeType?.displayName ?? ''"
		:show-tooltip="showTooltip"
		:tooltip-position="tooltipPosition"
		:badge="badge"
		@click="() => $emit('click')"
	></n8n-node-icon>
</template>

<script lang="ts">
import type { ActionTypeDescription, IVersionNode, SimplifiedNodeType } from '@/Interface';
import { useRootStore } from '@/stores/n8nRoot.store';
import type { INodeTypeDescription } from 'n8n-workflow';
import { mapStores } from 'pinia';
import { defineComponent, type PropType } from 'vue';

interface NodeIconSource {
	path?: string;
	fileBuffer?: string;
	icon?: string;
}

export default defineComponent({
	name: 'NodeIcon',
	props: {
		nodeType: {
			type: Object as PropType<
				INodeTypeDescription | IVersionNode | SimplifiedNodeType | ActionTypeDescription | null
			>,
			required: true,
		},
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
		colorDefault: {
			type: String,
			required: false,
		},
		showTooltip: {
			type: Boolean,
			default: false,
		},
		tooltipPosition: {
			type: String,
			default: 'top',
		},
		nodeName: {
			type: String,
			required: false,
		},
	},
	computed: {
		...mapStores(useRootStore),
		type(): string {
			const nodeType = this.nodeType;
			let iconType = 'unknown';
			if (nodeType) {
				if (nodeType.iconUrl) return 'file';
				if ((nodeType as IVersionNode).iconData) {
					iconType = (nodeType as IVersionNode).iconData.type;
				} else if (nodeType.icon) {
					iconType = nodeType.icon.split(':')[0] === 'file' ? 'file' : 'icon';
				}
			}
			return iconType;
		},
		color(): string {
			const nodeType = this.nodeType;
			if (nodeType?.defaults?.color) {
				return nodeType.defaults.color.toString();
			}
			if (this.colorDefault) {
				return this.colorDefault;
			}
			return '';
		},
		iconSource(): NodeIconSource {
			const nodeType = this.nodeType;
			const baseUrl = this.rootStore.getBaseUrl;
			const iconSource = {} as NodeIconSource;

			if (nodeType) {
				// If node type has icon data, use it
				if ((nodeType as IVersionNode).iconData) {
					return {
						icon: (nodeType as IVersionNode).iconData.icon,
						fileBuffer: (nodeType as IVersionNode).iconData.fileBuffer,
					};
				}
				if (nodeType.iconUrl) {
					return { path: baseUrl + nodeType.iconUrl };
				}
				// Otherwise, extract it from icon prop
				if (nodeType.icon) {
					const [type, path] = nodeType.icon.split(':');
					if (type === 'file') {
						throw new Error(`Unexpected icon: ${nodeType.icon}`);
					} else {
						iconSource.icon = path;
					}
				}
			}
			return iconSource;
		},
		badge(): { src: string; type: string } | undefined {
			const nodeType = this.nodeType as INodeTypeDescription;
			if (nodeType && 'badgeIconUrl' in nodeType && nodeType.badgeIconUrl) {
				return { type: 'file', src: this.rootStore.getBaseUrl + nodeType.badgeIconUrl };
			}

			return undefined;
		},
	},
});
</script>

<style lang="scss"></style>
