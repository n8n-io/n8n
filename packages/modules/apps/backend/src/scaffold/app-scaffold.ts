import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { isRecord } from '@n8n/utils/is-record';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { valid } from 'semver';

import manifest from './scaffold-package.json';
import lockfile from './scaffold-lock.json';
import type { AppFiles } from '../storage/app-version-stores';
import { AppBuildError } from '../build/app-build.types';

const packageJson = JSON.stringify(manifest, null, 2) + '\n';
const packageLock = JSON.stringify(lockfile, null, 2) + '\n';

const PACKAGE_FIELDS = new Set([
	'name',
	'version',
	'private',
	'type',
	'engines',
	'scripts',
	'dependencies',
	'devDependencies',
	'description',
	'keywords',
	'homepage',
	'bugs',
	'license',
	'author',
	'contributors',
	'funding',
	'repository',
]);
const BUILD_SCRIPTS = { build: 'vite build' };
const NPM_REGISTRY = 'https://registry.npmjs.org/';
const PROHIBITED_SOURCE_ENTRIES = new Set([
	'.npmrc',
	'npm-shrinkwrap.json',
	'node_modules',
	'dist',
]);

export function createAppScaffold(): AppFiles {
	return new Map(
		Object.entries({
			'package.json': packageJson,
			'package-lock.json': packageLock,
			'index.html':
				'<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>\n',
			'vite.config.js':
				"import vue from '@vitejs/plugin-vue';\nimport { defineConfig } from 'vite';\nexport default defineConfig({ plugins: [vue()] });\n",
			'src/main.js':
				"import { createApp } from 'vue';\nimport App from './App.vue';\nimport './style.css';\ncreateApp(App).mount('#app');\n",
			'src/App.vue': '<template><main class="app"><h1>Your app</h1></main></template>\n',
			'src/style.css':
				':root { font-family: system-ui, sans-serif; color: #202020; background: #fafafa; }\n* { box-sizing: border-box; }\nbody { margin: 0; }\n.app { max-width: 72rem; margin: 0 auto; padding: 2rem; }\n',
			'.gitignore': 'node_modules/\ndist/\n',
		}).map(([name, content]) => [name, Buffer.from(content)]),
	);
}

function checkPackageMetadata(value: Record<string, unknown>) {
	if (Object.keys(value).some((key) => !PACKAGE_FIELDS.has(key))) {
		throw new Error('Package contains an unsupported field.');
	}
	if (
		typeof value.name !== 'string' ||
		value.name.length === 0 ||
		typeof value.version !== 'string' ||
		valid(value.version) === null
	) {
		throw new Error('Invalid package name or version.');
	}
	if (
		value.private !== true ||
		value.type !== 'module' ||
		!isDeepStrictEqual(value.scripts, BUILD_SCRIPTS)
	) {
		throw new Error('Changed package build configuration.');
	}
}

function dependencyMap(value: unknown): Record<string, string> {
	if (!isRecord(value)) throw new Error('Invalid dependency map.');
	const dependencies: Record<string, string> = {};
	for (const [name, version] of Object.entries(value)) {
		if (typeof version !== 'string' || valid(version) === null) {
			throw new Error('Dependencies must use exact versions.');
		}
		dependencies[name] = version;
	}
	return dependencies;
}

function checkLockedDependencies(
	dependencies: Record<string, string>,
	packages: Record<string, unknown>,
) {
	for (const [name, version] of Object.entries(dependencies)) {
		const entry = packages[`node_modules/${name}`];
		if (!isRecord(entry) || entry.version !== version) {
			throw new Error('Package lock is missing a direct dependency.');
		}
	}
}

function isSupportedLockEntry(entry: unknown): boolean {
	if (!isRecord(entry)) return false;
	if (
		entry.resolved !== undefined &&
		(typeof entry.resolved !== 'string' || !entry.resolved.startsWith(NPM_REGISTRY))
	) {
		return false;
	}
	if (entry.inBundle === true) return true;
	if (typeof entry.resolved !== 'string' || typeof entry.integrity !== 'string') return false;
	return entry.integrity.startsWith('sha512-') || entry.integrity.startsWith('sha1-');
}

export function checkBuildSource(files: AppFiles): string {
	for (const name of files.keys()) {
		const rootEntry = name.split('/')[0];
		if (rootEntry && PROHIBITED_SOURCE_ENTRIES.has(rootEntry)) {
			throw new AppBuildError('source', `App source cannot contain ${rootEntry}.`);
		}
	}
	try {
		const packageJson: unknown = JSON.parse(files.get('package.json')?.toString('utf8') ?? 'null');
		const packageLock: unknown = JSON.parse(
			files.get('package-lock.json')?.toString('utf8') ?? 'null',
		);
		if (!isRecord(packageJson) || !isRecord(packageLock)) throw new Error('Invalid package files.');
		checkPackageMetadata(packageJson);

		const dependencies = dependencyMap(packageJson.dependencies);
		const devDependencies = dependencyMap(packageJson.devDependencies);
		if (packageLock.lockfileVersion !== 3 || !isRecord(packageLock.packages)) {
			throw new Error('Invalid package lock.');
		}
		const root = packageLock.packages[''];
		if (
			!isRecord(root) ||
			root.name !== packageJson.name ||
			root.version !== packageJson.version ||
			!isDeepStrictEqual(root.dependencies, dependencies) ||
			!isDeepStrictEqual(root.devDependencies, devDependencies)
		) {
			throw new Error('Package lock does not match package.json.');
		}
		checkLockedDependencies(dependencies, packageLock.packages);
		checkLockedDependencies(devDependencies, packageLock.packages);

		for (const [path, entry] of Object.entries(packageLock.packages)) {
			if (path === '') continue;
			if (!isSupportedLockEntry(entry)) {
				throw new Error('Package lock contains an unsupported dependency.');
			}
		}

		return createHash('sha256')
			.update(JSON.stringify(packageJson))
			.update(JSON.stringify(packageLock))
			.digest('hex');
	} catch (error) {
		throw new AppBuildError(
			'source',
			'Use the app scaffold package files and public npm packages with exact versions.',
			getErrorMessage(error),
		);
	}
}
