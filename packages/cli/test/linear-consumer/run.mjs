import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Usage: node test/linear-consumer/run.mjs <path to the Gym checkout>
// Needs `go`. Builds and starts the Gym on loopback with GOPROXY=off. Uses no real service.
const launcher = 'deploy/e2e/linear-spike.mjs';
if (!process.argv[2]) {
	console.error('Usage: node test/linear-consumer/run.mjs <path to the Gym checkout>');
	process.exit(2);
}
const gym = resolve(process.argv[2]);
if (!existsSync(join(gym, launcher))) {
	console.error(`No Gym launcher at ${join(gym, launcher)}`);
	process.exit(2);
}

// Bundle the tested source. Do not load the CLI bootstrap or its database and network clients.
const here = fileURLToPath(new URL('.', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'consumer-'));
try {
	const outfile = join(dir, 'test.cjs');
	const { metafile } = await build({
		metafile: true,
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
						// The session reads the evidence enum, so it gets the real schema source.
						if (importer.endsWith('/simulation/simulation-session.ts') && path === '@n8n/api-types')
							return {
								path: resolve(
									here,
									'../../../@n8n/api-types/src/schemas/agent-safe-testing.schema.ts',
								),
							};
						if (
							/(?:agents-builder-tools|agent-message-queue-consumer)\.service\.ts$/.test(
								importer,
							) ||
							path === '@/modules/skills' ||
							path === '@n8n/di' ||
							path === '@n8n/backend-common' ||
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
							'module.exports = {Logger:class {},Container:{get:()=>({info:()=>{},warn:()=>{}})},Service:()=>()=>{},OnShutdown:()=>()=>{},AgentsCredentialProvider:class {},isCredentialAgentIntegration:()=>false,userHasScopes:()=>true,getIntegrationToolConnectionDescriptors:()=>[],InstrumentedRunUnsupportedError:class extends Error {},buildMcpClientForServer:(_server,options)=>options.proxyFetch,isMcpGuardActive:()=>false,withMcpGuard:(fetch)=>fetch,GUARDED_CALL_TIMEOUT_MS:0,resolveModelConfig:async(config)=>config.model,createAiProxyFetch:()=>fetch};',
					}));
				},
			},
		],
	});
	for (const source of ['router.ts', 'plan-hydrator.ts']) {
		const included = Object.values(metafile.outputs).some(({ inputs }) =>
			Object.entries(inputs).some(
				([path, info]) =>
					path.endsWith(`/modules/mcp-guard/${source}`) &&
					!path.includes(':') &&
					info.bytesInOutput > 0,
			),
		);
		if (!included) throw Error(`Missing production MCP guard source: ${source}`);
	}
	const result = spawnSync(process.execPath, [launcher, '--', process.execPath, outfile], {
		cwd: gym,
		stdio: 'inherit',
		env: {
			PATH: process.env.PATH,
			HOME: process.env.HOME,
			GOPROXY: 'off',
			N8N_USER_FOLDER: dir,
			N8N_SAFE_TESTING_BACKEND: 'linear-gym',
		},
	});
	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
} finally {
	await rm(dir, { recursive: true, force: true });
}
