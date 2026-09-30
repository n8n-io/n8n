import { toNodeType } from '@n8n/node-sdk';

import { appendOrUpdateSheetRow } from './google-sheets/sheet.append-or-update';

export class GoogleSheetsSheetAppendOrUpdate extends toNodeType(appendOrUpdateSheetRow) {}
