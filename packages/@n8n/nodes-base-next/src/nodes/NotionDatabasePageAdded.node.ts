import { toTriggerNodeType } from '@n8n/node-sdk';

import { databasePageAdded } from './notion/database-page.added';

export class NotionDatabasePageAdded extends toTriggerNodeType(databasePageAdded) {}
