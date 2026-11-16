import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseAllDocuments } from 'yaml';

export function findInflight(lockfile) {
	return parseAllDocuments(lockfile).flatMap((document) => {
		if (document.errors.length > 0) throw document.errors[0];
		const lock = document.toJS();
		return Object.keys({ ...lock?.packages, ...lock?.snapshots }).filter((key) =>
			/^\/?inflight(?:@|\/)/.test(key),
		);
	});
}

function main() {
	const root = fileURLToPath(new URL('../..', import.meta.url));
	const lockfiles = execFileSync(
		'git',
		['ls-files', '-z', '--', 'pnpm-lock.yaml', '**/pnpm-lock.yaml'],
		{
			cwd: root,
			encoding: 'utf8',
		},
	)
		.split('\0')
		.filter(Boolean);
	const violations = lockfiles.flatMap((file) =>
		findInflight(readFileSync(resolve(root, file), 'utf8')).map((key) => `${file}: ${key}`),
	);
	if (violations.length > 0) {
		console.error('Remove inflight from the dependency graph:\n' + violations.join('\n'));
		process.exitCode = 1;
	} else {
		console.log(`OK: ${lockfiles.length} lockfiles contain no inflight package.`);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	main();
}
