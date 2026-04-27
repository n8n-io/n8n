import type { AppDefinition } from '../types';
import { GMAIL_APP } from './gmail';

export const APP_REGISTRY: readonly AppDefinition[] = [GMAIL_APP];

export function findAppDefinition(kind: string): AppDefinition | undefined {
	return APP_REGISTRY.find((a) => a.kind === kind);
}
