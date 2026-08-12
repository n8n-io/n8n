/**
 * Benchmark for the command-bar node content search.
 *
 * Answers two questions the feature has to satisfy before shipping:
 *   1. Is the search itself fast enough at realistic and pathological corpus sizes?
 *   2. Does running it degrade unrelated instance traffic (workflow list queries)?
 *
 * Run with: pnpm test:performance
 */
import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { STICKY_NODE_TYPE } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowNodeSearchService } from '@/workflows/workflow-node-search.service';

import { LOREM, seedCorpus } from './shared';

const CORPUS_SIZES = [20_000];
const NODES_PER_WORKFLOW = 12;
const SAMPLES = 30;

/** Realistic multi-node workflow (~6-8 KB JSON payload each). */
function buildNodes(workflowIndex: number) {
	const nodes = [];
	for (let n = 0; n < NODES_PER_WORKFLOW - 2; n++) {
		nodes.push({
			id: uuid(),
			name: `Step ${n} of flow ${workflowIndex}`,
			type: n % 3 === 0 ? 'n8n-nodes-base.httpRequest' : 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [n * 180, 260] as [number, number],
			notes: `Handles stage ${n}. ${LOREM.slice(0, 120)}`,
			parameters: {
				url: `https://api.internal.example.com/v2/resource/${workflowIndex}/${n}`,
				options: { timeout: 30_000, redirect: { followRedirects: true } },
				body: { mode: 'json', payload: LOREM.repeat(2) },
			},
		});
	}
	nodes.push({
		id: uuid(),
		name: `Docs ${workflowIndex}`,
		type: STICKY_NODE_TYPE,
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: { content: `## Runbook ${workflowIndex}\n\n${LOREM.repeat(4)}` },
	});
	// One rare needle, present in exactly one workflow of the corpus.
	if (workflowIndex === 0) {
		nodes.push({
			id: uuid(),
			name: 'Zzyzx Reconciliation Probe',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [0, 400] as [number, number],
			parameters: { note: 'zzyzx-unique-token' },
		});
	} else {
		nodes.push({
			id: uuid(),
			name: `Finalise ${workflowIndex}`,
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [0, 400] as [number, number],
			parameters: {},
		});
	}
	return nodes;
}

function stats(samples: number[]) {
	const sorted = [...samples].sort((a, b) => a - b);
	const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
	return {
		p50: at(0.5),
		p95: at(0.95),
		max: sorted[sorted.length - 1],
		mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
	};
}

const fmt = (s: ReturnType<typeof stats>) =>
	`p50=${s.p50.toFixed(1)}ms p95=${s.p95.toFixed(1)}ms max=${s.max.toFixed(1)}ms mean=${s.mean.toFixed(1)}ms`;

async function timeIt(fn: () => Promise<unknown>) {
	const t0 = performance.now();
	await fn();
	return performance.now() - t0;
}

describe('node search performance', () => {
	let searchService: WorkflowNodeSearchService;
	let owner: User;
	const report: string[] = [];

	beforeAll(async () => {
		await testDb.init();
		searchService = Container.get(WorkflowNodeSearchService);
	});

	afterAll(async () => {
		console.log(`\n${'='.repeat(78)}\nNODE SEARCH PERFORMANCE REPORT\n${'='.repeat(78)}`);
		report.forEach((line) => console.log(line));
		console.log('='.repeat(78));
		await testDb.terminate();
	});

	for (const corpusSize of CORPUS_SIZES) {
		describe(`corpus of ${corpusSize} workflows`, () => {
			beforeAll(async () => {
				const seedMs = await timeIt(async () => {
					owner = (await seedCorpus(corpusSize, buildNodes)).owner;
				});

				// A freshly bulk-loaded table has no statistics, so the planner guesses
				// and picks wildly different plans run to run. Real instances have been
				// analysed by autovacuum long before they reach this size, so analyse
				// here too — otherwise the benchmark measures a state production is
				// never in.
				await Container.get(DataSource).query('ANALYZE');
				report.push(
					`\n--- corpus ${corpusSize} workflows (~${corpusSize * NODES_PER_WORKFLOW} nodes), seeded in ${(seedMs / 1000).toFixed(1)}s ---`,
				);
			});

			it('search latency across query shapes', async () => {
				// 'step' hits nearly every workflow (worst case: cap always saturated).
				// 'zzyzx' hits exactly one. 'qqxzptv' hits none (full scan, no early exit).
				const shapes: Array<[string, string]> = [
					['broad hit (matches ~all)', 'step 3 of flow'],
					['rare hit (matches 1)', 'zzyzx-unique-token'],
					['no match (full scan)', 'qqxzptvnomatch'],
					['sticky prose', 'billing pipeline'],
				];

				const measured: Record<string, ReturnType<typeof stats>> = {};
				for (const [label, query] of shapes) {
					const samples: number[] = [];
					for (let i = 0; i < SAMPLES; i++) {
						samples.push(await timeIt(async () => await searchService.search(owner, query)));
					}
					const hits = (await searchService.search(owner, query)).length;
					measured[label] = stats(samples);
					report.push(`  search  ${label.padEnd(26)} ${fmt(stats(samples))}  hits=${hits}`);
				}

				// Queries that find matches must short-circuit on the updatedAt index
				// rather than scanning the corpus. Measured ~3-5ms at 20k; the bound is
				// loose enough for CI noise but fails if the index stops being used or
				// the sharing predicate reverts from EXISTS to IN (both measured >150ms).
				expect(measured['broad hit (matches ~all)'].p95).toBeLessThan(50);
				expect(measured['sticky prose'].p95).toBeLessThan(50);
			});

			it('does not degrade concurrent workflow list queries', async () => {
				// The query the workflow list endpoint runs. Measured at the repository
				// layer so the numbers reflect DB contention, not license/DTO overhead.
				const listOnce = async () =>
					await Container.get(WorkflowRepository).getManyAndCountWithSharingSubquery(
						owner,
						{
							scopes: ['workflow:read'],
							projectRoles: ['project:personalOwner'],
							workflowRoles: ['workflow:owner'],
						},
						{ take: 25, sortBy: 'updatedAt:desc' },
					);

				// Warm caches so the baseline is not measuring first-call overhead.
				await listOnce();

				const baseline: number[] = [];
				for (let i = 0; i < SAMPLES; i++) baseline.push(await timeIt(listOnce));
				const b = stats(baseline);
				report.push(`  list    ${'baseline (idle)'.padEnd(30)} ${fmt(b)}`);

				/**
				 * Measures list latency while `concurrentUsers` clients search. Each
				 * client is paced at the per-user rate limit the endpoint enforces
				 * (120/min = one call per 500ms); `pacingMs = 0` models an attacker who
				 * ignores it entirely, to bound the worst case.
				 *
				 * Uses the 'no match' query on purpose — it is the slowest shape, since
				 * proving absence cannot short-circuit on the updatedAt index.
				 */
				const underLoad = async (label: string, concurrentUsers: number, pacingMs: number) => {
					let running = true;
					let served = 0;
					let shed = 0;
					const clients = Array.from({ length: concurrentUsers }, async () => {
						while (running) {
							const started = performance.now();
							try {
								await searchService.search(owner, 'qqxzptvnomatch');
								served++;
							} catch {
								// 429 from the concurrency cap: load shed, which is the point.
								shed++;
							}
							const rest = pacingMs - (performance.now() - started);
							if (rest > 0) await new Promise((r) => setTimeout(r, rest));
						}
					});

					const samples: number[] = [];
					for (let i = 0; i < SAMPLES; i++) samples.push(await timeIt(listOnce));
					running = false;
					await Promise.all(clients);

					const s = stats(samples);
					report.push(
						`  list    ${label.padEnd(30)} ${fmt(s)}  ${(s.p95 / b.p95).toFixed(2)}x  (${served} served, ${shed} shed)`,
					);
					return s;
				};

				const oneUser = await underLoad('1 user @ rate limit', 1, 500);
				const manyUsers = await underLoad('20 users @ rate limit', 20, 500);
				const adversarial = await underLoad('adversarial (unthrottled)', 4, 0);

				// The point of the concurrency cap: impact stays bounded and does not
				// escalate with the number of clients searching. Without it, 20 users
				// each *within* their own rate limit measured 66x on SQLite and 56x on
				// Postgres.
				//
				// p50 covers the typical concurrent request; p95 is looser because a
				// single in-flight scan can land on one sampled query and add its whole
				// duration to that one sample.
				for (const s of [oneUser, manyUsers, adversarial]) {
					expect(s.p50 / b.p50).toBeLessThan(2);
					expect(s.p95 / b.p95).toBeLessThan(5);
				}
			});
		});
	}
});
