import { Vue, Component } from 'vue-property-decorator';
import createAuth0Client, { PopupLoginOptions, Auth0Client, RedirectLoginOptions, GetIdTokenClaimsOptions, GetTokenSilentlyOptions, GetTokenWithPopupOptions, LogoutOptions } from '@auth0/auth0-spa-js';
import { User, UserDetails } from './User';

export type Auth0Options = {
	domain: string;
	clientId: string;
	audience?: string;
	scope?: string;
	userDetails: UserDetails;
};

// tslint:disable-next-line: no-any
export type RedirectCallback = (appState: any) => void;

/** Based on https://blog.risingstack.com/auth0-vue-typescript-quickstart-docs/#securetheprofilepage */
@Component({})
export class VueAuth extends Vue {
	loading = true;
	isAuthenticated?= false;
	user?: User;
	auth0Client?: Auth0Client;
	error?: Error;

	async getUser(userDetails: UserDetails) {
		let token;
		try {
			token = await this.auth0Client?.getTokenSilently();
			return new User(userDetails, token);
		} catch (err) {
			console.warn('Unable to get token', err);
			return undefined;
		}
	}

	/** Authenticates the user using the redirect method */
	loginWithRedirect (o: RedirectLoginOptions) {
		return this.auth0Client?.loginWithRedirect(o);
	}

	/** Returns all the claims present in the ID token */
	getIdTokenClaims (o: GetIdTokenClaimsOptions) {
		return this.auth0Client?.getIdTokenClaims(o);
	}

	/** Returns the access token. If the token is invalid or missing, a new one is retrieved */
	getTokenSilently (o: GetTokenSilentlyOptions) {
		return this.auth0Client?.getTokenSilently(o);
	}

	/** Gets the access token using a popup window */
	getTokenWithPopup (o: GetTokenWithPopupOptions) {
		return this.auth0Client?.getTokenWithPopup(o);
	}

	/** Logs the user out and removes their session on the authorization server */
	logout (o: LogoutOptions) {
		return this.auth0Client?.logout(o);
	}

	/** Use this lifecycle method to instantiate the SDK client */
	async init (onRedirectCallback: RedirectCallback, redirectUri: string, auth0Options: Auth0Options) {
		// Create a new instance of the SDK client using members of the given options object
		this.auth0Client = await createAuth0Client({
			domain: auth0Options.domain,
			client_id: auth0Options.clientId, // eslint-disable-line @typescript-eslint/camelcase
			audience: auth0Options.audience,
			scope: auth0Options.scope,
			redirect_uri: redirectUri, // eslint-disable-line @typescript-eslint/camelcase
		});

		try {
			// If the user is returning to the app after authentication..
			if (
				window.location.search.includes('error=') ||
				(window.location.search.includes('code=') && window.location.search.includes('state='))
			) {
				// handle the redirect and retrieve tokens
				const { appState } = await this.auth0Client?.handleRedirectCallback() ?? { appState: undefined };

				// Notify subscribers that the redirect callback has happened, passing the appState
				// (useful for retrieving any pre-authentication state)
				onRedirectCallback(appState);
			}
		} catch (e) {
			console.error(e);
			this.error = e;
		} finally {
			// Initialize our internal authentication state when the page is reloaded
			this.isAuthenticated = await this.auth0Client?.isAuthenticated();
			this.user = await this.getUser(auth0Options.userDetails);
			this.loading = false;
		}
	}
}
