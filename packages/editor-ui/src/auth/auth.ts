import { VueConstructor } from 'vue';
import { VueAuth, Auth0Options, RedirectCallback } from './VueAuth';
import { NavigationGuard } from 'vue-router';

type Auth0PluginOptions = {
	onRedirectCallback: RedirectCallback,
	domain: string,
	clientId: string,
	audience?: string,
	scope?: string,
	[key: string]: string | RedirectCallback | undefined
};

/** Define a default action to perform after authentication */
// tslint:disable-next-line: no-any
const DEFAULT_REDIRECT_CALLBACK = (appState: any) => window.history.replaceState({}, document.title, window.location.pathname);

let instance: VueAuth;

/** Returns the current instance of the SDK */
export const getInstance = () => instance;

/** Creates an instance of the Auth0 SDK. If one has already been created, it returns that instance */
export const useAuth0 = ({
	onRedirectCallback = DEFAULT_REDIRECT_CALLBACK,
	redirectUri = window.location.origin,
	...options
}) => {
	if (instance) return instance;

	// The 'instance' is simply a Vue object
	instance = new VueAuth();
	instance.init(onRedirectCallback, redirectUri, options as Auth0Options);

	return instance;
};

// Create a simple Vue plugin to expose the wrapper object throughout the application
// tslint:disable-next-line: variable-name
export const Auth0Plugin = {
	install(vue: VueConstructor, options: Auth0PluginOptions) {
		vue.prototype.$auth = useAuth0(options);
	}
};

/** Auth guard for Vue Router routes */
export const authGuard: NavigationGuard = (to, from, next) => {
	const authService = getInstance();

	const fn = () => {
		// Unwatch loading
		unwatch();

		// If the user is authenticated, continue with the route
		if (authService.isAuthenticated) {
			return next();
		}

		// Otherwise, log in
		authService.loginWithRedirect({ appState: { targetUrl: to.fullPath } });
	};

	// If loading has already finished, check our auth state using `fn()`
	if (!authService.loading) {
		return fn();
	}

	// Watch for the loading property to change before we check isAuthenticated
	const unwatch = authService.$watch('loading', (loading: boolean) => {
		if (loading === false) {
			return fn();
		}
	});
};
