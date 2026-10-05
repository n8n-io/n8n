import type { Action, Trigger } from '@n8n/node-sdk';
import type { SourcePackage } from '@n8n/node-sdk/registry';
import path from 'node:path';

import { runAgent } from './ai/actions/agent';
import { classifyText } from './ai/actions/classify';
import { promptModel } from './ai/actions/prompt';
import { anthropicChatModel } from './anthropic/actions/chat-model';
import { filterItems } from './condition/actions/filter';
import { ifCondition } from './condition/actions/if';
import { switchCases } from './condition/actions/switch';
import { extractCsv } from './extract-from-file/actions/csv';
import { extractJson } from './extract-from-file/actions/json';
import { extractPdf } from './extract-from-file/actions/pdf';
import { extractText } from './extract-from-file/actions/text';
import { extractXlsx } from './extract-from-file/actions/xlsx';
import { aggregateItems } from './items/actions/aggregate';
import { dateTime } from './items/actions/date-time';
import { limitItems } from './items/actions/limit';
import { removeDuplicates } from './items/actions/remove-duplicates';
import { renameKeys } from './items/actions/rename-keys';
import { editFields } from './items/actions/set';
import { sortItems } from './items/actions/sort';
import { splitOut } from './items/actions/split-out';
import { summarizeItems } from './items/actions/summarize';
import { getGmailMessage } from './gmail/actions/message.get';
import { getManyGmailMessages } from './gmail/actions/message.get-all';
import { sendGmailMessage } from './gmail/actions/message.send';
import { geminiChatModel } from './google-gemini/actions/chat-model';
import { messageGemini } from './google-gemini/actions/text.message';
import { appendSheetRow } from './google-sheets/actions/sheet.append';
import { appendOrUpdateSheetRow } from './google-sheets/actions/sheet.append-or-update';
import { readSheetRows } from './google-sheets/actions/sheet.read';
import { downloadFile } from './http-request/actions/download';
import { getRequest } from './http-request/actions/get';
import { sendRequest } from './http-request/actions/send';
import { createIssue } from './github/actions/issue.create';
import { commentOnIssue } from './github/actions/issue.create-comment';
import { getIssue } from './github/actions/issue.get';
import { getManyIssues } from './github/actions/issue.get-all';
import { updateIssue } from './github/actions/issue.update';
import { repositoryEvent } from './github/actions/repository.event';
import { minimaxChatModel } from './minimax/actions/chat-model';
import { createDocument } from './google-docs/actions/document.create';
import { getDocument } from './google-docs/actions/document.get';
import { updateDocument } from './google-docs/actions/document.update';
import { deleteFile } from './google-drive/actions/file.delete';
import { searchFiles } from './google-drive/actions/file.search';
import { uploadFile } from './google-drive/actions/file.upload';
import { createFolder } from './google-drive/actions/folder.create';
import { pageAdded } from './notion/actions/data-source.page-added';
import { facebookEvent } from './facebook-trigger/actions/trigger';
import { formTrigger } from './form/actions/trigger';
import { sheetRowsChanged } from './google-sheets-trigger/actions/trigger';
import { loopBatches } from './loop/actions/batches';
import { manualTrigger } from './manual/actions/trigger';
import { scheduleTrigger } from './schedule/actions/trigger';
import { webhookTrigger } from './webhook/actions/trigger';
import { whatsAppEvent } from './whats-app-trigger/actions/trigger';
import { getManyDatabasePages } from './notion/actions/database-page.get-all';
import { getUser } from './notion/actions/user.get';
import { runJavaScript } from './code/actions/java-script';
import { runPython } from './code/actions/python';
import { deleteRows } from './data-table/actions/row.delete';
import { rowExists } from './data-table/actions/row.exists';
import { getRows } from './data-table/actions/row.get';
import { insertRows } from './data-table/actions/row.insert';
import { updateRows } from './data-table/actions/row.update';
import { upsertRows } from './data-table/actions/row.upsert';
import { clearTable } from './data-table/actions/table.clear';
import { createTable } from './data-table/actions/table.create';
import { deleteTable } from './data-table/actions/table.delete';
import { listTables } from './data-table/actions/table.list';
import { renameTable } from './data-table/actions/table.rename';
import { setLoopState } from './loop-state/actions/set';
import { appendItems } from './merge/actions/append';
import { combineItems } from './merge/actions/combine';
import { combineByPosition } from './merge/actions/combine-by-position';
import { stopWithError } from './stop-and-error/actions/stop';
import { waitInterval } from './wait/actions/interval';
import { waitUntil } from './wait/actions/until';
import { openAiChatModel } from './open-ai/actions/chat-model';
import { generateImage } from './open-ai/actions/image.generate';
import { messageOpenAi } from './open-ai/actions/text.message';
import { xAiChatModel } from './x-ai/actions/chat-model';
import { createSlackChannel } from './slack/actions/channel.create';
import { getSlackChannel } from './slack/actions/channel.get';
import { getManySlackChannels } from './slack/actions/channel.get-all';
import { getSlackChannelHistory } from './slack/actions/channel.history';
import { uploadSlackFile } from './slack/actions/file.upload';
import { deleteSlackMessage } from './slack/actions/message.delete';
import { getSlackPermalink } from './slack/actions/message.get-permalink';
import { sendSlackMessage } from './slack/actions/message.send';
import { updateSlackMessage } from './slack/actions/message.update';
import { addSlackReaction } from './slack/actions/reaction.add';
import { getSlackUser } from './slack/actions/user.get';
import { sendWhatsAppMessage } from './whats-app/actions/message.send';
import { sendWhatsAppTemplate } from './whats-app/actions/message.send-template';
import { createSupabaseRow } from './supabase/actions/row.create';
import { deleteSupabaseRows } from './supabase/actions/row.delete';
import { getSupabaseRows } from './supabase/actions/row.get';
import { getManySupabaseRows } from './supabase/actions/row.get-all';
import { updateSupabaseRows } from './supabase/actions/row.update';

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
	combineByPosition,
	waitInterval,
	waitUntil,
	stopWithError,
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
	extractCsv,
	extractXlsx,
	extractJson,
	extractText,
	extractPdf,
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
 * Native contracts that a construct of the typed flow emits, so no module has a factory for
 * them: `manual()` emits the Manual Trigger, and `forEach` emits Loop Over Items.
 */
export const flowNatives: ReadonlyArray<Action | Trigger> = [manualTrigger, loopBatches];

/** The source package of these nodes. */
export const nodesBaseNext: SourcePackage = {
	name: '@n8n/nodes-base-next',
	dir: path.resolve(__dirname, '..', '..'),
	actions,
	triggers,
	natives: [...nativeTriggers, ...flowNatives],
};
