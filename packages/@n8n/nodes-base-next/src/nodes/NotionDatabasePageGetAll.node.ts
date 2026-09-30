import { toNodeType } from '@n8n/node-sdk';

import { getManyDatabasePages } from './notion/database-page.get-all';

export class NotionDatabasePageGetAll extends toNodeType(getManyDatabasePages) {}
