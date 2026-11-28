/**
 * Deletes refresh tokens of the shared OAuth server. A refresh token keeps the resource that it
 * is for, and the resource of a server is its URL. Access tokens have no resource column: they
 * end after one hour, and the block check refuses them before that.
 */
export abstract class RefreshTokenPort {
	/** The tokens of one person for one server, on all of their clients. Returns the count. */
	abstract deleteForPerson(resource: string, userId: string): Promise<number>;

	/** The tokens of all people for one server. Returns the count. */
	abstract deleteForResource(resource: string): Promise<number>;
}
