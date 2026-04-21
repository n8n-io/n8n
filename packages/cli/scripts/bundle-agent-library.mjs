#!/usr/bin/env node
/**
 * Pre-bundles @n8n/agents (Tool SDK) + zod into a single CJS string consumed
 * by the V8 isolate at runtime (see src/modules/agents/runtime/agent-secure-runtime.ts).
 *
 * Running this at build time means:
 *   - No esbuild on the hot path at first-request
 *   - No esbuild native binary needed in the Docker image at runtime
 *
 * Output: packages/cli/dist/agent-library-bundle.js
 */
import * as esbuild from 'esbuild';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.resolve(CLI_ROOT, 'dist', 'agent-library-bundle.js');

export async function buildAgentLibraryBundle({ silent = false } = {}) {
	// Resolve @n8n/agents from the cli package so we get the workspace-linked
	// copy regardless of where this script is invoked from.
	const requireFromCli = createRequire(path.join(CLI_ROOT, 'package.json'));
	const toSlash = (p) => p.replace(/\\/g, '/');
	const agentsPath = toSlash(requireFromCli.resolve('@n8n/agents'));
	const agentsSrcDir = agentsPath.replace(/dist\/index\.js$/, 'dist/');

	// Import only the Tool builder (needed for describe() + handler execution)
	// rather than the full barrel — the runtime pulls in MCP SDK, AI provider
	// SDKs, database drivers, etc., none of which are usable inside the isolate.
	const shim = `
		const { Tool } = require('${agentsSrcDir}sdk/tool');
		const zod = require('zod');

		globalThis.__modules = {
			'@n8n/agents': { Tool },
			'zod': zod,
		};
	`;

	const result = await esbuild.build({
		stdin: { contents: shim, loader: 'js', resolveDir: CLI_ROOT },
		bundle: true,
		format: 'cjs',
		target: 'es2022',
		platform: 'node',
		write: false,
		treeShaking: true,
		// Stub out Node built-ins, native modules, and heavy packages the isolate
		// cannot use (no filesystem, no sockets, no child processes inside V8).
		external: [
			'node:*',
			'pg',
			'better-sqlite3',
			'@libsql/client',
			'ajv',
			'child_process',
			'fs',
			'path',
			'os',
			'net',
			'http',
			'https',
			'tls',
			'stream',
			'crypto',
			'events',
			'util',
			'buffer',
			'url',
			'querystring',
			'cross-spawn',
			'@modelcontextprotocol/*',
			'@ai-sdk/*',
			'@opentelemetry/*',
			'langsmith/*',
		],
		define: {
			'process.env.NODE_ENV': '"production"',
		},
	});

	if (result.errors.length > 0) {
		throw new Error(
			`Failed to bundle agent library: ${result.errors.map((e) => e.text).join('\n')}`,
		);
	}

	const bundle = result.outputFiles[0].text;
	mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
	writeFileSync(OUTPUT_FILE, bundle, 'utf8');

	if (!silent) {
		const sizeKB = (bundle.length / 1024).toFixed(1);
		const sizeMB = (bundle.length / (1024 * 1024)).toFixed(2);
		console.log(
			`[bundle-agent-library] Wrote ${path.relative(CLI_ROOT, OUTPUT_FILE)} — ${sizeKB} KB (${sizeMB} MB)`,
		);
	}

	return OUTPUT_FILE;
}

// Allow running as a standalone script: `node scripts/bundle-agent-library.mjs`
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
	buildAgentLibraryBundle().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
