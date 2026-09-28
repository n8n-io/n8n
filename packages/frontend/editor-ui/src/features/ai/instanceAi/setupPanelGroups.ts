import type { InstanceAiSetupItem } from '@n8n/api-types';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { CORE_NODES_CATEGORY, RSS_READ_NODE_TYPE } from '@/app/constants';
import type { SetupPanelRow } from './composables/useSetupPanelState';

type CredentialRow = SetupPanelRow & {
	item: Extract<InstanceAiSetupItem, { kind: 'credential' }>;
};
type ParametersRow = SetupPanelRow & {
	item: Extract<InstanceAiSetupItem, { kind: 'parameters' }>;
};

export interface SetupPanelGroup {
	id: string;
	credential?: CredentialRow;
	parameters: ParametersRow[];
	/** The standalone service node, absent for the Details bucket. */
	node?: INodeUi;
}

/** Group service fields with their credential and collect unrelated fields in Details. */
export function groupSetupPanelRows(
	rows: SetupPanelRow[],
	options: {
		workflowId: string;
		getNodeByName: (name: string) => INodeUi | undefined;
		getNodeType: (node: INodeUi) => INodeTypeDescription | null;
	},
): SetupPanelGroup[] {
	const groups: SetupPanelGroup[] = rows
		.filter((row): row is CredentialRow => row.item.kind === 'credential')
		.map((credential) => ({ id: credential.item.id, credential, parameters: [] }));
	const details: SetupPanelGroup = { id: `${options.workflowId}:details`, parameters: [] };

	for (const row of rows.filter(
		(entry): entry is ParametersRow => entry.item.kind === 'parameters',
	)) {
		const service = groups.find((group) =>
			group.credential?.item.nodeBindings?.some(
				(binding) => binding.nodeName === row.item.nodeName,
			),
		);
		if (service) {
			service.parameters.push(row);
			continue;
		}

		const node = options.getNodeByName(row.item.nodeName);
		const nodeType = node ? options.getNodeType(node) : null;
		const categories = nodeType?.codex?.categories;
		// RSS is a core node, but its feed URL belongs to a named service row.
		const isRss =
			node?.type === RSS_READ_NODE_TYPE || node?.type === `${RSS_READ_NODE_TYPE}Trigger`;
		if (node && (isRss || (categories?.length && !categories.includes(CORE_NODES_CATEGORY)))) {
			groups.push({ id: row.item.id, node, parameters: [row] });
		} else {
			details.parameters.push(row);
		}
	}

	if (details.parameters.length) groups.push(details);
	return groups;
}
