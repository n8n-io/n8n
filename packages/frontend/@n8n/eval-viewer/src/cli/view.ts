/**
 * view <run> [<run> ...] [--root <dir>] [--out <dir>] [--port <n>] [--no-open] [--extract-only]
 *
 * Extracts the viewer data of each eval run folder (each run is one arm), builds the
 * app when its build is missing or older than its source, then serves both on
 * 127.0.0.1 and opens the browser. Module scripts do not load from file://, so the
 * app needs a server.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { homedir, platform, tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ViewerIndex } from '../schema';
import { extractArm } from '../extract/extract';

const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST_DIR = join(PACKAGE_DIR, 'dist');
const APP_SOURCES = ['index.html', 'vite.config.ts', 'src/app', 'src/schema.ts'];
const DEFAULT_ROOT = process.env.EVAL_VIEWER_ROOT ?? join(homedir(), 'n8n-6071-evals');
const CONTENT_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.ttf': 'font/ttf',
	'.png': 'image/png',
};

interface Options {
	runs: string[];
	root: string;
	out: string | null;
	port: number;
	open: boolean;
	extractOnly: boolean;
}

function parseArgs(args: string[]): Options {
	const valueOf = (flag: string) => {
		const at = args.indexOf(flag);
		return at >= 0 ? args[at + 1] : undefined;
	};
	const flagsWithValue = new Set(['--root', '--out', '--port']);
	const runs = args.filter(
		(arg, i) => !arg.startsWith('--') && !flagsWithValue.has(args[i - 1] ?? ''),
	);
	return {
		runs,
		root: valueOf('--root') ?? DEFAULT_ROOT,
		out: valueOf('--out') ?? null,
		port: Number(valueOf('--port') ?? 0),
		open: !args.includes('--no-open'),
		extractOnly: args.includes('--extract-only'),
	};
}

/** A run is a path (absolute, or relative to where pnpm was called) or a folder name in the eval root. */
function runFolder(run: string, root: string): string {
	const callerDir = process.env.INIT_CWD ?? process.cwd();
	const candidates = isAbsolute(run) ? [run] : [resolve(callerDir, run), join(root, run)];
	const found = candidates.find((path) => existsSync(path) && statSync(path).isDirectory());
	if (!found) throw new Error(`No eval run folder "${run}" (looked in ${candidates.join(', ')})`);
	return found;
}

async function newestMtime(path: string): Promise<number> {
	const info = await stat(path);
	if (!info.isDirectory()) return info.mtimeMs;
	const entries = await readdir(path);
	const times = await Promise.all(
		entries.map(async (entry) => await newestMtime(join(path, entry))),
	);
	return Math.max(info.mtimeMs, ...times);
}

async function buildAppIfStale() {
	const built = join(DIST_DIR, 'index.html');
	const sources = APP_SOURCES.map((path) => join(PACKAGE_DIR, path)).filter((path) =>
		existsSync(path),
	);
	const sourceTime = Math.max(...(await Promise.all(sources.map(newestMtime))));
	if (existsSync(built) && statSync(built).mtimeMs >= sourceTime) return;
	console.log('Building the viewer app (vite build)...');
	const require = createRequire(import.meta.url);
	const vite = join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
	const result = spawnSync(process.execPath, [vite, 'build', '--logLevel', 'warn'], {
		cwd: PACKAGE_DIR,
		stdio: 'inherit',
	});
	if (result.status !== 0) throw new Error('vite build failed');
}

async function extract(options: Options, out: string) {
	const folders = options.runs.map((run) => runFolder(run, options.root));
	await rm(join(out, 'iterations'), { recursive: true, force: true });
	await mkdir(join(out, 'iterations'), { recursive: true });
	const arms = [];
	const rawFiles: Record<string, string> = {};
	for (const [i, folder] of folders.entries()) {
		console.log(`Extracting ${folder}`);
		const extracted = await extractArm(folder, i, (line) => console.log(line));
		for (const detail of extracted.details) {
			await writeFile(join(out, 'iterations', `${detail.id}.json`), JSON.stringify(detail));
		}
		for (const warning of extracted.arm.warnings) console.warn(`  warning: ${warning}`);
		Object.assign(rawFiles, extracted.rawFiles);
		arms.push(extracted.arm);
	}
	const index: ViewerIndex = { version: 1, generatedAt: new Date().toISOString(), arms };
	await writeFile(join(out, 'index.json'), JSON.stringify(index));
	console.log(`Wrote ${join(out, 'index.json')}`);
	return rawFiles;
}

/** Null for a malformed escape, which would otherwise throw in the request handler. */
function safeDecode(value: string): string | null {
	try {
		return decodeURIComponent(value);
	} catch {
		return null;
	}
}

/** Resolves `relative` inside `base`, or null when it would leave `base`. */
function inside(base: string, relative: string): string | null {
	const decoded = safeDecode(relative);
	if (decoded === null) return null;
	const path = normalize(join(base, decoded));
	return path === base || path.startsWith(base + sep) ? path : null;
}

function serve(out: string, rawFiles: Record<string, string>, port: number) {
	const server = createServer((request, response) => {
		const url = new URL(request.url ?? '/', 'http://localhost');
		const rawId = url.pathname.startsWith('/raw/') ? url.pathname.slice('/raw/'.length) : null;
		const path = rawId
			? (rawFiles[safeDecode(rawId) ?? ''] ?? null)
			: url.pathname.startsWith('/data/')
				? inside(out, url.pathname.slice('/data/'.length))
				: inside(DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
		if (!path || !existsSync(path) || !statSync(path).isFile()) {
			response.writeHead(404).end('Not found');
			return;
		}
		response.writeHead(200, {
			'content-type': CONTENT_TYPES[extname(path)] ?? 'application/octet-stream',
		});
		createReadStream(path).pipe(response);
	});
	server.listen(port, '127.0.0.1');
	return server;
}

function openBrowser(url: string) {
	const command =
		platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'explorer' : 'xdg-open';
	spawn(command, [url], { stdio: 'ignore', detached: true })
		.on('error', () => console.log(`Open ${url} in a browser.`))
		.unref();
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options.runs.length === 0) {
		console.error(
			'usage: pnpm --filter @n8n/eval-viewer view <run> [<run> ...] [--root <dir>] [--out <dir>] [--port <n>] [--no-open] [--extract-only]',
		);
		process.exitCode = 1;
		return;
	}
	const out = resolve(
		options.out ??
			join(tmpdir(), 'n8n-eval-viewer', options.runs.map((run) => basename(run)).join('__vs__')),
	);
	const rawFiles = await extract(options, out);
	if (options.extractOnly) return;
	await buildAppIfStale();
	const server = serve(out, rawFiles, options.port);
	server.on('listening', () => {
		const address = server.address();
		const url = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : options.port}/`;
		console.log(`Viewer: ${url} (Ctrl-C stops the server)`);
		if (options.open) openBrowser(url);
	});
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
