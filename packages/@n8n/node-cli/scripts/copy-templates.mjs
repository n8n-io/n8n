#!/usr/bin/env node

import glob from 'fast-glob';
import { cp } from 'node:fs/promises';
import path from 'path';

const templateFiles = glob.sync(['templates/**/*'], {
	cwd: path.resolve(import.meta.dirname, '../'),
	ignore: ['**/node_modules', '**/dist'],
});

(async () => {
	await Promise.all(templateFiles.map((path) => cp(path, `dist/${path}`, { recursive: true })));
})();
