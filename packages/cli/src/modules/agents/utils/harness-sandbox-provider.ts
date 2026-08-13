import type { SandboxProvider } from '@n8n/agents/sandbox';
import { validate as uuidValidate, v5 as uuidv5, version as uuidVersion } from 'uuid';

const DELIMITER = ':';
const DAYTONA_USER_SANDBOX_NAMESPACE = 'c2e18fe8-0532-4f92-9254-b0b6ba944d8e';

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

export function createReusableDaytonaSandboxId(scope: {
	projectId: string;
	resourceId: string;
	adapter: string;
}): string {
	return uuidv5(
		`${scope.projectId}:${scope.resourceId}:${scope.adapter}`,
		DAYTONA_USER_SANDBOX_NAMESPACE,
	);
}

export function isReusableDaytonaSandboxId(value: string): boolean {
	return uuidValidate(value) && uuidVersion(value) === 5;
}
