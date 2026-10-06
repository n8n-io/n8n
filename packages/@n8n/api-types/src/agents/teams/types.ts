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

export interface TeamsAgentSetupState {
	/** The URL Azure Bot Service posts activities to. */
	messagingEndpointUrl: string;
	/** Present once a credential is connected; the manifest needs its client ID. */
	botId: string | null;
	/** Null until a credential is connected, because the template needs the client ID. */
	deployToAzureUrl: string | null;
	/**
	 * Name of the agent already using the selected credential, if any. Microsoft
	 * binds one Azure bot to one app registration, so a second deployment with
	 * the same credential is refused by the portal and both agents would in any
	 * case share one messaging endpoint.
	 */
	credentialClaimedBy: string | null;
	/**
	 * What the manifest uses when the settings override neither. Computed here so
	 * the fields show the values Teams will actually display, rather than the
	 * frontend guessing at the same derivation.
	 */
	defaultDisplayName: string;
	defaultDescription: string;
}

/**
 * Result of checking that a credential can actually reach Microsoft, before the
 * channel is connected. A wrong client secret otherwise surfaces only when the
 * first message fails.
 */
export type TeamsCredentialCheck =
	| { status: 'ok' }
	| {
			status: 'failed';
			reason: 'certificate' | 'incomplete' | 'rejected' | 'unreachable' | 'cloud';
	  };
