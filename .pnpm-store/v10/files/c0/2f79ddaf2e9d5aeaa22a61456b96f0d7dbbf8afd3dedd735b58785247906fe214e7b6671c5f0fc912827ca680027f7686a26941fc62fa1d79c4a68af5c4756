import { resolveConfig as resolveConfig$1, mergeConfig, createServer as createServer$1 } from 'vite';
export { esbuildVersion, isFileServingAllowed, parseAst, parseAstAsync, rollupVersion, version as viteVersion } from 'vite';
import { V as Vitest, a as VitestPlugin, T as TestModule } from './chunks/cli-api.Bti1vevt.js';
export { G as GitNotFoundError, F as TestsNotFoundError, b as VitestPackageInstaller, e as createViteLogger, c as createVitest, i as isValidApiRequest, d as registerConsoleShortcuts, r as resolveFsAllow, s as startVitest } from './chunks/cli-api.Bti1vevt.js';
export { p as parseCLI } from './chunks/cac.BN2e7cE1.js';
import { r as resolveConfig$2 } from './chunks/coverage.87S59-Sl.js';
export { b as BaseSequencer, c as createMethodsRPC, g as getFilePoolName, a as resolveApiServerConfig } from './chunks/coverage.87S59-Sl.js';
import { slash } from '@vitest/utils';
import { f as findUp } from './chunks/index.DBIGubLC.js';
import { resolve } from 'pathe';
import { c as configFiles } from './chunks/constants.BZZyIeIE.js';
export { distDir, rootDir } from './path.js';
import createDebug from 'debug';
export { generateFileHash } from '@vitest/runner/utils';
import 'node:fs';
import './chunks/coverage.0iPg4Wrz.js';
import 'node:path';
import '@vitest/snapshot/manager';
import 'vite-node/client';
import 'vite-node/server';
import './chunks/index.CJ0plNrh.js';
import './chunks/index.De2FqGmR.js';
import 'tinyrainbow';
import './chunks/utils.Cc45eY3L.js';
import 'node:util';
import 'node:perf_hooks';
import '@vitest/utils/source-map';
import './chunks/env.Dq0hM4Xv.js';
import 'std-env';
import './chunks/typechecker.DYQbn8uK.js';
import 'node:fs/promises';
import 'tinyexec';
import 'node:os';
import 'node:url';
import 'node:module';
import 'fs';
import 'node:console';
import 'node:stream';
import 'events';
import 'https';
import 'http';
import 'net';
import 'tls';
import 'crypto';
import 'stream';
import 'url';
import 'zlib';
import 'buffer';
import './chunks/_commonjsHelpers.BFTU3MAI.js';
import 'node:crypto';
import 'tinyglobby';
import 'vite-node/utils';
import '@vitest/mocker/node';
import './chunks/defaults.DSxsTG0h.js';
import 'magic-string';
import 'node:assert';
import '@vitest/utils/error';
import 'node:readline';
import 'util';
import 'path';
import 'node:process';
import 'node:v8';
import 'node:tty';
import 'node:events';
import 'tinypool';
import 'node:worker_threads';
import 'readline';

async function resolveConfig(options = {}, viteOverrides = {}) {
	const root = slash(resolve(options.root || process.cwd()));
	const configPath = options.config === false ? false : options.config ? resolve(root, options.config) : await findUp(configFiles, { cwd: root });
	options.config = configPath;
	const vitest = new Vitest("test");
	const config = await resolveConfig$1(mergeConfig({
		configFile: configPath,
		mode: options.mode || "test",
		plugins: [await VitestPlugin(options, vitest)]
	}, mergeConfig(viteOverrides, { root: options.root })), "serve");
	const updatedOptions = Reflect.get(config, "_vitest");
	const vitestConfig = resolveConfig$2(vitest, updatedOptions, config);
	await vitest.close();
	return {
		viteConfig: config,
		vitestConfig
	};
}

function createDebugger(namespace) {
	const debug = createDebug(namespace);
	if (debug.enabled) {
		return debug;
	}
}

const version = Vitest.version;
/** @deprecated use `createViteServer` instead */
const createServer = createServer$1;
const createViteServer = createServer$1;
/**
* @deprecated Use `TestModule` instead
*/
const TestFile = TestModule;

export { TestFile, VitestPlugin, createDebugger, createServer, createViteServer, resolveConfig, version };
