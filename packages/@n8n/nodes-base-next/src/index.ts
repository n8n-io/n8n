import type { Action, Trigger } from '@n8n/node-sdk';
import { compat, type AnyCredentialType } from '@n8n/node-sdk/credentials';
import { isToolContract, nodeNameOf } from '@n8n/node-sdk/host';
import { toContract } from '@n8n/node-sdk/registry';

import { runAgent } from './nodes/ai/actions/agent';
import { classifyText } from './nodes/ai/actions/classify';
import { promptModel } from './nodes/ai/actions/prompt';
import { anthropicChatModel } from './nodes/anthropic/actions/chat-model';
import { filterItems } from './nodes/condition/actions/filter';
import { ifCondition } from './nodes/condition/actions/if';
import { switchCases } from './nodes/condition/actions/switch';
import { aggregateItems } from './nodes/items/actions/aggregate';
import { dateTime } from './nodes/items/actions/date-time';
import { limitItems } from './nodes/items/actions/limit';
import { removeDuplicates } from './nodes/items/actions/remove-duplicates';
import { renameKeys } from './nodes/items/actions/rename-keys';
import { editFields } from './nodes/items/actions/set';
import { sortItems } from './nodes/items/actions/sort';
import { splitOut } from './nodes/items/actions/split-out';
import { summarizeItems } from './nodes/items/actions/summarize';
import { getGmailMessage } from './nodes/gmail/actions/message.get';
import { getManyGmailMessages } from './nodes/gmail/actions/message.get-all';
import { sendGmailMessage } from './nodes/gmail/actions/message.send';
import { geminiChatModel } from './nodes/google-gemini/actions/chat-model';
import { messageGemini } from './nodes/google-gemini/actions/text.message';
import { appendSheetRow } from './nodes/google-sheets/actions/sheet.append';
import { appendOrUpdateSheetRow } from './nodes/google-sheets/actions/sheet.append-or-update';
import { readSheetRows } from './nodes/google-sheets/actions/sheet.read';
import { downloadFile } from './nodes/http-request/actions/download';
import { getRequest } from './nodes/http-request/actions/get';
import { sendRequest } from './nodes/http-request/actions/send';
import { createIssue } from './nodes/github/actions/issue.create';
import { commentOnIssue } from './nodes/github/actions/issue.create-comment';
import { getIssue } from './nodes/github/actions/issue.get';
import { getManyIssues } from './nodes/github/actions/issue.get-all';
import { updateIssue } from './nodes/github/actions/issue.update';
import { repositoryEvent } from './nodes/github/actions/repository.event';
import { minimaxChatModel } from './nodes/minimax/actions/chat-model';
import { createDocument } from './nodes/google-docs/actions/document.create';
import { getDocument } from './nodes/google-docs/actions/document.get';
import { updateDocument } from './nodes/google-docs/actions/document.update';
import { deleteFile } from './nodes/google-drive/actions/file.delete';
import { searchFiles } from './nodes/google-drive/actions/file.search';
import { uploadFile } from './nodes/google-drive/actions/file.upload';
import { createFolder } from './nodes/google-drive/actions/folder.create';
import { pageAdded } from './nodes/notion/actions/data-source.page-added';
import { facebookEvent } from './nodes/facebook-trigger/actions/trigger';
import { formTrigger } from './nodes/form/actions/trigger';
import { sheetRowsChanged } from './nodes/google-sheets-trigger/actions/trigger';
import { loopBatches } from './nodes/loop/actions/batches';
import { manualTrigger } from './nodes/manual/actions/trigger';
import { scheduleTrigger } from './nodes/schedule/actions/trigger';
import { webhookTrigger } from './nodes/webhook/actions/trigger';
import { whatsAppEvent } from './nodes/whats-app-trigger/actions/trigger';
import { getManyDatabasePages } from './nodes/notion/actions/database-page.get-all';
import { getUser } from './nodes/notion/actions/user.get';
import { runJavaScript } from './nodes/code/actions/java-script';
import { runPython } from './nodes/code/actions/python';
import { deleteRows } from './nodes/data-table/actions/row.delete';
import { rowExists } from './nodes/data-table/actions/row.exists';
import { getRows } from './nodes/data-table/actions/row.get';
import { insertRows } from './nodes/data-table/actions/row.insert';
import { updateRows } from './nodes/data-table/actions/row.update';
import { upsertRows } from './nodes/data-table/actions/row.upsert';
import { clearTable } from './nodes/data-table/actions/table.clear';
import { createTable } from './nodes/data-table/actions/table.create';
import { deleteTable } from './nodes/data-table/actions/table.delete';
import { listTables } from './nodes/data-table/actions/table.list';
import { renameTable } from './nodes/data-table/actions/table.rename';
import { setLoopState } from './nodes/loop-state/actions/set';
import { appendItems } from './nodes/merge/actions/append';
import { combineItems } from './nodes/merge/actions/combine';
import { passItems } from './nodes/no-op/actions/pass';
import { stopWithError } from './nodes/stop-and-error/actions/stop';
import { waitInterval } from './nodes/wait/actions/interval';
import { waitUntil } from './nodes/wait/actions/until';
import { openAiChatModel } from './nodes/open-ai/actions/chat-model';
import { generateImage } from './nodes/open-ai/actions/image.generate';
import { messageOpenAi } from './nodes/open-ai/actions/text.message';
import { xAiChatModel } from './nodes/x-ai/actions/chat-model';
import { createSlackChannel } from './nodes/slack/actions/channel.create';
import { getSlackChannel } from './nodes/slack/actions/channel.get';
import { getManySlackChannels } from './nodes/slack/actions/channel.get-all';
import { getSlackChannelHistory } from './nodes/slack/actions/channel.history';
import { uploadSlackFile } from './nodes/slack/actions/file.upload';
import { deleteSlackMessage } from './nodes/slack/actions/message.delete';
import { getSlackPermalink } from './nodes/slack/actions/message.get-permalink';
import { sendSlackMessage } from './nodes/slack/actions/message.send';
import { updateSlackMessage } from './nodes/slack/actions/message.update';
import { addSlackReaction } from './nodes/slack/actions/reaction.add';
import { getSlackUser } from './nodes/slack/actions/user.get';
import { sendWhatsAppMessage } from './nodes/whats-app/actions/message.send';
import { sendWhatsAppTemplate } from './nodes/whats-app/actions/message.send-template';
import { createSupabaseRow } from './nodes/supabase/actions/row.create';
import { deleteSupabaseRows } from './nodes/supabase/actions/row.delete';
import { getSupabaseRows } from './nodes/supabase/actions/row.get';
import { getManySupabaseRows } from './nodes/supabase/actions/row.get-all';
import { updateSupabaseRows } from './nodes/supabase/actions/row.update';
import { migratedSlotOf, type WorkflowNodeRef } from './migrated';

export { bundledCredentialsOf, bundledIdsOf, EMBEDDED_STORE_DIR, versionsOf } from './registry';
export {
	MIGRATED_NODES,
	migratedSlotOf,
	migratedTargetOf,
	withMigratedVersions,
	type MigratedSlotSpec,
	type MigratedTarget,
	type MigratedVersionSpec,
	type WorkflowNodeRef,
} from './migrated';
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
// The cli builds node and credential types from manifests and checks eval mock values with the
// node-sdk instance of this package.
export { matches } from '@n8n/node-sdk';
export {
	credentialTypeOfManifest,
	exampleOf,
	nodeNameOf,
	runsNodeContract,
	setCodeLanguages,
	toVersionedNodeType,
	toVersionedToolType,
	toVersionedTriggerType,
	type FrozenVersion,
	type RunProfile,
} from '@n8n/node-sdk/host';
export {
	storeIndexFileOf,
	type NodeContractLock,
	type VersionManifest,
} from '@n8n/node-sdk/registry';

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
	insertRows,
	getRows,
	rowExists,
	updateRows,
	upsertRows,
	deleteRows,
	createTable,
	listTables,
	renameTable,
	clearTable,
	deleteTable,
	runJavaScript,
	runPython,
	appendItems,
	combineItems,
	waitInterval,
	waitUntil,
	stopWithError,
	passItems,
	setLoopState,
	promptModel,
	runAgent,
	classifyText,
	openAiChatModel,
	generateImage,
	messageOpenAi,
	geminiChatModel,
	anthropicChatModel,
	minimaxChatModel,
	xAiChatModel,
	sendSlackMessage,
	updateSlackMessage,
	deleteSlackMessage,
	getSlackPermalink,
	getSlackChannelHistory,
	getSlackChannel,
	getManySlackChannels,
	createSlackChannel,
	addSlackReaction,
	getSlackUser,
	uploadSlackFile,
	sendWhatsAppMessage,
	sendWhatsAppTemplate,
	getManyIssues,
	getIssue,
	createIssue,
	getDocument,
	createDocument,
	uploadFile,
	getManySupabaseRows,
	createSupabaseRow,
	deleteSupabaseRows,
	updateIssue,
	commentOnIssue,
	updateDocument,
	searchFiles,
	deleteFile,
	createFolder,
	getSupabaseRows,
	updateSupabaseRows,
];

/** Every trigger this package ships, one n8n node type each. */
export const triggers: readonly Trigger[] = [pageAdded, repositoryEvent];

/**
 * Triggers that a legacy node runs. They have no bundle and no node type of this package:
 * the typed flow emits the legacy node with the typed parameters.
 */
export const nativeTriggers: readonly Trigger[] = [
	webhookTrigger,
	scheduleTrigger,
	formTrigger,
	whatsAppEvent,
	facebookEvent,
	sheetRowsChanged,
];

/**
 * The credential types of the shipped nodes that this package defines, one n8n class each. With
 * the node contracts flag on, each replaces the legacy class of the same name, also for the
 * legacy node of a native trigger. A compat type stays the legacy class.
 */
export const credentialTypes: readonly AnyCredentialType[] = [
	...new Set(
		[...actions, ...triggers, ...nativeTriggers].flatMap(
			({ node }) => node.credential?.types ?? [],
		),
	),
].filter(({ scheme }) => scheme.kind !== 'compat');

/**
 * The credential type of a name for a sandboxed bundle: the type of a shipped node, else a compat
 * type when n8n has the name (`known`). The hosts and the base URL never come from the bundle.
 */
export function sandboxCredentialTypeOf(known: (name: string) => boolean) {
	const shipped = new Map(
		[...actions, ...triggers, ...nativeTriggers]
			.flatMap(({ node }) => node.credential?.types ?? [])
			.map((type) => [type.name, type]),
	);
	return (name: string): AnyCredentialType | undefined =>
		shipped.get(name) ?? (known(name) ? compat(name) : undefined);
}

/**
 * Native contracts that a construct of the typed flow emits, so no module has a factory for
 * them: `manual()` emits the Manual Trigger, and `forEach` emits Loop Over Items.
 */
export const flowNatives: ReadonlyArray<Action | Trigger> = [manualTrigger, loopBatches];

/** The n8n node type of an action or a trigger, e.g. `@n8n/nodes-base-next.notionDatabasePageGetAll`. */
export const nodeTypeOf = (action: Pick<Action, 'id'>) =>
	`${NODE_PACKAGE}.${nodeNameOf(action.id)}`;

/** The actions that the host also gives as agent tools, see `isToolContract`. */
export const toolActions: readonly Action[] = actions.filter((action) =>
	isToolContract(toContract(action)),
);

/** The n8n node type of the agent tool of an action, e.g. `@n8n/nodes-base-next.httpRequestGetTool`. */
export const toolTypeOf = (action: Pick<Action, 'id'>) => `${nodeTypeOf(action)}Tool`;

/** The action that a tool node of this package runs. */
export const toolActionOfNode = (node: Pick<WorkflowNodeRef, 'type'>) =>
	toolActions.find((action) => toolTypeOf(action) === node.type);

/** The action a workflow node runs: a node type of this package, or a slot of a migrated node. */
export function actionOfNode(node: WorkflowNodeRef): Action | undefined {
	const slot = migratedSlotOf(node);
	return slot
		? actions.find(({ id, version }) => id === slot.action.id && version === slot.major)
		: actions.find((action) => nodeTypeOf(action) === node.type);
}
