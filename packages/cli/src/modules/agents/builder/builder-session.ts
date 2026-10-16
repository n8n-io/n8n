import type {
	Agent,
	BuiltTelemetry,
	BuiltTool,
	MemoryTaskUsageReport,
	ModelConfig,
	ScopedMemoryTaskEvent,
	Telemetry,
} from '@n8n/agents';

import type { BuilderTrackFn } from './builder-config-telemetry';

export interface BuilderCredentialService {
	list(options?: { type?: string; projectId?: string }): Promise<
		Array<{ id: string; name: string; type: string }>
	>;
	get(credentialId: string): Promise<{ name: string }>;
}

export interface BuilderSessionOptions {
	threadId: string;
	instructionsAddendum?: string;
	modelConfig: ModelConfig;
	reasoning: Parameters<Agent['reasoning']>[0];
	promptCaching?: Parameters<Agent['promptCaching']>[0];
	telemetry?: Telemetry | BuiltTelemetry;
	memoryTaskObserver?: (event: ScopedMemoryTaskEvent) => void;
	onMemoryUsage: (report: MemoryTaskUsageReport) => Promise<void>;
	track?: BuilderTrackFn;
	abortSignal: AbortSignal;
	hostTools: BuiltTool[];
	mcpTools?: Map<string, BuiltTool>;
	useEvalModelCatalog?: boolean;
}
