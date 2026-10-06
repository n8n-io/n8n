import type { Action, Trigger } from '@n8n/node-sdk';
import type { SourcePackage } from '@n8n/node-sdk/registry';
import path from 'node:path';

import { anthropicChatModel } from './anthropic/actions/chat-model';
import { getGmailMessage } from './gmail/actions/message.get';
import { getManyGmailMessages } from './gmail/actions/message.get-all';
import { sendGmailMessage } from './gmail/actions/message.send';
import { geminiChatModel } from './google-gemini/actions/chat-model';
import { messageGemini } from './google-gemini/actions/text.message';
import { appendSheetRow } from './google-sheets/actions/sheet.append';
import { appendOrUpdateSheetRow } from './google-sheets/actions/sheet.append-or-update';
import { readSheetRows } from './google-sheets/actions/sheet.read';
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
import { sheetRowsChanged } from './google-sheets-trigger/actions/trigger';
import { whatsAppEvent } from './whats-app-trigger/actions/trigger';
import { getManyDatabasePages } from './notion/actions/database-page.get-all';
import { getUser } from './notion/actions/user.get';
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
	readSheetRows,
	appendSheetRow,
	appendOrUpdateSheetRow,
	sendGmailMessage,
	getManyGmailMessages,
	getGmailMessage,
	messageGemini,
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
export const nativeTriggers: readonly Trigger[] = [whatsAppEvent, facebookEvent, sheetRowsChanged];

/** The integration nodes: each one is for one vendor or product. */
export const nodesIntegrations: SourcePackage = {
	name: '@n8n/nodes-integrations',
	dir: path.resolve(__dirname, '..', '..'),
	actions,
	triggers,
	natives: nativeTriggers,
};
