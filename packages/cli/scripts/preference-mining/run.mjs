import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
	options: {
		demo: { type: 'boolean' },
		live: { type: 'boolean' },
		input: { type: 'string' },
		groups: { type: 'string' },
		project: { type: 'string' },
		thresholds: { type: 'string' },
		snapshot: { type: 'string' },
		output: { type: 'string' },
		help: { type: 'boolean' },
	},
});

if (values.help) {
	console.log(`Preference mining spike (read-only)

Run from the repository root:
  pnpm spike:preferences --demo
  pnpm spike:preferences --input snapshot.json
  pnpm spike:preferences --live --project PROJECT_ID --groups groups.json

Options:
  --thresholds FILE  JSON with minimumWorkflows, minimumShare, and minimumMargin
  --snapshot FILE    Save the collected usage evidence for replay
  --output FILE      Save the suggestion report instead of printing it

Live mode uses N8N_MCP_URL and N8N_MCP_TOKEN from the environment.
Use the instance MCP URL and its access token. No model credentials are needed.
Exactly one of --demo, --input, and --live is required.`);
	process.exit(0);
}

async function readJson(path) {
	return JSON.parse(await readFile(path, 'utf8'));
}

async function loadMiner() {
	// Bundle only the pure miner. Do not initialize n8n settings or a database.
	const { outputFiles } = await build({
		entryPoints: [
			fileURLToPath(
				new URL(
					'../../src/modules/workflow-index/preference-mining/node-preference-miner.ts',
					import.meta.url,
				),
			),
		],
		bundle: true,
		format: 'esm',
		platform: 'node',
		write: false,
	});
	return await import(
		`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
	);
}

async function demoSnapshot(miner, groups) {
	const { preferenceWorkflows } = await import(
		'../../../../scripts/instance-seeding/preference-profile.mjs'
	);
	const workflows = preferenceWorkflows({
		customer_accounts: 'demo-customers',
		automation_runs: 'demo-runs',
	});
	const workflowIdsByType = new Map();
	for (const [index, workflow] of workflows.entries()) {
		for (const nodeType of new Set(workflow.nodes.map((node) => node.type))) {
			const ids = workflowIdsByType.get(nodeType) ?? [];
			ids.push(`demo-workflow-${index + 1}`);
			workflowIdsByType.set(nodeType, ids);
		}
	}
	const snapshot = await miner.captureNodeUsage(
		async ({ nodeType }) => ({
			workflowsInScope: workflows.length,
			...(nodeType
				? {
						workflows: (workflowIdsByType.get(nodeType) ?? []).map((workflowId) => ({
							workflowId,
						})),
					}
				: {
						nodeTypes: [...workflowIdsByType].map(([type, ids]) => ({
							nodeType: type,
							workflowCount: ids.length,
						})),
					}),
		}),
		'demo-preference-project',
		groups,
	);
	return { ...snapshot, origin: 'seed-profile' };
}

async function liveSnapshot(miner, groups) {
	const endpoint = process.env.N8N_MCP_URL;
	const token = process.env.N8N_MCP_TOKEN;
	if (!endpoint || !token || !values.project) {
		throw new Error('Live mode requires N8N_MCP_URL, N8N_MCP_TOKEN, and --project.');
	}
	const [{ Client }, { StreamableHTTPClientTransport }] = await Promise.all([
		import('@modelcontextprotocol/sdk/client/index.js'),
		import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
	]);
	const client = new Client({ name: 'n8n-preference-mining-spike', version: '0.1.0' });
	const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
		requestInit: { headers: { Authorization: `Bearer ${token}` } },
	});
	try {
		await client.connect(transport);
		return await miner.captureNodeUsage(
			async (options) => {
				const result = await client.callTool({ name: 'get_node_usage', arguments: options });
				if (result.isError)
					throw new Error('get_node_usage failed. No suggestions were generated.');
				const payload =
					result.structuredContent ??
					JSON.parse(result.content.find((item) => item.type === 'text')?.text ?? 'null');
				return miner.nodeUsageResponseSchema.parse(payload);
			},
			values.project,
			groups,
			'mcp',
		);
	} finally {
		await client.close();
	}
}

try {
	if ([values.demo, values.live, values.input].filter(Boolean).length !== 1) {
		throw new Error('Select exactly one source: --demo, --input, or --live.');
	}
	if (values.input && (values.groups || values.project)) {
		throw new Error('Replay uses the groups and project recorded in the snapshot.');
	}
	if (values.demo && values.project) {
		throw new Error('Demo mode uses demo-preference-project. Use --live for an instance project.');
	}
	const miner = await loadMiner();
	const groups = values.input
		? undefined
		: miner.nodePreferenceGroupsSchema.parse(
				await readJson(values.groups ?? new URL('./groups.json', import.meta.url)),
			);
	const snapshot = values.input
		? miner.nodeUsageSnapshotSchema.parse(await readJson(values.input))
		: values.demo
			? await demoSnapshot(miner, groups)
			: await liveSnapshot(miner, groups);
	const report = miner.mineNodePreferences(
		snapshot,
		values.thresholds ? await readJson(values.thresholds) : {},
	);
	if (values.snapshot) await writeFile(values.snapshot, `${JSON.stringify(snapshot, null, 2)}\n`);
	const output = `${JSON.stringify(report, null, 2)}\n`;
	if (values.output) await writeFile(values.output, output);
	else process.stdout.write(output);
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
