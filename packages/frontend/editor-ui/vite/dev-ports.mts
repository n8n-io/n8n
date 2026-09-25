import type { Plugin } from 'vite';

export const DEFAULT_BACKEND_PORT = 5678;
export const DEFAULT_EDITOR_PORT = 8080;

// `||` not `??`: an explicitly empty env var must fall back like an unset one.
export const readDevPort = (env: NodeJS.ProcessEnv, name: string, fallback: number): number =>
	Number(env[name] || fallback);

const assertDevPort = (env: NodeJS.ProcessEnv, name: string, fallback: number): number => {
	const port = readDevPort(env, name, fallback);
	// Vite silently boots on its own default 5173 when handed NaN, so an
	// unvalidated typo surfaces as a connection timeout minutes later.
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error(`${name} must be a port number, got: ${env[name]}`);
	}
	return port;
};

/**
 * N8N_PORT is the backend's own listen-port var. It moves both the injected
 * BASE_PATH and the REST base URL, so the pair relocates a whole dev instance
 * next to the default one.
 */
export const resolveDevPorts = (env: NodeJS.ProcessEnv) => ({
	backendPort: assertDevPort(env, 'N8N_PORT', DEFAULT_BACKEND_PORT),
	editorPort: assertDevPort(env, 'N8N_EDITOR_PORT', DEFAULT_EDITOR_PORT),
});

/**
 * Dev-server topology, kept out of the `serve` script so the env vars work on
 * Windows too (`cross-env` cannot expand `${N8N_PORT:-5678}`).
 *
 * `apply: 'serve'` skips builds; the mode/isPreview check skips `vite preview`
 * (serve/production) and vitest (serve/test).
 */
export const devServerPlugin = (env: NodeJS.ProcessEnv): Plugin => ({
	name: 'n8n-dev-server-topology',
	apply: 'serve',
	config: (_config, { mode, isPreview }) => {
		if (mode !== 'development' || isPreview) return;

		const { backendPort, editorPort } = resolveDevPorts(env);
		const backendOrigin = `http://localhost:${backendPort}`;

		return {
			server: {
				host: '0.0.0.0',
				port: editorPort,
				strictPort: true,
				proxy: {
					'^/(rest|webhook|webhook-test|form|form-test|mcp|mcp-test|healthz)': {
						target: backendOrigin,
						changeOrigin: true,
						ws: true,
					},
				},
			},
		};
	},
});
