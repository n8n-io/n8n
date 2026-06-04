import type { ActionDropdownItem } from '@n8n/design-system';

import type { NodeIconSource } from '@/app/utils/nodeIcon';

export interface PinnedNodeDisplay {
	id: string;
	name: string;
	iconSource: NodeIconSource | undefined;
}

/**
 * Props passed from the collapsed-group container to whichever variant is
 * active. The container owns all data/logic; variants are pure presentation.
 */
export interface GroupCardProps {
	title: string;
	description: string;
	isReadOnly: boolean;
	pinnedNodes: PinnedNodeDisplay[];
	pickableItems: Array<ActionDropdownItem<string>>;
	canPickNodes: boolean;
	iconSourceForNodeId: (nodeId: string) => NodeIconSource | undefined;
}

export interface GroupCardEmits {
	expand: [];
	'pick-node': [nodeId: string];
	'open-node': [name: string];
	'unpin-node': [nodeId: string];
}
