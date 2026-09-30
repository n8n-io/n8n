import { toVersionedNodeType } from '@n8n/node-sdk';

import { versionsOf } from '../registry';

export class GoogleSheetsSheetAppendOrUpdate extends toVersionedNodeType(
	versionsOf('googleSheets.sheet.appendOrUpdate'),
) {}
