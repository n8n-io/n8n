import type { ConfigEnv, UserConfig } from 'vite';
import { describe, expect, it } from 'vitest';

import { devServerPlugin, resolveDevPorts } from './dev-ports.mjs';

const runConfigHook = (env: NodeJS.ProcessEnv, configEnv: ConfigEnv) => {
	const plugin = devServerPlugin(env);
	const hook = plugin.config as (c: UserConfig, e: ConfigEnv) => UserConfig | undefined;
	return hook({}, configEnv);
};

const DEV: ConfigEnv = { command: 'serve', mode: 'development' };
const VITEST: ConfigEnv = { command: 'serve', mode: 'test' };
const PREVIEW: ConfigEnv = { command: 'serve', mode: 'production', isPreview: true };

describe('resolveDevPorts', () => {
	it.each([
		['unset', {}, 5678, 8080],
		['empty', { N8N_PORT: '', N8N_EDITOR_PORT: '' }, 5678, 8080],
		['set', { N8N_PORT: '5699', N8N_EDITOR_PORT: '8082' }, 5699, 8082],
	])('resolves %s ports', (_label, env, backendPort, editorPort) => {
		expect(resolveDevPorts(env)).toEqual({ backendPort, editorPort });
	});

	it.each(['abc', '0', '70000', '5699.5', '-1'])('rejects the malformed port %s', (value) => {
		expect(() => resolveDevPorts({ N8N_EDITOR_PORT: value })).toThrow(
			`N8N_EDITOR_PORT must be a port number, got: ${value}`,
		);
	});

	it('names the offending variable', () => {
		expect(() => resolveDevPorts({ N8N_PORT: 'abc' })).toThrow(/^N8N_PORT must be/);
	});
});

describe('devServerPlugin', () => {
	it('never applies to builds', () => {
		expect(devServerPlugin({}).apply).toBe('serve');
	});

	it('binds the editor port and derives the REST base from N8N_PORT', () => {
		const env: NodeJS.ProcessEnv = { N8N_PORT: '5699', N8N_EDITOR_PORT: '8082' };

		expect(runConfigHook(env, DEV)).toEqual({
			server: { host: '0.0.0.0', port: 8082, strictPort: true },
		});
		expect(env.VUE_APP_URL_BASE_API).toBe('http://localhost:5699/');
	});

	it('falls back to the default ports', () => {
		const env: NodeJS.ProcessEnv = {};

		expect(runConfigHook(env, DEV)?.server).toMatchObject({ port: 8080 });
		expect(env.VUE_APP_URL_BASE_API).toBe('http://localhost:5678/');
	});

	it('keeps an explicitly set REST base URL', () => {
		const env: NodeJS.ProcessEnv = { VUE_APP_URL_BASE_API: 'https://tunnel.example/' };

		runConfigHook(env, DEV);

		expect(env.VUE_APP_URL_BASE_API).toBe('https://tunnel.example/');
	});

	it('treats an empty REST base URL as unset', () => {
		const env: NodeJS.ProcessEnv = { VUE_APP_URL_BASE_API: '' };

		runConfigHook(env, DEV);

		expect(env.VUE_APP_URL_BASE_API).toBe('http://localhost:5678/');
	});

	// A build that inherits VUE_APP_URL_BASE_API would ship a localhost REST base
	// instead of falling back to window.BASE_PATH, and vitest must not bind a port.
	it.each([
		['vitest', VITEST],
		['preview', PREVIEW],
	])('stays out of the way of %s', (_label, configEnv) => {
		const env: NodeJS.ProcessEnv = { N8N_EDITOR_PORT: '8082' };

		expect(runConfigHook(env, configEnv)).toBeUndefined();
		expect(env.VUE_APP_URL_BASE_API).toBeUndefined();
	});

	it('does not validate ports outside the dev server', () => {
		expect(() => runConfigHook({ N8N_EDITOR_PORT: 'abc' }, VITEST)).not.toThrow();
	});
});
