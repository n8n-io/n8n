/**
 * The subset of the Teams app manifest this channel emits.
 *
 * Deliberately narrower than the published schema: every field here is one we
 * set, so a field Teams rejects is a compile error rather than a failed upload.
 */
export interface TeamsAgentAppManifest {
	$schema: string;
	manifestVersion: string;
	version: string;
	id: string;
	packageName: string;
	developer: {
		name: string;
		websiteUrl: string;
		privacyUrl: string;
		termsOfUseUrl: string;
	};
	name: {
		short: string;
		full: string;
	};
	description: {
		short: string;
		full: string;
	};
	icons: {
		color: string;
		outline: string;
	};
	accentColor: string;
	bots: Array<{
		botId: string;
		scopes: string[];
		isNotificationOnly: boolean;
		supportsFiles: boolean;
	}>;
	permissions: string[];
	validDomains: string[];
	/** Required alongside resource-specific permissions; omitted without them. */
	webApplicationInfo?: {
		id: string;
	};
	/** Present only when a read-all permission is turned on. */
	authorization?: {
		permissions: {
			resourceSpecific: Array<{
				name: string;
				type: 'Application';
			}>;
		};
	};
}

/** Everything the setup stepper needs to render, in one round trip. */
export interface TeamsAgentSetupState {
	/** The URL Azure Bot Service posts activities to. */
	messagingEndpointUrl: string;
	/** Present once a credential is connected; the manifest needs its client ID. */
	botId: string | null;
	/** Null until a credential is connected, because the template needs the client ID. */
	deployToAzureUrl: string | null;
	/**
	 * The name the deployment gives the bot. Shown so the user can pick it out of
	 * their Bot Services list — we cannot deep-link to the resource itself,
	 * because its subscription and resource group are chosen at deploy time.
	 */
	suggestedBotName: string;
	/**
	 * Opens the 1:1 chat with this agent's app in Teams. Null until a credential
	 * supplies the tenant. Uses the manifest id, which is what a sideloaded
	 * custom app is addressed by.
	 */
	teamsChatDeepLink: string | null;
}

/**
 * Progress of the "connect the bot" step, which picks a bot up from the first
 * activity that reaches the messaging endpoint.
 */
export type TeamsDiscoveryState =
	| { status: 'idle' }
	| { status: 'waiting' }
	| { status: 'expired' }
	| {
			status: 'found';
			/** Application (client) ID, read from the verified Bot Framework token. */
			clientId: string;
			/** Absent when the activity carried no tenant, e.g. from Web Chat. */
			tenantId: string | null;
			/**
			 * An existing credential in this project already holding these values,
			 * so the step can offer reuse instead of asking for a secret.
			 */
			existingCredentialId: string | null;
	  };

/**
 * Result of checking that a credential can actually reach Microsoft, before the
 * channel is connected. A wrong client secret otherwise surfaces only when the
 * first message fails.
 */
export type TeamsCredentialCheck =
	| { status: 'ok'; clientId: string }
	| { status: 'failed'; reason: 'certificate' | 'incomplete' | 'rejected' | 'unreachable' };
