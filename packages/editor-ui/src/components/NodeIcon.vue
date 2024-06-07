<template>
	<n8n-node-icon
		:type="iconType"
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
		@click="emit('click')"
	></n8n-node-icon>
</template>

<script setup lang="ts">
import type { IVersionNode } from '@/Interface';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useUIStore } from '@/stores/ui.store';
import { getBadgeIconUrl, getNodeIcon, getNodeIconUrl } from '@/utils/nodeTypesUtils';
import type { INodeTypeDescription } from 'n8n-workflow';
import { computed } from 'vue';

interface NodeIconSource {
	path?: string;
	fileBuffer?: string;
	icon?: string;
}

type Props = {
	nodeType?: INodeTypeDescription | IVersionNode | null;
	size?: number;
	disabled?: boolean;
	circle?: boolean;
	colorDefault?: string;
	showTooltip?: boolean;
	tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
	nodeName?: string;
};

const props = withDefaults(defineProps<Props>(), {
	nodeType: undefined,
	size: undefined,
	circle: false,
	disabled: false,
	showTooltip: false,
	tooltipPosition: 'top',
	colorDefault: '',
	nodeName: '',
});

const emit = defineEmits<{
	(event: 'click'): void;
}>();

const rootStore = useRootStore();
const uiStore = useUIStore();

const iconType = computed(() => {
	const nodeType = props.nodeType;

	if (nodeType) {
		if (nodeType.iconUrl) return 'file';
		if ('iconData' in nodeType && nodeType.iconData) {
			return nodeType.iconData.type;
		}
		if (nodeType.icon) {
			const icon = getNodeIcon(nodeType, uiStore.appliedTheme);
			return icon && icon.split(':')[0] === 'file' ? 'file' : 'icon';
		}
	}

	return 'unknown';
});

const color = computed(() => {
	const nodeType = props.nodeType;

	if (nodeType && 'iconColor' in nodeType && nodeType.iconColor) {
		return `var(--color-node-icon-${nodeType.iconColor})`;
	}
	return nodeType?.defaults?.color?.toString() ?? props.colorDefault ?? '';
});

const iconSource = computed<NodeIconSource>(() => {
	const nodeType = props.nodeType;
	const baseUrl = rootStore.getBaseUrl;

	if (nodeType) {
		// If node type has icon data, use it
		if ('iconData' in nodeType && nodeType.iconData) {
			return {
				icon: nodeType.iconData.icon,
				fileBuffer: nodeType.iconData.fileBuffer,
			};
		}

		const iconUrl = getNodeIconUrl(nodeType, uiStore.appliedTheme);
		if (iconUrl) {
			return { path: baseUrl + iconUrl };
		}
		// Otherwise, extract it from icon prop
		if (nodeType.icon) {
			const icon = getNodeIcon(nodeType, uiStore.appliedTheme);
			console.log(nodeType.icon, icon);

			if (icon) {
				const [type, path] = icon.split(':');
				if (type === 'file') {
					throw new Error(`Unexpected icon: ${icon}`);
				}

				return { icon: path };
			}
		}
	}

	return {};
});

const badge = computed(() => {
	const nodeType = props.nodeType;
	if (nodeType && 'badgeIconUrl' in nodeType && nodeType.badgeIconUrl) {
		return {
			type: 'file',
			src: rootStore.getBaseUrl + getBadgeIconUrl(nodeType, uiStore.appliedTheme),
		};
	}

	return undefined;
});
</script>

<style lang="scss" module></style>
