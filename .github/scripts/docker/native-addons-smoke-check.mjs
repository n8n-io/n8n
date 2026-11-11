#!/usr/bin/env node

// Verifies the native addons that the n8n image compiles from source. A bad
// build shows only when an addon loads, so load and use each one. Also verifies
// that no build toolchain is left in the runtime image: the addons compile in a
// builder stage.

import { accessSync, constants } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const n8nInstallDir = process.env.N8N_INSTALL_DIR || '/usr/local/lib/node_modules/n8n';
const require = createRequire(path.join(n8nInstallDir, 'package.json'));

const ivm = require('isolated-vm');
const isolate = new ivm.Isolate();
const result = isolate.compileScriptSync('6 * 7').runSync(isolate.createContextSync());
if (result !== 42) throw new Error(`isolated-vm returned ${result}, not 42`);

const sqlite3 = require('sqlite3');
const sqliteVersion = await new Promise((resolve, reject) => {
	const db = new sqlite3.Database(':memory:');
	db.get('SELECT sqlite_version() AS version', (error, row) =>
		error ? reject(error) : db.close(() => resolve(row.version)),
	);
});

const TOOLCHAIN = ['cc', 'gcc', 'g++', 'make', 'python3'];
const isOnPath = (tool) =>
	(process.env.PATH ?? '').split(':').some((dir) => {
		try {
			accessSync(path.join(dir, tool), constants.X_OK);
			return true;
		} catch {
			return false;
		}
	});
const leaked = TOOLCHAIN.filter(isOnPath);
if (leaked.length > 0) throw new Error(`Build tools in the runtime image: ${leaked.join(', ')}`);

console.log(`Native addons work (isolated-vm, sqlite3 ${sqliteVersion}). No build toolchain.`);
