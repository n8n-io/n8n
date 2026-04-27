import type { AppDefinition } from '../types';
import { GMAIL_APP } from './gmail';
import { GOOGLE_SHEETS_APP } from './googleSheets';

export const APP_REGISTRY: readonly AppDefinition[] = [GMAIL_APP, GOOGLE_SHEETS_APP];

export function findAppDefinition(kind: string): AppDefinition | undefined {
	return APP_REGISTRY.find((a) => a.kind === kind);
}
