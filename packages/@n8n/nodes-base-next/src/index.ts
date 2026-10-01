import { nodeNameOf, type Action } from '@n8n/node-sdk';

import { getGmailMessage } from './nodes/gmail/actions/message.get';
import { getManyGmailMessages } from './nodes/gmail/actions/message.get-all';
import { sendGmailMessage } from './nodes/gmail/actions/message.send';
import { messageGemini } from './nodes/google-gemini/actions/text.message';
import { appendSheetRow } from './nodes/google-sheets/actions/sheet.append';
import { appendOrUpdateSheetRow } from './nodes/google-sheets/actions/sheet.append-or-update';
import { readSheetRows } from './nodes/google-sheets/actions/sheet.read';
import { getRequest } from './nodes/http-request/actions/get';
import { sendRequest } from './nodes/http-request/actions/send';
import { getManyDatabasePages } from './nodes/notion/actions/database-page.get-all';
import { composedSlotOf, type WorkflowNodeRef } from './composed';

export { versionsOf } from './registry';
export {
	COMPOSED_NODES,
	composedSlotOf,
	composedTargetOf,
	withComposedVersions,
	type ComposedSlotSpec,
	type ComposedTarget,
	type ComposedVersionSpec,
	type WorkflowNodeRef,
} from './composed';
export {
	contractVersionLoader,
	useContractRegistry,
	type ContractRegistryOptions,
} from './contract-registry';

export const NODE_PACKAGE = '@n8n/nodes-base-next';

/** Every action this package ships, one n8n node type each. */
export const actions: readonly Action[] = [
	getManyDatabasePages,
	getRequest,
	sendRequest,
	readSheetRows,
	appendSheetRow,
	appendOrUpdateSheetRow,
	sendGmailMessage,
	getManyGmailMessages,
	getGmailMessage,
	messageGemini,
];

/** The n8n node type of an action, e.g. `@n8n/nodes-base-next.notionDatabasePageGetAll`. */
export const nodeTypeOf = (action: Pick<Action, 'id'>) =>
	`${NODE_PACKAGE}.${nodeNameOf(action.id)}`;

/** The action a workflow node runs: a node type of this package, or a slot of a composed node. */
export function actionOfNode(node: WorkflowNodeRef): Action | undefined {
	const slot = composedSlotOf(node);
	return slot
		? actions.find(({ id, version }) => id === slot.action.id && version === slot.major)
		: actions.find((action) => nodeTypeOf(action) === node.type);
}
