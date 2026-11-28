import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const N8N_BIN = path.resolve(__dirname, '../../bin/n8n');

interface BinRunOptions {
	preload?: string;
	env?: Record<string, string>;
	timeout?: number;
}

/**
 * A temporary folder for tests that start `bin/n8n` in a child process.
 * The folder is also the n8n user folder, so each run starts from a clean instance.
 */
export function createBinTestDir(prefix: string) {
	const dir = mkdtempSync(path.join(tmpdir(), prefix));

	return {
		dir,
		writeFile(name: string, content: string) {
			const file = path.join(dir, name);
			writeFileSync(file, content);
			return file;
		},
		run(args: string[], { preload, env = {}, timeout = 30_000 }: BinRunOptions = {}) {
			return spawnSync(
				process.execPath,
				[...(preload ? ['--require', preload] : []), N8N_BIN, ...args],
				{
					cwd: dir,
					env: { PATH: process.env.PATH, N8N_USER_FOLDER: dir, ...env },
					encoding: 'utf8',
					timeout,
				},
			);
		},
		remove() {
			rmSync(dir, { recursive: true, force: true });
		},
	};
}

export type BinTestDir = ReturnType<typeof createBinTestDir>;

/** Parses the JSON after the first output line that starts with `marker`. */
export function readMarker(output: string, marker: string): unknown {
	const line = output.split('\n').find((l) => l.startsWith(marker));
	return line === undefined ? undefined : JSON.parse(line.slice(marker.length));
}
