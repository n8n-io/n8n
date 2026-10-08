import type { InstanceAiCredentialService } from '@n8n/instance-ai';

import type { BuilderTrackFn } from '../builder-config-telemetry';

interface SetupToolDeps {
	/** Scopes setup to the agent's project. */
	projectId: string;
	track: BuilderTrackFn;
}

export interface CredentialSetupDeps extends SetupToolDeps {
	credentialService: InstanceAiCredentialService;
	isCredentialTypeKnown?: (credentialType: string) => boolean;
	/** Returns configured channel credential IDs for credential reuse. */
	listIntegrationCredentialIds?: () => Promise<string[]>;
}

export interface ChannelSetupDeps extends SetupToolDeps {
	agentId: string;
	/** Lists the channel types that setup can offer. */
	listChatIntegrationTypes: () => string[];
}
