import { toNodeType } from '@n8n/node-sdk';

import { readSheetRows } from './google-sheets/sheet.read';

export class GoogleSheetsSheetRead extends toNodeType(readSheetRows) {}
