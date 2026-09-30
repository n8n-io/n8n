import { toVersionedNodeType } from '@n8n/node-sdk';

import { versionsOf } from '../registry';

export class NotionDatabasePageGetAll extends toVersionedNodeType(
	versionsOf('notion.databasePage.getAll'),
) {}
