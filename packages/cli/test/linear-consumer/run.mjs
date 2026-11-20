import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Bundle the tested source. Do not load the CLI bootstrap or its database and network clients.
const here = fileURLToPath(new URL('.', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'consumer-'));
const gym = resolve(process.argv[2] ?? '/tmp/lg-ai-gym');
try {
	const outfile = join(dir, 'test.cjs');
	await build({
		entryPoints: [join(here, 'turns.mjs')],
		outfile,
		bundle: true,
		platform: 'node',
		tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
		alias: { '@/utils/ttl-map': resolve(here, '../../src/utils/ttl-map.ts') },
		plugins: [
			{
				name: 'isolated-consumer',
				setup(b) {
					b.onResolve({ filter: /.*/ }, ({ path, importer }) => {
						if (path === 'zod' || path === './agent-sse-stream') return;
						if (importer.endsWith('/agents-builder-tools.service.ts') && path === '@n8n/api-types')
							return { path: 'builder-schemas', namespace: 'builder' };
						if (
							/(?:agents-builder-tools|agent-message-queue-consumer)\.service\.ts$/.test(
								importer,
							) ||
							path === '@/modules/skills' ||
							path === '@n8n/di' ||
							/agent-runtime-reconstruction\.service\.ts$/.test(importer) ||
							/^(?:@n8n\/(?:api-types|agents|ai-utilities\/agent-config)|n8n-workflow)$/.test(
								path,
							) ||
							/\/(?:check-access|standard-approval|agent-config-composition|integration-tool-factory|instrumented-run-guard|workflow-tool-workflow-resolver|test-run-credentials-helper)$/.test(
								path,
							)
						)
							return { path, namespace: 'fixture-stub' };
					});
					b.onLoad({ filter: /.*/, namespace: 'builder' }, () => ({
						resolveDir: resolve(here, '../../../@n8n/api-types/src/agents'),
						contents:
							"module.exports={...require('./agent-skill.schema'),...require('./agent-task.schema')};",
					}));
					b.onLoad({ filter: /.*/, namespace: 'fixture-stub' }, () => ({
						contents:
							'module.exports = {Service:()=>()=>{},OnShutdown:()=>()=>{},AgentsCredentialProvider:class {},isCredentialAgentIntegration:()=>false,userHasScopes:()=>true,getIntegrationToolConnectionDescriptors:()=>[],InstrumentedRunUnsupportedError:class extends Error {},buildMcpClientForServer:(_server,options)=>options.proxyFetch};',
					}));
				},
			},
		],
	});
	const result = spawnSync(
		process.execPath,
		['deploy/e2e/linear-spike.mjs', '--', process.execPath, outfile],
		{
			cwd: gym,
			stdio: 'inherit',
			env: {
				PATH: process.env.PATH,
				HOME: process.env.HOME,
				GOPROXY: 'off',
				N8N_USER_FOLDER: dir,
				N8N_SAFE_TESTING_BACKEND: 'linear-gym',
			},
		},
	);
	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
} finally {
	await rm(dir, { recursive: true, force: true });
}
