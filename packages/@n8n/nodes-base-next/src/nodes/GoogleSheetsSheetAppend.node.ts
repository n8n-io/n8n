import { toNodeType } from '@n8n/node-sdk';

import { appendSheetRow } from './google-sheets/sheet.append';

export class GoogleSheetsSheetAppend extends toNodeType(appendSheetRow) {}
