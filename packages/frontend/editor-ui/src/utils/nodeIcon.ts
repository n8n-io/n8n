import { type INodeTypeDescription } from 'n8n-workflow';
import type { VersionNode } from '@n8n/rest-api-client/api/versions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '../stores/ui.store';
import { getThemedValue } from './nodeTypesUtils';
import { isNodePreviewKey } from '../components/Node/NodeCreator/utils';

type NodeIconSourceIcon = { type: 'icon'; name: string; color?: string };
type NodeIconSourceFile = {
	type: 'file';
	src: string;
};

type BaseNodeIconSource = NodeIconSourceIcon | NodeIconSourceFile;
export type NodeIconSource = BaseNodeIconSource & { badge?: BaseNodeIconSource };

export type NodeIconType = 'file' | 'icon' | 'unknown';

type IconNodeTypeDescription = Pick<
	INodeTypeDescription,
	'icon' | 'iconUrl' | 'iconColor' | 'defaults' | 'badgeIconUrl' | 'name'
>;
type IconVersionNode = Pick<VersionNode, 'icon' | 'iconUrl' | 'iconData' | 'defaults' | 'name'>;
export type IconNodeType = IconNodeTypeDescription | IconVersionNode;

export const getNodeIcon = (nodeType: IconNodeType): string | null => {
	return getThemedValue(nodeType.icon, useUIStore().appliedTheme);
};

export const getNodeIconUrl = (nodeType: IconNodeType): string | null => {
	return getThemedValue(nodeType.iconUrl, useUIStore().appliedTheme);
};

export const getBadgeIconUrl = (
	nodeType: Pick<IconNodeTypeDescription, 'badgeIconUrl'>,
): string | null => {
	return getThemedValue(nodeType.badgeIconUrl, useUIStore().appliedTheme);
};

function getNodeIconColor(nodeType: IconNodeType) {
	if ('iconColor' in nodeType && nodeType.iconColor) {
		return `var(--color-node-icon-${nodeType.iconColor})`;
	}
	return nodeType?.defaults?.color?.toString();
}

function prefixBaseUrl(url: string) {
	return useRootStore().baseUrl + url;
}

export function getNodeIconSource(nodeType?: IconNodeType | null): NodeIconSource | undefined {
	if (!nodeType) return undefined;
	const createFileIconSource = (src: string): NodeIconSource => ({
		type: 'file',
		src,
		badge: getNodeBadgeIconSource(nodeType),
	});
	const createNamedIconSource = (name: string): NodeIconSource => ({
		type: 'icon',
		name,
		color: getNodeIconColor(nodeType),
		badge: getNodeBadgeIconSource(nodeType),
	});

	// If node type has icon data, use it
	if ('iconData' in nodeType && nodeType.iconData) {
		if (nodeType.iconData.icon) {
			return createNamedIconSource(nodeType.iconData.icon);
		}

		if (nodeType.iconData.fileBuffer) {
			return createFileIconSource(nodeType.iconData.fileBuffer);
		}
	}

	if (nodeType.name && isNodePreviewKey(nodeType.name)) {
		// Handle both string and object iconUrl for preview nodes
		if (typeof nodeType.iconUrl === 'string') {
			return {
				type: 'file',
				src: nodeType.iconUrl,
				badge: undefined,
			};
		} else if (nodeType.iconUrl && typeof nodeType.iconUrl === 'object') {
			// Use getThemedValue to get the appropriate theme URL
			const themedUrl = getThemedValue(nodeType.iconUrl, useUIStore().appliedTheme);
			if (themedUrl) {
				return {
					type: 'file',
					src: themedUrl,
					badge: undefined,
				};
			}
		}
	}

	const iconUrl = getNodeIconUrl(nodeType);
	if (iconUrl) {
		return createFileIconSource(prefixBaseUrl(iconUrl));
	}

	// Otherwise, extract it from icon prop
	if (nodeType.icon) {
		const icon = getNodeIcon(nodeType);

		if (icon) {
			const [type, iconName] = icon.split(':');
			if (type === 'file') {
				return undefined;
			}

			return createNamedIconSource(iconName);
		}
	}

	return undefined;
}

function getNodeBadgeIconSource(nodeType: IconNodeType): BaseNodeIconSource | undefined {
	if (nodeType && 'badgeIconUrl' in nodeType && nodeType.badgeIconUrl) {
		const badgeUrl = getBadgeIconUrl(nodeType);

		if (!badgeUrl) return undefined;
		return {
			type: 'file',
			src: prefixBaseUrl(badgeUrl),
		};
	}

	return undefined;
}
