/** The grants that the n8n sign-in gave for the URL of a server. */
export abstract class OAuthGrantPort {
	/** Deletes the refresh tokens that were issued for this resource URL. */
	abstract revokeForResource(resource: string): Promise<void>;
}
