import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = fileURLToPath(new URL('.', import.meta.url));
const dir = await mkdtemp(join(resolve(here, '../../test'), '.guard-consumer-'));
try {
	const outfile = join(dir, 'test.mjs');
	await build({
		entryPoints: [join(here, process.argv[2] ?? 'guard-turns.mjs')],
		outfile,
		bundle: true,
		format: 'esm',
		platform: 'node',
		packages: 'external',
		tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
	});
	const result = spawnSync(process.execPath, [outfile], {
		cwd: resolve(here, '../..'),
		stdio: 'inherit',
		env: { ...process.env, MCP_GUARD_HYDRATION: 'plan', N8N_USER_FOLDER: dir },
	});
	process.exitCode = result.status ?? 1;
} finally {
	await rm(dir, { recursive: true, force: true });
}
