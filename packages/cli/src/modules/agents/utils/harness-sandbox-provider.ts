import type { SandboxProvider } from '@n8n/agents/sandbox';

const DELIMITER = ':';

export function createHarnessAdapterStorageIdentity(
	adapter: string,
	sandboxProvider: SandboxProvider,
): string {
	return `${adapter}${DELIMITER}${sandboxProvider}`;
}

export function getStoredHarnessSandboxProvider(value: string): SandboxProvider | undefined {
	const provider = value.slice(value.lastIndexOf(DELIMITER) + 1);
	return provider === 'daytona' || provider === 'n8n-sandbox' ? provider : undefined;
}
