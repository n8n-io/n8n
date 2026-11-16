// Bundles the snapshot entry into one file, because a snapshot entry can only require built-in modules
// eslint-disable-next-line import-x-alias/no-extraneous-dependencies -- runs at build time only
import * as esbuild from 'esbuild';
import type { Plugin } from 'esbuild';
import path from 'node:path';

// A snapshot cannot hold the bindings of `http` and `https`, so they load on first use
const lazyHttpPlugin: Plugin = {
	name: 'lazy-http',
	setup(build) {
		build.onResolve({ filter: /^https?$/ }, (args) => ({
			path: args.path,
			namespace: 'lazy-http',
		}));
		build.onLoad({ filter: /.*/, namespace: 'lazy-http' }, (args) => ({
			contents: `module.exports = new Proxy({}, { get: (_target, key) => require('node:${args.path}')[key] });`,
		}));
	},
};

await esbuild.build({
	entryPoints: [path.join(import.meta.dirname, 'src/snapshot.ts')],
	outfile: process.argv[2] ?? path.join(import.meta.dirname, 'dist/snapshot-bundle.js'),
	bundle: true,
	platform: 'node',
	format: 'iife',
	target: 'node24',
	plugins: [lazyHttpPlugin],
	logLevel: 'error',
});
