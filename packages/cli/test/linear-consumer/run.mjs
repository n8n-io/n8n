import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Bundle the tested source. Do not load the CLI bootstrap or its database and network clients.
const here = fileURLToPath(new URL('.', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'consumer-'));
try {
	const outfile = join(dir, 'test.cjs');
	await build({
		entryPoints: [join(here, 'turns.mjs')],
		outfile,
		bundle: true,
		platform: 'node',
		tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
		alias: {
			'@/utils/ttl-map': resolve(here, '../../src/utils/ttl-map.ts'),
			'@/utils/ai-proxy-fetch': resolve(here, '../../src/utils/ai-proxy-fetch.ts'),
		},
		plugins: [
			{
				name: 'isolated-consumer',
				setup(b) {
					b.onResolve({ filter: /.*/ }, ({ path, importer }) => {
						if (path === 'zod' || path === './agent-sse-stream') return;
						// The guard runs for real: its own imports (DI container, agents SDK, MCP SDK) are not stubbed.
						if (importer.includes('/mcp-guard/') || path.includes('/mcp-guard/')) return;
						// Stub only what the CLI source imports. The packages it uses (Logger, DI) load for real.
						if (!importer.includes('/packages/cli/')) return;
						if (path === '@/utils/ai-proxy-fetch') return;
						if (importer.endsWith('/agents-builder-tools.service.ts') && path === '@n8n/api-types')
							return { path: 'builder-schemas', namespace: 'builder' };
						if (
							/(?:agents-builder-tools|agent-message-queue-consumer)\.service\.ts$/.test(
								importer,
							) ||
							path === '@/modules/skills' ||
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
							'module.exports = {Service:()=>()=>{},OnShutdown:()=>()=>{},AgentsCredentialProvider:class {},isCredentialAgentIntegration:()=>false,userHasScopes:()=>true,getIntegrationToolConnectionDescriptors:()=>[],InstrumentedRunUnsupportedError:class extends Error {},buildMcpClientForServer:(_server,options)=>options.proxyFetch,resolveModelConfig:async(config)=>config.model};',
					}));
				},
			},
		],
	});
	// The gym must run already: admin API on 127.0.0.1:9090 and MCP on 127.0.0.1:8080, or set
	// AI_GYM_LINEAR_URL and GYM_LINEAR_MCP_URL. The test starts its own stand-in for mcp.linear.app.
	const result = spawnSync(process.execPath, [outfile], {
		stdio: 'inherit',
		env: {
			PATH: process.env.PATH,
			HOME: process.env.HOME,
			N8N_USER_FOLDER: dir,
			MCP_GUARD_HYDRATION: 'plan',
			...(process.env.AI_GYM_LINEAR_URL && { AI_GYM_LINEAR_URL: process.env.AI_GYM_LINEAR_URL }),
			...(process.env.GYM_LINEAR_MCP_URL && { GYM_LINEAR_MCP_URL: process.env.GYM_LINEAR_MCP_URL }),
		},
	});
	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
} finally {
	await rm(dir, { recursive: true, force: true });
}
