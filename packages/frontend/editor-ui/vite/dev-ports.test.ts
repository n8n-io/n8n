import type { ConfigEnv, UserConfig } from 'vite';
import { describe, expect, it } from 'vitest';

import { BACKEND_PROXY_PATTERN, devServerPlugin, resolveDevPorts } from './dev-ports.mjs';

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

describe('BACKEND_PROXY_PATTERN', () => {
	const pattern = new RegExp(BACKEND_PROXY_PATTERN);

	it.each([
		'/rest',
		'/rest/settings',
		'/rest/push?pushRef=abc',
		'/types/nodes.json',
		'/schemas/n8n-nodes-base.set/1.json',
		'/icons/n8n-nodes-base/dist/nodes/Set/set.svg',
		'/webhook-test/abc',
		'/form/abc',
		'/healthz/readiness',
	])('forwards the backend route %s', (url) => {
		expect(pattern.test(url)).toBe(true);
	});

	it.each(['/', '/restore', '/formatting', '/apifoo', '/home/workflows', '/workflow/123'])(
		'leaves the editor route %s to Vite',
		(url) => {
			expect(pattern.test(url)).toBe(false);
		},
	);
});

describe('devServerPlugin', () => {
	it('never applies to builds', () => {
		expect(devServerPlugin({}).apply).toBe('serve');
	});

	it('binds the editor port and proxies backend routes to N8N_PORT', () => {
		expect(runConfigHook({ N8N_PORT: '5699', N8N_EDITOR_PORT: '8082' }, DEV)).toEqual({
			server: {
				host: '0.0.0.0',
				port: 8082,
				strictPort: true,
				proxy: { [BACKEND_PROXY_PATTERN]: { target: 'http://localhost:5699', ws: true } },
			},
		});
	});

	it('falls back to the default ports', () => {
		expect(runConfigHook({}, DEV)?.server).toMatchObject({
			port: 8080,
			proxy: { [BACKEND_PROXY_PATTERN]: { target: 'http://localhost:5678' } },
		});
	});

	// The push origin check compares Host with the browser's Origin, so the
	// proxy must not rewrite Host to the backend's.
	it('keeps the editor Host header on proxied requests', () => {
		const proxy = runConfigHook({}, DEV)?.server?.proxy as Record<string, object>;

		expect(proxy[BACKEND_PROXY_PATTERN]).not.toHaveProperty('changeOrigin');
	});

	// The editor derives its REST base from window.BASE_PATH, so every call goes
	// through the proxy. A build that inherited this var would ship a localhost base.
	it.each([
		['dev', DEV],
		['vitest', VITEST],
		['preview', PREVIEW],
	])('never sets VUE_APP_URL_BASE_API in %s', (_label, configEnv) => {
		const env: NodeJS.ProcessEnv = {};

		runConfigHook(env, configEnv);

		expect(env.VUE_APP_URL_BASE_API).toBeUndefined();
	});

	// vitest must not bind a port.
	it.each([
		['vitest', VITEST],
		['preview', PREVIEW],
	])('stays out of the way of %s', (_label, configEnv) => {
		expect(runConfigHook({ N8N_EDITOR_PORT: '8082' }, configEnv)).toBeUndefined();
	});

	it('does not validate ports outside the dev server', () => {
		expect(() => runConfigHook({ N8N_EDITOR_PORT: 'abc' }, VITEST)).not.toThrow();
	});
});
