#!/usr/bin/env node

import glob from 'fast-glob';
import { cp } from 'node:fs/promises';
import path from 'path';

const templateFiles = glob.sync(['src/template/templates/**/*'], {
	cwd: path.resolve(import.meta.dirname, '..'),
	ignore: ['**/node_modules', '**/dist'],
	dot: true,
});

await Promise.all(
	templateFiles.map((template) =>
		cp(template, `dist/${template.replace('src/', '')}`, { recursive: true }),
	),
);
