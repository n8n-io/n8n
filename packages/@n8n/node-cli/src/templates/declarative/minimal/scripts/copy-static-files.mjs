#!/usr/bin/env node

import glob from 'fast-glob';
import { cp } from 'node:fs/promises';
import path from 'path';

const staticFiles = glob.sync(
	['{nodes,credentials}/**/*.{png,svg}', 'nodes/**/__schema__/**/*.json'],
	{
		cwd: path.resolve(import.meta.dirname, '..'),
	},
);

(async () => {
	await Promise.all(staticFiles.map((path) => cp(path, `dist/${path}`, { recursive: true })));
})();
