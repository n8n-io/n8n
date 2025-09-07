#!/usr/bin/env node

import glob from 'fast-glob';
import { cp } from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const templateFiles = glob.sync(['src/template/templates/**/*'], {
	cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
	ignore: ['**/node_modules', '**/dist'],
	dot: true,
});

await Promise.all(
	templateFiles.map((template) =>
		cp(template, `dist/${template.replace('src/', '')}`, { recursive: true }),
	),
);
