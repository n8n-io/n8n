import { toVersionedNodeType } from '@n8n/node-sdk';

import { versionsOf } from '../registry';

export class GoogleSheetsSheetAppend extends toVersionedNodeType(
	versionsOf('googleSheets.sheet.append'),
) {}
