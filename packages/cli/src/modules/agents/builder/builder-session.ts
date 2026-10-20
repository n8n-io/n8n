import type { BuilderTrackFn } from './builder-config-telemetry';

export interface BuilderCredentialService {
	list(options?: { type?: string; projectId?: string }): Promise<
		Array<{ id: string; name: string; type: string }>
	>;
	get(credentialId: string): Promise<{ name: string }>;
}

export interface BuilderToolsOptions {
	track?: BuilderTrackFn;
	useEvalModelCatalog?: boolean;
	excludeToolNames?: string[];
}
