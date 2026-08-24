export interface IRestApiContext {
	baseUrl: string;
	pushRef: string;
}

/**
 * Context for calling the public API (`/api/v1`) from the editor, authenticated
 * by the browser session cookie. It carries no `pushRef` — public API endpoints
 * don't push.
 */
export interface PublicApiContext {
	baseUrl: string;
}
