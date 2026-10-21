import type { SandboxConfig } from '@n8n/agents/sandbox';

/** The CLI supplies instance-level provider settings without starting Instance AI. */
export abstract class AppSandboxSettings {
	abstract resolve(): Promise<SandboxConfig>;
}
