import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';

const { values } = parseArgs({
	options: {
		input: { type: 'string' },
		output: { type: 'string' },
		help: { type: 'boolean' },
		'refresh-pricing': { type: 'boolean', default: false },
	},
});

if (values.help || !values.input || !values.output) {
	console.log(`Replay all preference source combinations without model calls.

From packages/cli:
  pnpm exec node scripts/preference-mining/replay.mjs --input RUN.json --output DIRECTORY

Download RUN.json from the lab's Run details panel.
The replay uses each completed source once. It marks missing sources as blocked.
It compares all 16 source subsets in prompt and recall modes.
It does not connect to n8n, a database, or a model provider.
Use --refresh-pricing to fetch current catalog rates when the snapshot has none.
Token estimates cover preference text only, using cl100k_base.`);
	process.exit(values.help ? 0 : 1);
}

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const labFile = resolve(
	root,
	'packages/cli/src/modules/workflow-index/preference-mining/preference-lab.ts',
);
const memoryFile = resolve(root, 'packages/@n8n/agents/src/runtime/memory/episodic-memory.ts');
const memoryDefaultsFile = resolve(dirname(memoryFile), 'episodic-memory-defaults.ts');
const estimatesFile = resolve(dirname(labFile), 'context-estimate.ts');
const metricsFile = resolve(dirname(labFile), 'lab-metrics.ts');
const require = createRequire(import.meta.url);
const snapshotText = await readFile(values.input, 'utf8');
const run = JSON.parse(snapshotText);
if (
	!['complete', 'failed', 'cancelled'].includes(run.status) ||
	!Array.isArray(run.results) ||
	!run.projectId ||
	!run.sources
) {
	throw new Error('Use a finished run with source data from the preference mining page.');
}
const sourceNames = ['nodes', 'credentials', 'workflows', 'threads'];
for (const name of sourceNames) {
	if (run.results.filter((result) => result.approach === name).length > 1) {
		throw new Error(`The input has more than one ${name} result.`);
	}
}

// Bundle the pure functions. Do not load the CLI service or initialize settings.
const bundle = await build({
	stdin: {
		contents: `export { emptyResult, runCombined, retrieve } from ${JSON.stringify(labFile)};
export { rankEpisodicMemoryEntries, hashEpisodicMemoryContent } from ${JSON.stringify(memoryFile)};
export { estimatePreferenceContext, resolveMiningPricing } from ${JSON.stringify(estimatesFile)};
export { sumMiningMetrics } from ${JSON.stringify(metricsFile)};`,
		resolveDir: root,
	},
	bundle: true,
	format: 'esm',
	platform: 'node',
	write: false,
	metafile: true,
	plugins: [
		{
			name: 'exclude-unused-memory-runtime',
			setup(builder) {
				// Keep package-relative tokenizer data files in the installed package.
				builder.onResolve(
					{ filter: /^@n8n\/(ai-utilities\/tokenizer|agents\/catalog)$/ },
					(args) => ({
						path: pathToFileURL(require.resolve(args.path)).href,
						external: true,
					}),
				);
				builder.onResolve({ filter: /^\./ }, (args) => {
					if (![memoryFile, memoryDefaultsFile].includes(args.importer)) return;
					// Drop unused agent and model runtime imports. Keep the ranker's dependencies.
					return { path: `${resolve(dirname(args.importer), args.path)}.ts`, sideEffects: false };
				});
			},
		},
	],
});
await mkdir(values.output, { recursive: true });
await writeFile(
	resolve(values.output, 'bundle-inputs.json'),
	JSON.stringify(bundle.metafile.outputs, null, 2),
);
const {
	emptyResult,
	runCombined,
	retrieve,
	rankEpisodicMemoryEntries,
	hashEpisodicMemoryContent,
	estimatePreferenceContext,
	resolveMiningPricing,
	sumMiningMetrics,
} = await (async () => {
	try {
		return await import(
			`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
		);
	} catch (error) {
		throw new Error(`Could not load the replay functions: ${error.message}`);
	}
})();
const pricing =
	values['refresh-pricing'] && run.model?.id
		? await resolveMiningPricing(run.model.id)
		: run.model?.pricing;
const miningMetrics = sumMiningMetrics(
	run.results.filter((r) => r.approach !== 'combined').map((r) => r.metrics),
);
const memory = {
	recall(preferences, query, topK) {
		const date = new Date(0);
		return rankEpisodicMemoryEntries(
			preferences.map((p) => ({
				id: p.id,
				resourceId: p.projectId,
				content: p.content,
				contentHash: hashEpisodicMemoryContent(p.content),
				status: 'active',
				supersededBy: null,
				createdAt: date,
				updatedAt: date,
				lastSeenAt: date,
			})),
			query,
			{ topK },
		).map((entry) => entry.id);
	},
};

const slackContexts = ['team-notifications', 'n8n-nodes-base.slack'];
const modelContexts = ['chat-model-provider', '@n8n/n8n-nodes-langchain.lmChatAnthropic'];
const slackTargets = ['node:team-notifications', 'credential:slackApi:n8n-nodes-base.slack'];
const modelTargets = [
	'node:chat-model-provider',
	'credential:anthropicApi:@n8n/n8n-nodes-langchain.lmChatAnthropic',
];
const probeRows = [
	['slack-name', 'Slack', slackContexts, slackTargets],
	['slack-request', 'Send a Slack alert when a new customer signs up', slackContexts, slackTargets],
	['slack-node-id', 'n8n-nodes-base.slack', slackContexts, slackTargets],
	['notification-purpose', 'team notifications', slackContexts, ['node:team-notifications']],
	['anthropic-name', 'Anthropic', modelContexts, modelTargets],
	['model-purpose', 'chat model', modelContexts, ['node:chat-model-provider']],
	[
		'postgres-name',
		'Postgres',
		['n8n-nodes-base.postgres'],
		['credential:postgres:n8n-nodes-base.postgres'],
	],
	[
		'drive-name',
		'Google Drive',
		['n8n-nodes-base.googleDrive'],
		['credential:googleDriveOAuth2Api:n8n-nodes-base.googleDrive'],
	],
	[
		'supabase-ambiguity',
		'Supabase',
		[
			'n8n-nodes-base.supabase',
			'n8n-nodes-base.postgres',
			'@n8n/n8n-nodes-langchain.vectorStoreSupabase',
		],
		[],
	],
	['http-ambiguity', 'Use our usual credential', ['n8n-nodes-base.httpRequest'], []],
	['unrelated-scoped', 'Convert CSV to JSON', ['n8n-nodes-base.code'], []],
	['unrelated-broad', 'Convert CSV to JSON', run.sources.contexts, []],
	['unrelated-boilerplate', 'Convert CSV to JSON in this project', run.sources.contexts, []],
	['explicit-change', 'Use Microsoft Teams, do not use Slack', slackContexts, []],
	['empty-contexts', 'Slack', [], []],
	['other-project', 'Slack', run.sources.contexts, []],
];
const probes = probeRows.map(([id, query, contexts, targetKeys]) => ({
	id,
	query,
	contexts,
	targetKeys,
	projectId: id === 'other-project' ? `${run.projectId}-scope-control` : run.projectId,
	folderId: null,
}));

const combinations = [];
const retrievals = [];
const folderChecks = [];
for (let mask = 0; mask < 16; mask++) {
	const selected = sourceNames.filter((_, bit) => mask & (1 << bit));
	const id = selected.join('+') || 'baseline';
	const missing = selected.filter(
		(name) => !run.results.some((r) => r.approach === name && r.status === 'complete'),
	);
	if (missing.length) {
		combinations.push({
			id,
			selected,
			status: 'blocked',
			missing,
			sourceMetrics: sumMiningMetrics(
				run.results.filter((r) => selected.includes(r.approach)).map((r) => r.metrics),
			),
		});
		for (const mode of ['prompt', 'recall']) {
			for (const probe of probes)
				retrievals.push({ combination: id, mode, probe: probe.id, status: 'blocked', missing });
		}
		continue;
	}
	// Only excluded sources become empty. A selected source must have real output.
	const inputs = sourceNames.map((name) =>
		selected.includes(name)
			? structuredClone(run.results.find((r) => r.approach === name))
			: emptyResult(name),
	);
	const result = runCombined(inputs);
	combinations.push({
		id,
		selected,
		status: 'complete',
		result,
		contextCharacters: result.preferences.map((p) => p.content).join('\n').length,
		contextEstimate: await estimatePreferenceContext(result.preferences, pricing),
		sourceMetrics: result.metrics,
	});
	for (const mode of ['prompt', 'recall']) {
		for (const probe of probes) {
			const preferences = retrieve(result.preferences, probe, memory, mode, 5);
			const availableTargets = probe.targetKeys.filter((key) =>
				result.preferences.some((p) => p.key === key),
			);
			retrievals.push({
				combination: id,
				mode,
				probe: probe.id,
				status: 'complete',
				keys: preferences.map((p) => p.key),
				characters: preferences.map((p) => p.content).join('\n').length,
				contextEstimate: await estimatePreferenceContext(preferences, pricing),
				availableTargets,
				missingTargets: availableTargets.filter((key) => !preferences.some((p) => p.key === key)),
			});
		}
		for (const folder of run.sources.folders) {
			const probe = { ...probes[1], folderId: folder.id };
			const preferences = retrieve(result.preferences, probe, memory, mode, 5);
			folderChecks.push({
				combination: id,
				mode,
				folderId: folder.id,
				keys: preferences.map((p) => p.key),
				leaks: preferences
					.filter(
						(p) => p.projectId !== probe.projectId || (p.folderId && p.folderId !== probe.folderId),
					)
					.map((p) => p.key),
			});
		}
	}
}
const modeTotals = combinations.flatMap((combination) =>
	['prompt', 'recall'].map((mode) => {
		if (combination.status !== 'complete')
			return { combination: combination.id, mode, status: 'blocked' };
		const rows = retrievals.filter(
			(row) => row.combination === combination.id && row.mode === mode,
		);
		return {
			combination: combination.id,
			mode,
			status: 'complete',
			estimatedInputTokens: rows.reduce((n, row) => n + row.contextEstimate.tokens, 0),
			estimatedInputCost: rows.every((row) => row.contextEstimate.estimatedInputCost !== null)
				? rows.reduce((n, row) => n + row.contextEstimate.estimatedInputCost, 0)
				: null,
		};
	}),
);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const report = {
	generatedAt: new Date().toISOString(),
	runId: run.id,
	projectId: run.projectId,
	pricing: pricing ?? null,
	pricingBasis: values['refresh-pricing']
		? 'Catalog resolved during replay; not historical invoice rates'
		: 'Run snapshot',
	miningMetrics,
	tokenEstimateMethod:
		'cl100k_base encoding of preference content joined with newlines. Local estimate, not provider usage. Excludes query, system prompt, tool schema, recall calls, wrappers, and output.',
	costEstimateMethod:
		'Uncached input cost per inclusion of preference text. No model calls during replay. Mining costs are separate and counted once.',
	modeTotals,
	provenance: {
		snapshotSha256: hash(snapshotText),
		labSha256: hash(await readFile(labFile)),
		estimatesSha256: hash(await readFile(estimatesFile)),
		metricsSha256: hash(await readFile(metricsFile)),
		memorySha256: hash(await readFile(memoryFile)),
		replaySha256: hash(await readFile(fileURLToPath(import.meta.url))),
	},
	method:
		'Reuse completed source results. Apply the existing merge and retrieval functions. Do not call models. Probe targets check retrieval of existing preferences, not user intent or workflow quality.',
	summary: {
		combinations: combinations.length,
		completeCombinations: combinations.filter((c) => c.status === 'complete').length,
		blockedCombinations: combinations.filter((c) => c.status === 'blocked').length,
		modes: ['prompt', 'recall'],
		topK: 5,
		probeCases: retrievals.length,
		completeProbeCases: retrievals.filter((r) => r.status === 'complete').length,
		blockedProbeCases: retrievals.filter((r) => r.status === 'blocked').length,
		folderChecks: folderChecks.length,
		folderScopeLeaks: folderChecks.reduce((n, check) => n + check.leaks.length, 0),
		modelCallsDuringReplay: 0,
	},
	probes,
	combinations,
	retrievals,
	folderChecks,
};
await mkdir(values.output, { recursive: true });
await writeFile(resolve(values.output, 'matrix.json'), `${JSON.stringify(report, null, 2)}\n`);
const usd = (value) => (value === null || value === undefined ? 'Unknown' : `$${value.toFixed(6)}`);
const lines = [
	'# Source combination replay',
	'',
	`Run: ${run.id}. Each completed row was replayed in prompt and recall modes.`,
	'',
	'| Sources | Status | Preferences | Context tokens, estimated | Source model calls | Known source cost, USD | Total source cost, USD |',
	'| --- | --- | ---: | ---: | ---: | ---: | ---: |',
	...combinations.map((c) =>
		c.status === 'complete'
			? `| ${c.id} | Complete | ${c.result.preferences.length} | ${c.contextEstimate.tokens} | ${c.sourceMetrics.modelCalls} | ${usd(c.sourceMetrics.knownCost)} | ${usd(c.sourceMetrics.estimatedCost)} |`
			: `| ${c.id} | Blocked: ${c.missing.join(', ')} | — | — | ${c.sourceMetrics.modelCalls} | ${usd(c.sourceMetrics.knownCost)} | ${usd(c.sourceMetrics.estimatedCost)} |`,
	),
	'',
	'Counts measure retrieved preferences. They do not measure builder accuracy.',
	'Source cost is reused. Do not add source costs across combination rows.',
	`All source passes: ${miningMetrics.modelCalls} Agent calls; ${miningMetrics.inputTokens} reported input tokens; ${miningMetrics.outputTokens} reported output tokens. Known cost: ${usd(miningMetrics.knownCost)}. Total cost: ${usd(miningMetrics.estimatedCost)}.`,
	'',
	'## Preference input estimates across the 16 probes',
	'',
	'| Sources | Mode | Status | Input tokens, estimated | Input cost, estimated USD |',
	'| --- | --- | --- | ---: | ---: |',
	...modeTotals.map(
		(row) =>
			`| ${row.combination} | ${row.mode} | ${row.status} | ${row.estimatedInputTokens ?? '—'} | ${row.status === 'blocked' ? '—' : usd(row.estimatedInputCost)} |`,
	),
	'',
	`Pricing: ${pricing ? `${pricing.modelId}; ${usd(pricing.input)} input and ${usd(pricing.output)} output per million tokens; ${pricing.source}; resolved ${pricing.resolvedAt}.` : 'Unavailable. Nonempty context cost remains unknown.'}`,
	'Counts use cl100k_base as a local estimate. Actual provider token counts can differ.',
	'Input costs cover preference text only. They exclude the request, system prompt, wrappers, tools, recall calls, and output. They are not total builder costs or measured spend.',
	'',
];
await writeFile(resolve(values.output, 'matrix.md'), lines.join('\n'));
console.log(JSON.stringify(report.summary, null, 2));
