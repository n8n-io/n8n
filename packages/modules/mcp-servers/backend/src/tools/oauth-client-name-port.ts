/** Names of the OAuth clients that connect to a server, from their registration. */
export abstract class OAuthClientNamePort {
	/** The `client_name` of the registration, or `undefined` for an unknown client. */
	abstract getName(clientId: string): Promise<string | undefined>;
}
