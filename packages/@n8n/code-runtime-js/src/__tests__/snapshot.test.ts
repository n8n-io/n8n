import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('snapshot', () => {
	it('builds, and a process starts from it', () => {
		const dir = mkdtempSync(join(tmpdir(), 'code-runtime-js-'));
		const bundle = join(dir, 'bundle.js');
		const blob = join(dir, 'snapshot.blob');

		try {
			execFileSync(process.execPath, [join(__dirname, '../../esbuild.config.mts'), bundle]);
			execFileSync(process.execPath, ['--snapshot-blob', blob, '--build-snapshot', bundle], {
				stdio: ['ignore', 'ignore', 'pipe'],
			});

			const result = spawnSync(process.execPath, ['--snapshot-blob', blob], { encoding: 'utf8' });

			expect(result.stderr).toBe('');
			expect(result.status).toBe(0);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 30_000);
});
