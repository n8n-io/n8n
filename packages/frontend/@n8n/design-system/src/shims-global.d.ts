export {};

declare global {
	interface Window {
		/** Injected by the server via static/base-path.js; '/' at root deployments. */
		BASE_PATH: string;
	}
}
