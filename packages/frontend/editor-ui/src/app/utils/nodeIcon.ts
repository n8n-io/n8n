import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	isNodePreviewKey,
	removePreviewToken,
} from '@/features/shared/nodeCreator/nodeCreator.utils';
import type { VersionNode } from '@n8n/rest-api-client/api/versions';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	type INode,
	type INodeTypeDescription,
	type IWorkflowDataProxyAdditionalKeys,
	isExpression,
} from 'n8n-workflow';
import { getThemedValue } from './nodeTypesUtils';

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
> & { iconBasePath?: string };
type IconVersionNode = Pick<VersionNode, 'icon' | 'iconUrl' | 'iconData' | 'defaults' | 'name'>;
export type IconNodeType = IconNodeTypeDescription | IconVersionNode;

const resolveIconExpression = (
	icon: string,
	nodeType: IconNodeType,
	node?: INode | null,
): string | null => {
	try {
		const workflowsStore = useWorkflowsStore();
		const defaults =
			nodeType.defaults && 'parameters' in nodeType.defaults ? nodeType.defaults.parameters : {};
		const parameters = node?.parameters ?? defaults ?? {};

		const additionalKeys: IWorkflowDataProxyAdditionalKeys = {};
		additionalKeys.$parameter = parameters;

		const result = workflowsStore.workflowObject.expression.getParameterValue(
			icon,
			null,
			0,
			0,
			node?.name ?? '',
			[],
			'internal',
			additionalKeys,
			undefined,
			false,
		);

		if (typeof result !== 'string') {
			return null;
		}

		const [prefix] = result.split(':');
		if (prefix !== 'file' && prefix !== 'icon') {
			return null;
		}

		return result;
	} catch {
		return null;
	}
};

export const getNodeIcon = (nodeType: IconNodeType, node?: INode | null): string | null => {
	const themedIcon = getThemedValue(nodeType.icon, useUIStore().appliedTheme);

	if (isExpression(themedIcon)) {
		return resolveIconExpression(themedIcon, nodeType, node);
	}

	return themedIcon;
};

export const getNodeIconUrl = (nodeType: IconNodeType): string | null => {
	return getThemedValue(nodeType.iconUrl, useUIStore().appliedTheme);
};

export const getBadgeIconUrl = (
	nodeType: Pick<IconNodeTypeDescription, 'badgeIconUrl'>,
): string | null => {
	return getThemedValue(nodeType.badgeIconUrl, useUIStore().appliedTheme);
};

const getNodeIconColor = (nodeType: IconNodeType): string | undefined => {
	if ('iconColor' in nodeType && nodeType.iconColor) {
		return `var(--node--icon--color--${nodeType.iconColor})`;
	}
	const defaultColor = nodeType?.defaults?.color;
	return typeof defaultColor === 'string' ? defaultColor : undefined;
};

const prefixBaseUrl = (url: string): string => useRootStore().baseUrl + url;

const getNodeBadgeIconSource = (nodeType: IconNodeType): BaseNodeIconSource | undefined => {
	if (!('badgeIconUrl' in nodeType) || !nodeType.badgeIconUrl) return undefined;

	const badgeUrl = getBadgeIconUrl(nodeType);
	return badgeUrl ? { type: 'file', src: prefixBaseUrl(badgeUrl) } : undefined;
};

const createFileIconSource = (src: string, nodeType: IconNodeType): NodeIconSource => ({
	type: 'file',
	src,
	badge: getNodeBadgeIconSource(nodeType),
});

const createNamedIconSource = (name: string, nodeType: IconNodeType): NodeIconSource => ({
	type: 'icon',
	name,
	color: getNodeIconColor(nodeType),
	badge: getNodeBadgeIconSource(nodeType),
});

const getIconFromNodeTypeString = (nodeTypeName: string): NodeIconSource | undefined => {
	const nodeTypeStore = useNodeTypesStore();
	const cleanedNodeType = removePreviewToken(nodeTypeName);
	const nodeDescription =
		nodeTypeStore.communityNodeType(cleanedNodeType)?.nodeDescription ??
		nodeTypeStore.getNodeType(cleanedNodeType);

	const iconUrl = nodeDescription?.iconUrl
		? getThemedValue(nodeDescription.iconUrl, useUIStore().appliedTheme)
		: null;

	return iconUrl ? { type: 'file', src: iconUrl } : undefined;
};

export function getNodeIconSource(
	nodeType: IconNodeType | string | null | undefined,
	node?: INode | null,
): NodeIconSource | undefined {
	if (!nodeType) return undefined;
	if (typeof nodeType === 'string') return getIconFromNodeTypeString(nodeType);

	if ('iconData' in nodeType && nodeType.iconData) {
		if (nodeType.iconData.icon) return createNamedIconSource(nodeType.iconData.icon, nodeType);
		if (nodeType.iconData.fileBuffer)
			return createFileIconSource(nodeType.iconData.fileBuffer, nodeType);
	}

	if (nodeType.name && isNodePreviewKey(nodeType.name)) {
		const themedUrl = getThemedValue(nodeType.iconUrl, useUIStore().appliedTheme);
		if (themedUrl) return { type: 'file', src: themedUrl, badge: undefined };
	}

	const iconUrl = getNodeIconUrl(nodeType);
	if (iconUrl) return createFileIconSource(prefixBaseUrl(iconUrl), nodeType);

	if (nodeType.icon) {
		let fullNodeType = nodeType;
		if (!('iconBasePath' in nodeType) && 'name' in nodeType && nodeType.name) {
			fullNodeType = useNodeTypesStore().getNodeType(nodeType.name) ?? nodeType;
		}

		const icon = getNodeIcon(fullNodeType, node);
		if (!icon) return undefined;

		const [type, iconName] = icon.split(':');

		if (type === 'file') {
			if ('iconBasePath' in fullNodeType && fullNodeType.iconBasePath) {
				const iconPath = iconName.replace(/^\//, '');
				return createFileIconSource(
					prefixBaseUrl(`${fullNodeType.iconBasePath}/${iconPath}`),
					fullNodeType,
				);
			}
			return undefined;
		}

		return createNamedIconSource(iconName, fullNodeType);
	}

	return undefined;
}
