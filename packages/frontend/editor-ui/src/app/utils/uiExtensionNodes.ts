import type { INodeTypeDescription } from 'n8n-workflow';

import { CORE_NODES_CATEGORY } from '@/app/constants';

/**
 * A service node signs in to an outside app, such as Slack or Google Sheets. So it
 * takes credentials and is not one of n8n's core nodes, such as HTTP Request or If.
 */
export function isServiceNodeType(nodeType: INodeTypeDescription): boolean {
	return (
		(nodeType.credentials?.length ?? 0) > 0 &&
		!(nodeType.codex?.categories?.includes(CORE_NODES_CATEGORY) ?? false)
	);
}
