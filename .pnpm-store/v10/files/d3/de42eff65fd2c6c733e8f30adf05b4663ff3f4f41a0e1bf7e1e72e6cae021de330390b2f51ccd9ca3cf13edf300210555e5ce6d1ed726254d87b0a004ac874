export declare class LoginTicket {
    private envelope?;
    private payload?;
    /**
     * Create a simple class to extract user ID from an ID Token
     *
     * @param {string} env Envelope of the jwt
     * @param {TokenPayload} pay Payload of the jwt
     * @constructor
     */
    constructor(env?: string, pay?: TokenPayload);
    getEnvelope(): string | undefined;
    getPayload(): TokenPayload | undefined;
    /**
     * Create a simple class to extract user ID from an ID Token
     *
     * @return The user ID
     */
    getUserId(): string | null;
    /**
     * Returns attributes from the login ticket.  This can contain
     * various information about the user session.
     *
     * @return The envelope and payload
     */
    getAttributes(): {
        envelope: string | undefined;
        payload: TokenPayload | undefined;
    };
}
export interface TokenPayload {
    /**
     * The Issuer Identifier for the Issuer of the response. Always
     * https://accounts.google.com or accounts.google.com for Google ID tokens.
     */
    iss: string;
    /**
     * Access token hash. Provides validation that the access token is tied to the
     * identity token. If the ID token is issued with an access token in the
     * server flow, this is always included. This can be used as an alternate
     * mechanism to protect against cross-site request forgery attacks, but if you
     * follow Step 1 and Step 3 it is not necessary to verify the access token.
     */
    at_hash?: string;
    /**
     * True if the user's e-mail address has been verified; otherwise false.
     */
    email_verified?: boolean;
    /**
     * An identifier for the user, unique among all Google accounts and never
     * reused. A Google account can have multiple emails at different points in
     * time, but the sub value is never changed. Use sub within your application
     * as the unique-identifier key for the user.
     */
    sub: string;
    /**
     * The client_id of the authorized presenter. This claim is only needed when
     * the party requesting the ID token is not the same as the audience of the ID
     * token. This may be the case at Google for hybrid apps where a web
     * application and Android app have a different client_id but share the same
     * project.
     */
    azp?: string;
    /**
     * The user's email address. This may not be unique and is not suitable for
     * use as a primary key. Provided only if your scope included the string
     * "email".
     */
    email?: string;
    /**
     * The URL of the user's profile page. Might be provided when:
     * - The request scope included the string "profile"
     * - The ID token is returned from a token refresh
     * - When profile claims are present, you can use them to update your app's
     * user records. Note that this claim is never guaranteed to be present.
     */
    profile?: string;
    /**
     * The URL of the user's profile picture. Might be provided when:
     * - The request scope included the string "profile"
     * - The ID token is returned from a token refresh
     * - When picture claims are present, you can use them to update your app's
     * user records. Note that this claim is never guaranteed to be present.
     */
    picture?: string;
    /**
     * The user's full name, in a displayable form. Might be provided when:
     * - The request scope included the string "profile"
     * - The ID token is returned from a token refresh
     * - When name claims are present, you can use them to update your app's user
     * records. Note that this claim is never guaranteed to be present.
     */
    name?: string;
    /**
     * The user's given name, in a displayable form. Might be provided when:
     * - The request scope included the string "profile"
     * - The ID token is returned from a token refresh
     * - When name claims are present, you can use them to update your app's user
     * records. Note that this claim is never guaranteed to be present.
     */
    given_name?: string;
    /**
     * The user's family name, in a displayable form. Might be provided when:
     * - The request scope included the string "profile"
     * - The ID token is returned from a token refresh
     * - When name claims are present, you can use them to update your app's user
     * records. Note that this claim is never guaranteed to be present.
     */
    family_name?: string;
    /**
     * Identifies the audience that this ID token is intended for. It must be one
     * of the OAuth 2.0 client IDs of your application.
     */
    aud: string;
    /**
     * The time the ID token was issued, represented in Unix time (integer
     * seconds).
     */
    iat: number;
    /**
     * The time the ID token expires, represented in Unix time (integer seconds).
     */
    exp: number;
    /**
     * The value of the nonce supplied by your app in the authentication request.
     * You should enforce protection against replay attacks by ensuring it is
     * presented only once.
     */
    nonce?: string;
    /**
     * The hosted G Suite domain of the user. Provided only if the user belongs to
     * a hosted domain.
     */
    hd?: string;
    /**
     * The user's locale, represented by a BCP 47 language tag.
     * Might be provided when a name claim is present.
     */
    locale?: string;
}
