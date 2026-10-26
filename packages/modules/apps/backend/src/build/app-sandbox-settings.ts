import type { SandboxConfig } from '@n8n/agents/sandbox';

export interface AppSandboxResolveOptions {
	checkEnabled?: boolean;
}

/** The CLI supplies instance-level provider settings without starting Instance AI. */
export abstract class AppSandboxSettings {
	abstract resolve(projectId: string, options?: AppSandboxResolveOptions): Promise<SandboxConfig>;
}
