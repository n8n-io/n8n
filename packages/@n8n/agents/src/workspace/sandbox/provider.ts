import type { RemoteSandboxProvider } from './types';

export const DEFAULT_SANDBOX_PROVIDER: RemoteSandboxProvider = 'n8n-sandbox';

const SANDBOX_PROVIDERS: ReadonlySet<string> = new Set(['daytona', 'n8n-sandbox']);

export function isSandboxProvider(value: string | undefined): value is RemoteSandboxProvider {
	return typeof value === 'string' && SANDBOX_PROVIDERS.has(value);
}

export function normalizeSandboxProvider(value: string | undefined): RemoteSandboxProvider {
	return isSandboxProvider(value) ? value : DEFAULT_SANDBOX_PROVIDER;
}
