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
		resource: string;
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

/**
 * One Microsoft sign-in the user can provision with. Several may exist in a
 * project, so the setup offers a picker rather than always signing in again.
 */
export interface TeamsManagerCredentialSummary {
	id: string;
	name: string;
	/** False while the credential exists but the OAuth round trip has not finished. */
	connected: boolean;
	/**
	 * True when the stored grant is missing a scope this flow now needs, which
	 * happens when the scope list grew after the user last signed in.
	 */
	reconnectRequired: boolean;
	/** Tenant the account belongs to, shown so the user can tell two sign-ins apart. */
	organizationName: string | null;
	tenantId: string | null;
}

/**
 * Whether the recommended setup can run at all, and what the user can pick.
 *
 * `managedSetupAvailable` is false on any instance without credential
 * overwrites for the manager credential, which is every self-hosted instance
 * whose operator has not supplied their own client ID and secret.
 */
export interface TeamsManagedSetupState {
	managedSetupAvailable: boolean;
	managerCredentials: TeamsManagerCredentialSummary[];
	/**
	 * One prompt an administrator uses to approve every permission n8n needs,
	 * across both Microsoft Graph and Azure management. A sign-in cannot ask for
	 * both, because a code is redeemed for one resource at a time.
	 */
	adminConsentUrl: string | null;
}

export interface CreateTeamsManagerCredentialResponse {
	id: string;
	name: string;
	type: 'microsoftTeamsManagerOAuth2Api';
	isResolvable: false;
}

/** What the Entra app step leaves behind, and what the setup shows for it. */
export interface TeamsProvisionedAppSummary {
	/** The channel credential n8n wrote, ready for the steps that follow. */
	credentialId: string;
	appId: string;
	appName: string;
	organizationName: string | null;
	entraAppUrl: string;
	/**
	 * When the client secret stops working. n8n created it, so the user cannot
	 * replace it by hand — the channel settings offer a renew instead.
	 */
	secretExpiresAt: string;
}

/** An Azure subscription the signed-in account can create the bot in. */
export interface TeamsAzureSubscription {
	id: string;
	name: string;
}

/** What the bot step created, once n8n did it rather than the Azure portal. */
export interface TeamsProvisionedBotSummary {
	botName: string;
	resourceGroup: string;
	subscriptionId: string;
}
