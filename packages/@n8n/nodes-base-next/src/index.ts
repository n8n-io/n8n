import { nodeNameOf, type Action } from '@n8n/node-sdk';

import { getRequest, sendRequest } from './nodes/http/request';
import { getManyDatabasePages } from './nodes/notion/database-page.get-all';

export const NODE_PACKAGE = '@n8n/nodes-base-next';

/** Every action this package ships, one n8n node type each. */
export const actions: readonly Action[] = [getManyDatabasePages, getRequest, sendRequest];

/** The n8n node type of an action, e.g. `@n8n/nodes-base-next.notionDatabasePageGetAll`. */
export const nodeTypeOf = (action: Pick<Action, 'id'>) =>
	`${NODE_PACKAGE}.${nodeNameOf(action.id)}`;
