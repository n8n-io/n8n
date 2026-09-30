import { toVersionedNodeType } from '@n8n/node-sdk';

import { versionsOf } from '../registry';

export class GoogleSheetsSheetRead extends toVersionedNodeType(
	versionsOf('googleSheets.sheet.read'),
) {}
