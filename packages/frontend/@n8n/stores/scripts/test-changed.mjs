#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const PKG_DIR = 'packages/frontend/@n8n/stores';
const changedFiles = (process.env.CHANGED_FILES || '').split('\n').filter(Boolean);

const log = (m) => console.log(`[test-changed] ${m}`);
const runFull = () => {
	const r = spawnSync('vitest', ['run'], { stdio: 'inherit', shell: true });
	process.exit(r.status ?? 1);
};

if (changedFiles.length === 0) {
	log('no changed-files (master/nightly/release) → full');
	runFull();
}

const inPackage = changedFiles.filter((f) => f.startsWith(`${PKG_DIR}/`));
if (inPackage.length === 0) {
	log('upstream-only change → full');
	runFull();
}

if (
	inPackage.some(
		(f) =>
			/\/(vitest|vite)\.config\.(ts|mts|js)$/.test(f) ||
			/\/(src\/__tests__|test)\/setup\.ts$/.test(f) ||
			/\/package\.json$/.test(f),
	)
) {
	log('in-package config change → full');
	runFull();
}

if (changedFiles.some((f) => /^(pnpm-lock\.yaml|package\.json)$/.test(f))) {
	log('cross-cutting change → full');
	runFull();
}

const relPaths = inPackage.map((f) => f.slice(PKG_DIR.length + 1));

log(`scoping via vitest related on ${relPaths.length} files`);
const r = spawnSync('vitest', ['related', ...relPaths, '--run'], { stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
