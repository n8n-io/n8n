import GoTrueAdminApi from './GoTrueAdminApi';
import { AuthError } from './lib/errors';
import { Fetch } from './lib/fetch';
import { Deferred } from './lib/helpers';
import type { AuthChangeEvent, AuthResponse, AuthTokenResponse, AuthTokenResponsePassword, AuthOtpResponse, CallRefreshTokenResult, GoTrueClientOptions, InitializeResult, OAuthResponse, SSOResponse, Session, SignInWithIdTokenCredentials, SignInWithOAuthCredentials, SignInWithPasswordCredentials, SignInWithPasswordlessCredentials, SignUpWithPasswordCredentials, SignInWithSSO, SignOut, Subscription, SupportedStorage, UserAttributes, UserResponse, VerifyOtpParams, GoTrueMFAApi, ResendParams, AuthFlowType, LockFunc, UserIdentity, SignInAnonymouslyCredentials, JWK, JwtPayload, JwtHeader } from './lib/types';
export default class GoTrueClient {
    private static nextInstanceID;
    private instanceID;
    /**
     * Namespace for the GoTrue admin methods.
     * These methods should only be used in a trusted server-side environment.
     */
    admin: GoTrueAdminApi;
    /**
     * Namespace for the MFA methods.
     */
    mfa: GoTrueMFAApi;
    /**
     * The storage key used to identify the values saved in localStorage
     */
    protected storageKey: string;
    protected flowType: AuthFlowType;
    /**
     * The JWKS used for verifying asymmetric JWTs
     */
    protected jwks: {
        keys: JWK[];
    };
    protected jwks_cached_at: number;
    protected autoRefreshToken: boolean;
    protected persistSession: boolean;
    protected storage: SupportedStorage;
    protected memoryStorage: {
        [key: string]: string;
    } | null;
    protected stateChangeEmitters: Map<string, Subscription>;
    protected autoRefreshTicker: ReturnType<typeof setInterval> | null;
    protected visibilityChangedCallback: (() => Promise<any>) | null;
    protected refreshingDeferred: Deferred<CallRefreshTokenResult> | null;
    /**
     * Keeps track of the async client initialization.
     * When null or not yet resolved the auth state is `unknown`
     * Once resolved the the auth state is known and it's save to call any further client methods.
     * Keep extra care to never reject or throw uncaught errors
     */
    protected initializePromise: Promise<InitializeResult> | null;
    protected detectSessionInUrl: boolean;
    protected url: string;
    protected headers: {
        [key: string]: string;
    };
    protected hasCustomAuthorizationHeader: boolean;
    protected suppressGetSessionWarning: boolean;
    protected fetch: Fetch;
    protected lock: LockFunc;
    protected lockAcquired: boolean;
    protected pendingInLock: Promise<any>[];
    /**
     * Used to broadcast state change events to other tabs listening.
     */
    protected broadcastChannel: BroadcastChannel | null;
    protected logDebugMessages: boolean;
    protected logger: (message: string, ...args: any[]) => void;
    /**
     * Create a new client for use in the browser.
     */
    constructor(options: GoTrueClientOptions);
    private _debug;
    /**
     * Initializes the client session either from the url or from storage.
     * This method is automatically called when instantiating the client, but should also be called
     * manually when checking for an error from an auth redirect (oauth, magiclink, password recovery, etc).
     */
    initialize(): Promise<InitializeResult>;
    /**
     * IMPORTANT:
     * 1. Never throw in this method, as it is called from the constructor
     * 2. Never return a session from this method as it would be cached over
     *    the whole lifetime of the client
     */
    private _initialize;
    /**
     * Creates a new anonymous user.
     *
     * @returns A session where the is_anonymous claim in the access token JWT set to true
     */
    signInAnonymously(credentials?: SignInAnonymouslyCredentials): Promise<AuthResponse>;
    /**
     * Creates a new user.
     *
     * Be aware that if a user account exists in the system you may get back an
     * error message that attempts to hide this information from the user.
     * This method has support for PKCE via email signups. The PKCE flow cannot be used when autoconfirm is enabled.
     *
     * @returns A logged-in session if the server has "autoconfirm" ON
     * @returns A user if the server has "autoconfirm" OFF
     */
    signUp(credentials: SignUpWithPasswordCredentials): Promise<AuthResponse>;
    /**
     * Log in an existing user with an email and password or phone and password.
     *
     * Be aware that you may get back an error message that will not distinguish
     * between the cases where the account does not exist or that the
     * email/phone and password combination is wrong or that the account can only
     * be accessed via social login.
     */
    signInWithPassword(credentials: SignInWithPasswordCredentials): Promise<AuthTokenResponsePassword>;
    /**
     * Log in an existing user via a third-party provider.
     * This method supports the PKCE flow.
     */
    signInWithOAuth(credentials: SignInWithOAuthCredentials): Promise<OAuthResponse>;
    /**
     * Log in an existing user by exchanging an Auth Code issued during the PKCE flow.
     */
    exchangeCodeForSession(authCode: string): Promise<AuthTokenResponse>;
    private _exchangeCodeForSession;
    /**
     * Allows signing in with an OIDC ID token. The authentication provider used
     * should be enabled and configured.
     */
    signInWithIdToken(credentials: SignInWithIdTokenCredentials): Promise<AuthTokenResponse>;
    /**
     * Log in a user using magiclink or a one-time password (OTP).
     *
     * If the `{{ .ConfirmationURL }}` variable is specified in the email template, a magiclink will be sent.
     * If the `{{ .Token }}` variable is specified in the email template, an OTP will be sent.
     * If you're using phone sign-ins, only an OTP will be sent. You won't be able to send a magiclink for phone sign-ins.
     *
     * Be aware that you may get back an error message that will not distinguish
     * between the cases where the account does not exist or, that the account
     * can only be accessed via social login.
     *
     * Do note that you will need to configure a Whatsapp sender on Twilio
     * if you are using phone sign in with the 'whatsapp' channel. The whatsapp
     * channel is not supported on other providers
     * at this time.
     * This method supports PKCE when an email is passed.
     */
    signInWithOtp(credentials: SignInWithPasswordlessCredentials): Promise<AuthOtpResponse>;
    /**
     * Log in a user given a User supplied OTP or TokenHash received through mobile or email.
     */
    verifyOtp(params: VerifyOtpParams): Promise<AuthResponse>;
    /**
     * Attempts a single-sign on using an enterprise Identity Provider. A
     * successful SSO attempt will redirect the current page to the identity
     * provider authorization page. The redirect URL is implementation and SSO
     * protocol specific.
     *
     * You can use it by providing a SSO domain. Typically you can extract this
     * domain by asking users for their email address. If this domain is
     * registered on the Auth instance the redirect will use that organization's
     * currently active SSO Identity Provider for the login.
     *
     * If you have built an organization-specific login page, you can use the
     * organization's SSO Identity Provider UUID directly instead.
     */
    signInWithSSO(params: SignInWithSSO): Promise<SSOResponse>;
    /**
     * Sends a reauthentication OTP to the user's email or phone number.
     * Requires the user to be signed-in.
     */
    reauthenticate(): Promise<AuthResponse>;
    private _reauthenticate;
    /**
     * Resends an existing signup confirmation email, email change email, SMS OTP or phone change OTP.
     */
    resend(credentials: ResendParams): Promise<AuthOtpResponse>;
    /**
     * Returns the session, refreshing it if necessary.
     *
     * The session returned can be null if the session is not detected which can happen in the event a user is not signed-in or has logged out.
     *
     * **IMPORTANT:** This method loads values directly from the storage attached
     * to the client. If that storage is based on request cookies for example,
     * the values in it may not be authentic and therefore it's strongly advised
     * against using this method and its results in such circumstances. A warning
     * will be emitted if this is detected. Use {@link #getUser()} instead.
     */
    getSession(): Promise<{
        data: {
            session: Session;
        };
        error: null;
    } | {
        data: {
            session: null;
        };
        error: AuthError;
    } | {
        data: {
            session: null;
        };
        error: null;
    }>;
    /**
     * Acquires a global lock based on the storage key.
     */
    private _acquireLock;
    /**
     * Use instead of {@link #getSession} inside the library. It is
     * semantically usually what you want, as getting a session involves some
     * processing afterwards that requires only one client operating on the
     * session at once across multiple tabs or processes.
     */
    private _useSession;
    /**
     * NEVER USE DIRECTLY!
     *
     * Always use {@link #_useSession}.
     */
    private __loadSession;
    /**
     * Gets the current user details if there is an existing session. This method
     * performs a network request to the Supabase Auth server, so the returned
     * value is authentic and can be used to base authorization rules on.
     *
     * @param jwt Takes in an optional access token JWT. If no JWT is provided, the JWT from the current session is used.
     */
    getUser(jwt?: string): Promise<UserResponse>;
    private _getUser;
    /**
     * Updates user data for a logged in user.
     */
    updateUser(attributes: UserAttributes, options?: {
        emailRedirectTo?: string | undefined;
    }): Promise<UserResponse>;
    protected _updateUser(attributes: UserAttributes, options?: {
        emailRedirectTo?: string | undefined;
    }): Promise<UserResponse>;
    /**
     * Sets the session data from the current session. If the current session is expired, setSession will take care of refreshing it to obtain a new session.
     * If the refresh token or access token in the current session is invalid, an error will be thrown.
     * @param currentSession The current session that minimally contains an access token and refresh token.
     */
    setSession(currentSession: {
        access_token: string;
        refresh_token: string;
    }): Promise<AuthResponse>;
    protected _setSession(currentSession: {
        access_token: string;
        refresh_token: string;
    }): Promise<AuthResponse>;
    /**
     * Returns a new session, regardless of expiry status.
     * Takes in an optional current session. If not passed in, then refreshSession() will attempt to retrieve it from getSession().
     * If the current session's refresh token is invalid, an error will be thrown.
     * @param currentSession The current session. If passed in, it must contain a refresh token.
     */
    refreshSession(currentSession?: {
        refresh_token: string;
    }): Promise<AuthResponse>;
    protected _refreshSession(currentSession?: {
        refresh_token: string;
    }): Promise<AuthResponse>;
    /**
     * Gets the session data from a URL string
     */
    private _getSessionFromURL;
    /**
     * Checks if the current URL contains parameters given by an implicit oauth grant flow (https://www.rfc-editor.org/rfc/rfc6749.html#section-4.2)
     */
    private _isImplicitGrantCallback;
    /**
     * Checks if the current URL and backing storage contain parameters given by a PKCE flow
     */
    private _isPKCECallback;
    /**
     * Inside a browser context, `signOut()` will remove the logged in user from the browser session and log them out - removing all items from localstorage and then trigger a `"SIGNED_OUT"` event.
     *
     * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to `auth.api.signOut(JWT: string)`.
     * There is no way to revoke a user's access token jwt until it expires. It is recommended to set a shorter expiry on the jwt for this reason.
     *
     * If using `others` scope, no `SIGNED_OUT` event is fired!
     */
    signOut(options?: SignOut): Promise<{
        error: AuthError | null;
    }>;
    protected _signOut({ scope }?: SignOut): Promise<{
        error: AuthError | null;
    }>;
    /**
     * Receive a notification every time an auth event happens.
     * @param callback A callback function to be invoked when an auth event happens.
     */
    onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>): {
        data: {
            subscription: Subscription;
        };
    };
    private _emitInitialSession;
    /**
     * Sends a password reset request to an email address. This method supports the PKCE flow.
     *
     * @param email The email address of the user.
     * @param options.redirectTo The URL to send the user to after they click the password reset link.
     * @param options.captchaToken Verification token received when the user completes the captcha on the site.
     */
    resetPasswordForEmail(email: string, options?: {
        redirectTo?: string;
        captchaToken?: string;
    }): Promise<{
        data: {};
        error: null;
    } | {
        data: null;
        error: AuthError;
    }>;
    /**
     * Gets all the identities linked to a user.
     */
    getUserIdentities(): Promise<{
        data: {
            identities: UserIdentity[];
        };
        error: null;
    } | {
        data: null;
        error: AuthError;
    }>;
    /**
     * Links an oauth identity to an existing user.
     * This method supports the PKCE flow.
     */
    linkIdentity(credentials: SignInWithOAuthCredentials): Promise<OAuthResponse>;
    /**
     * Unlinks an identity from a user by deleting it. The user will no longer be able to sign in with that identity once it's unlinked.
     */
    unlinkIdentity(identity: UserIdentity): Promise<{
        data: {};
        error: null;
    } | {
        data: null;
        error: AuthError;
    }>;
    /**
     * Generates a new JWT.
     * @param refreshToken A valid refresh token that was returned on login.
     */
    private _refreshAccessToken;
    private _isValidSession;
    private _handleProviderSignIn;
    /**
     * Recovers the session from LocalStorage and refreshes the token
     * Note: this method is async to accommodate for AsyncStorage e.g. in React native.
     */
    private _recoverAndRefresh;
    private _callRefreshToken;
    private _notifyAllSubscribers;
    /**
     * set currentSession and currentUser
     * process to _startAutoRefreshToken if possible
     */
    private _saveSession;
    private _removeSession;
    /**
     * Removes any registered visibilitychange callback.
     *
     * {@see #startAutoRefresh}
     * {@see #stopAutoRefresh}
     */
    private _removeVisibilityChangedCallback;
    /**
     * This is the private implementation of {@link #startAutoRefresh}. Use this
     * within the library.
     */
    private _startAutoRefresh;
    /**
     * This is the private implementation of {@link #stopAutoRefresh}. Use this
     * within the library.
     */
    private _stopAutoRefresh;
    /**
     * Starts an auto-refresh process in the background. The session is checked
     * every few seconds. Close to the time of expiration a process is started to
     * refresh the session. If refreshing fails it will be retried for as long as
     * necessary.
     *
     * If you set the {@link GoTrueClientOptions#autoRefreshToken} you don't need
     * to call this function, it will be called for you.
     *
     * On browsers the refresh process works only when the tab/window is in the
     * foreground to conserve resources as well as prevent race conditions and
     * flooding auth with requests. If you call this method any managed
     * visibility change callback will be removed and you must manage visibility
     * changes on your own.
     *
     * On non-browser platforms the refresh process works *continuously* in the
     * background, which may not be desirable. You should hook into your
     * platform's foreground indication mechanism and call these methods
     * appropriately to conserve resources.
     *
     * {@see #stopAutoRefresh}
     */
    startAutoRefresh(): Promise<void>;
    /**
     * Stops an active auto refresh process running in the background (if any).
     *
     * If you call this method any managed visibility change callback will be
     * removed and you must manage visibility changes on your own.
     *
     * See {@link #startAutoRefresh} for more details.
     */
    stopAutoRefresh(): Promise<void>;
    /**
     * Runs the auto refresh token tick.
     */
    private _autoRefreshTokenTick;
    /**
     * Registers callbacks on the browser / platform, which in-turn run
     * algorithms when the browser window/tab are in foreground. On non-browser
     * platforms it assumes always foreground.
     */
    private _handleVisibilityChange;
    /**
     * Callback registered with `window.addEventListener('visibilitychange')`.
     */
    private _onVisibilityChanged;
    /**
     * Generates the relevant login URL for a third-party provider.
     * @param options.redirectTo A URL or mobile address to send the user to after they are confirmed.
     * @param options.scopes A space-separated list of scopes granted to the OAuth application.
     * @param options.queryParams An object of key-value pairs containing query parameters granted to the OAuth application.
     */
    private _getUrlForProvider;
    private _unenroll;
    /**
     * {@see GoTrueMFAApi#enroll}
     */
    private _enroll;
    /**
     * {@see GoTrueMFAApi#verify}
     */
    private _verify;
    /**
     * {@see GoTrueMFAApi#challenge}
     */
    private _challenge;
    /**
     * {@see GoTrueMFAApi#challengeAndVerify}
     */
    private _challengeAndVerify;
    /**
     * {@see GoTrueMFAApi#listFactors}
     */
    private _listFactors;
    /**
     * {@see GoTrueMFAApi#getAuthenticatorAssuranceLevel}
     */
    private _getAuthenticatorAssuranceLevel;
    private fetchJwk;
    /**
     * @experimental This method may change in future versions.
     * @description Gets the claims from a JWT. If the JWT is symmetric JWTs, it will call getUser() to verify against the server. If the JWT is asymmetric, it will be verified against the JWKS using the WebCrypto API.
     */
    getClaims(jwt?: string, jwks?: {
        keys: JWK[];
    }): Promise<{
        data: {
            claims: JwtPayload;
            header: JwtHeader;
            signature: Uint8Array;
        };
        error: null;
    } | {
        data: null;
        error: AuthError;
    } | {
        data: null;
        error: null;
    }>;
}
//# sourceMappingURL=GoTrueClient.d.ts.map