import type { INodeTypeDescription } from 'n8n-workflow';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import type { ToolIconSource } from '@/features/shared/toolsConnection/types';

/** Map a node type description to the shared tools-connection icon shape. */
export function toToolIconSource(nodeType: INodeTypeDescription): ToolIconSource | undefined {
	const source = getNodeIconSource(nodeType, null, null);
	if (!source) return undefined;
	const { badge: _badge, ...rest } = source;
	return rest;
}
