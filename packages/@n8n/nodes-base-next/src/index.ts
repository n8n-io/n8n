import { nodeNameOf, type Action } from '@n8n/node-sdk';

import { getGmailMessage } from './nodes/gmail/message.get';
import { getManyGmailMessages } from './nodes/gmail/message.get-all';
import { sendGmailMessage } from './nodes/gmail/message.send';
import { messageGemini } from './nodes/google-gemini/text.message';
import { appendSheetRow } from './nodes/google-sheets/sheet.append';
import { appendOrUpdateSheetRow } from './nodes/google-sheets/sheet.append-or-update';
import { readSheetRows } from './nodes/google-sheets/sheet.read';
import { getRequest, sendRequest } from './nodes/http/request';
import { getManyDatabasePages } from './nodes/notion/database-page.get-all';

export { versionsOf } from './registry';
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
