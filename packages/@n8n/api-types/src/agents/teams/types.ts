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
}

/** Everything the setup stepper needs to render, in one round trip. */
export interface TeamsAgentSetupState {
	/** The URL Azure Bot Service posts activities to. */
	messagingEndpointUrl: string;
	/** Present once a credential is connected; the manifest needs its client ID. */
	botId: string | null;
	/** Null until a credential is connected, because the template needs the client ID. */
	deployToAzureUrl: string | null;
}
