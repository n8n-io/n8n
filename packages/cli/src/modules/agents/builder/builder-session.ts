import type { BuilderTrackFn } from './builder-config-telemetry';
import type { BuilderTelemetrySession } from './builder-telemetry-session';

// Instance AI reaches the session helpers through this contract file.
export {
	builderTelemetrySessionProperties,
	runInBuilderTelemetrySession,
} from './builder-telemetry-session';

export interface BuilderCredentialService {
	list(options?: { type?: string; projectId?: string }): Promise<
		Array<{ id: string; name: string; type: string }>
	>;
	get(credentialId: string): Promise<{ name: string }>;
}

export interface BuilderToolsOptions {
	track?: BuilderTrackFn;
	useEvalModelCatalog?: boolean;
	/** The Assistant thread and run, reported on the agent write events. */
	session?: BuilderTelemetrySession;
}
