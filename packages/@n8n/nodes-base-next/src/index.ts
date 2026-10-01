import { nodeNameOf, type Action, type Trigger } from '@n8n/node-sdk';

import { getGmailMessage } from './nodes/gmail/message.get';
import { repositoryEvent } from './nodes/github/repository.event';
import { getManyGmailMessages } from './nodes/gmail/message.get-all';
import { sendGmailMessage } from './nodes/gmail/message.send';
import { messageGemini } from './nodes/google-gemini/text.message';
import { appendSheetRow } from './nodes/google-sheets/sheet.append';
import { appendOrUpdateSheetRow } from './nodes/google-sheets/sheet.append-or-update';
import { readSheetRows } from './nodes/google-sheets/sheet.read';
import { getRequest, sendRequest } from './nodes/http/request';
import { databasePageAdded } from './nodes/notion/database-page.added';
import { getManyDatabasePages } from './nodes/notion/database-page.get-all';
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

/** Every trigger this package ships, one n8n node type each. */
export const triggers: readonly Trigger[] = [repositoryEvent, databasePageAdded];

/** The n8n node type of an action, e.g. `@n8n/nodes-base-next.notionDatabasePageGetAll`. */
export const nodeTypeOf = (action: Pick<Action, 'id'>) =>
	`${NODE_PACKAGE}.${nodeNameOf(action.id)}`;

/** The action a workflow node runs: a node type of this package, or a slot of a composed node. */
export function actionOfNode(node: WorkflowNodeRef): Action | undefined {
	const slot = composedSlotOf(node);
	return slot
		? actions.find(({ id, version }) => id === slot.action && version === slot.major)
		: actions.find((action) => nodeTypeOf(action) === node.type);
}
