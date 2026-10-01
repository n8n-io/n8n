import { nodeNameOf, type Action, type Trigger } from '@n8n/node-sdk';

import { aggregateItems } from './nodes/core/actions/aggregate';
import { dateTime } from './nodes/core/actions/date-time';
import { filterItems } from './nodes/core/actions/filter';
import { ifCondition } from './nodes/core/actions/if';
import { limitItems } from './nodes/core/actions/limit';
import { removeDuplicates } from './nodes/core/actions/remove-duplicates';
import { renameKeys } from './nodes/core/actions/rename-keys';
import { editFields } from './nodes/core/actions/set';
import { sortItems } from './nodes/core/actions/sort';
import { splitOut } from './nodes/core/actions/split-out';
import { summarizeItems } from './nodes/core/actions/summarize';
import { switchCases } from './nodes/core/actions/switch';
import { getGmailMessage } from './nodes/gmail/actions/message.get';
import { getManyGmailMessages } from './nodes/gmail/actions/message.get-all';
import { sendGmailMessage } from './nodes/gmail/actions/message.send';
import { messageGemini } from './nodes/google-gemini/actions/text.message';
import { appendSheetRow } from './nodes/google-sheets/actions/sheet.append';
import { appendOrUpdateSheetRow } from './nodes/google-sheets/actions/sheet.append-or-update';
import { readSheetRows } from './nodes/google-sheets/actions/sheet.read';
import { downloadFile } from './nodes/http-request/actions/download';
import { getRequest } from './nodes/http-request/actions/get';
import { sendRequest } from './nodes/http-request/actions/send';
import { repositoryEvent } from './nodes/github/actions/repository.event';
import { pageAdded } from './nodes/notion/actions/data-source.page-added';
import { getManyDatabasePages } from './nodes/notion/actions/database-page.get-all';
import { getUser } from './nodes/notion/actions/user.get';
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
	contractStore,
	contractVersionLoader,
	locksOf,
	syncContractStore,
	useContractRegistry,
	type ContractRegistryOptions,
	type ContractStore,
	type ContractStoreOptions,
	type ContractSyncResult,
	type LockedNode,
} from './contract-registry';
// The cli builds node types from stored versions with the node-sdk instance of this package.
export {
	runsActionApi,
	toVersionedNodeType,
	toVersionedTriggerType,
	type FrozenVersion,
	type NodeContractLock,
	type VersionManifest,
} from '@n8n/node-sdk';

export const NODE_PACKAGE = '@n8n/nodes-base-next';

/** Every action this package ships, one n8n node type each. */
export const actions: readonly Action[] = [
	getManyDatabasePages,
	getUser,
	getRequest,
	sendRequest,
	downloadFile,
	readSheetRows,
	appendSheetRow,
	appendOrUpdateSheetRow,
	sendGmailMessage,
	getManyGmailMessages,
	getGmailMessage,
	messageGemini,
	editFields,
	renameKeys,
	dateTime,
	sortItems,
	limitItems,
	removeDuplicates,
	aggregateItems,
	splitOut,
	summarizeItems,
	ifCondition,
	switchCases,
	filterItems,
];

/** Every trigger this package ships, one n8n node type each. */
export const triggers: readonly Trigger[] = [pageAdded, repositoryEvent];

/** The n8n node type of an action or a trigger, e.g. `@n8n/nodes-base-next.notionDatabasePageGetAll`. */
export const nodeTypeOf = (action: Pick<Action, 'id'>) =>
	`${NODE_PACKAGE}.${nodeNameOf(action.id)}`;

/** The action a workflow node runs: a node type of this package, or a slot of a composed node. */
export function actionOfNode(node: WorkflowNodeRef): Action | undefined {
	const slot = composedSlotOf(node);
	return slot
		? actions.find(({ id, version }) => id === slot.action.id && version === slot.major)
		: actions.find((action) => nodeTypeOf(action) === node.type);
}
