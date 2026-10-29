import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import manifest from './scaffold-package.json';
import lockfile from './scaffold-lock.json';
import type { AppFiles } from '../storage/app-version-stores';
import { AppBuildError } from '../build/app-build.types';

const packageJson = JSON.stringify(manifest, null, 2) + '\n';
const packageLock = JSON.stringify(lockfile, null, 2) + '\n';

export const APP_DEPENDENCY_KEY = createHash('sha256')
	.update(packageJson)
	.update(packageLock)
	.digest('hex');

// TODO: replace it with a more complete template later?
export function createAppScaffold(): AppFiles {
	return new Map(
		Object.entries({
			'package.json': packageJson,
			'package-lock.json': packageLock,
			'index.html':
				'<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>\n',
			'vite.config.js':
				"import { defineConfig } from 'vite';\nimport vue from '@vitejs/plugin-vue';\nexport default defineConfig({ plugins: [vue()] });\n",
			'src/main.js':
				"import { createApp } from 'vue';\nimport App from './App.vue';\ncreateApp(App).mount('#app');\n",
			'src/App.vue': '<template><main><h1>Your app</h1></main></template>\n',
			'.gitignore': 'node_modules/\ndist/\n',
		}).map(([name, content]) => [name, Buffer.from(content)]),
	);
}

// NOTE: Might allow installing other deps in the future
export function checkBuildSource(files: AppFiles): void {
	for (const name of files.keys()) {
		if (['node_modules', 'dist'].includes(name.split('/')[0])) {
			throw new AppBuildError('source', 'App source cannot contain node_modules or dist.');
		}
	}
	try {
		const packageJson: unknown = JSON.parse(files.get('package.json')?.toString('utf8') ?? 'null');
		const packageLock: unknown = JSON.parse(
			files.get('package-lock.json')?.toString('utf8') ?? 'null',
		);
		if (!isDeepStrictEqual(packageJson, manifest) || !isDeepStrictEqual(packageLock, lockfile)) {
			throw new Error('Changed dependency inputs.');
		}
	} catch {
		throw new AppBuildError(
			'source',
			'Use the package.json and package-lock.json from the app scaffold. Dependency changes are not supported yet.',
		);
	}
}
