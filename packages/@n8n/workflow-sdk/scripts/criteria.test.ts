import {
	mechanicalGateCatalog,
	mechanicalGateDetail,
	tractionScore,
	recencyScore,
	coverageScore,
	clarityScore,
	densityScore,
	bucketKey,
	bucketKeyToString,
	scoreCatalogEntry,
	scoreDetailedTemplate,
	hasAI,
	WEIGHTS,
	NODE_COUNT_MIN,
	NODE_COUNT_MAX,
	__test,
	type BucketKey,
} from './criteria';
import type { CatalogEntry, DetailResponse } from './fetch-templates';

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeCatalog(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
	return {
		id: 1,
		name: 'Test Workflow',
		totalViews: 1000,
		createdAt: new Date().toISOString(),
		user: { username: 'someone', verified: true },
		purchaseUrl: null,
		nodes: Array.from({ length: 5 }, (_, i) => ({ name: `node-${i}` })),
		...overrides,
	};
}

function makeDetail(
	opts: {
		nodes?: Array<Record<string, unknown>>;
		connections?: Record<string, unknown>;
		views?: number;
		recentViews?: number;
		updatedAt?: string;
		status?: string;
	} = {},
): DetailResponse {
	return {
		data: {
			id: 1,
			attributes: {
				name: 'Detail',
				description: '',
				workflow: {
					nodes: opts.nodes ?? [
						{ id: 't', name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger' },
						{ id: 'a', name: 'My Slack Post', type: 'n8n-nodes-base.slack' },
						{ id: 'b', name: 'Format Output', type: 'n8n-nodes-base.set' },
					],
					connections: opts.connections ?? {},
				},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: opts.updatedAt ?? new Date().toISOString(),
				views: opts.views ?? 1000,
				recentViews: opts.recentViews ?? 5,
				hidden: false,
				username: 'someone',
				status: opts.status ?? 'published',
				price: null,
				difficulty: null,
				readyToDemo: null,
			},
		},
		meta: {},
	};
}

// ---------------------------------------------------------------------------
// Mechanical gate
// ---------------------------------------------------------------------------

describe('mechanicalGateCatalog', () => {
	it('passes a typical free verified workflow', () => {
		expect(mechanicalGateCatalog(makeCatalog())).toEqual({ ok: true });
	});

	it('rejects paid via purchaseUrl', () => {
		const r = mechanicalGateCatalog(makeCatalog({ purchaseUrl: 'https://example.com/buy' }));
		expect(r.ok).toBe(false);
	});

	it('rejects paid via positive price', () => {
		const r = mechanicalGateCatalog(makeCatalog({ price: 5 }));
		expect(r.ok).toBe(false);
	});

	it('rejects unverified author', () => {
		const r = mechanicalGateCatalog(makeCatalog({ user: { username: 'rando', verified: false } }));
		expect(r.ok).toBe(false);
	});

	it('rejects oversized workflow at the catalog stage', () => {
		const big = makeCatalog({
			nodes: Array.from({ length: NODE_COUNT_MAX + 5 }, (_, i) => ({ name: `n${i}` })),
		});
		const r = mechanicalGateCatalog(big);
		expect(r.ok).toBe(false);
	});

	it('does NOT enforce lower bound at catalog stage (list nodes are sparse)', () => {
		const small = makeCatalog({ nodes: [{ name: 'x' }] });
		expect(mechanicalGateCatalog(small)).toEqual({ ok: true });
	});
});

describe('mechanicalGateDetail', () => {
	it('passes a typical workflow with trigger', () => {
		expect(mechanicalGateDetail(makeDetail())).toEqual({ ok: true });
	});

	it('rejects unpublished status', () => {
		const r = mechanicalGateDetail(makeDetail({ status: 'draft' }));
		expect(r.ok).toBe(false);
	});

	it('rejects too-small node count', () => {
		const r = mechanicalGateDetail(
			makeDetail({
				nodes: Array.from({ length: NODE_COUNT_MIN - 1 }, (_, i) => ({
					id: String(i),
					type: 'n8n-nodes-base.set',
				})),
			}),
		);
		expect(r.ok).toBe(false);
	});

	it('rejects too-large node count', () => {
		const r = mechanicalGateDetail(
			makeDetail({
				nodes: Array.from({ length: NODE_COUNT_MAX + 1 }, (_, i) => ({
					id: String(i),
					type: 'n8n-nodes-base.set',
				})),
			}),
		);
		expect(r.ok).toBe(false);
	});

	it('rejects when no trigger present', () => {
		const r = mechanicalGateDetail(
			makeDetail({
				nodes: [
					{ id: '1', type: 'n8n-nodes-base.set' },
					{ id: '2', type: 'n8n-nodes-base.slack' },
					{ id: '3', type: 'n8n-nodes-base.gmail' },
				],
			}),
		);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.reason).toContain('trigger');
	});
});

// ---------------------------------------------------------------------------
// Per-dimension scorers
// ---------------------------------------------------------------------------

describe('tractionScore', () => {
	it('is monotonic in views', () => {
		expect(tractionScore(10, 0)).toBeLessThan(tractionScore(1000, 0));
		expect(tractionScore(1000, 0)).toBeLessThan(tractionScore(100000, 0));
	});

	it('is bounded in [0, 1]', () => {
		expect(tractionScore(0, 0)).toBe(0);
		expect(tractionScore(10_000_000, 10_000_000)).toBeLessThanOrEqual(1);
	});
});

describe('recencyScore', () => {
	const now = new Date('2026-05-07T00:00:00Z').getTime();

	it('is 1.0 for fresh workflows (≤90d)', () => {
		const updatedAt = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
		expect(recencyScore(updatedAt, now)).toBe(1);
	});

	it('is 0 for workflows older than 2y', () => {
		const updatedAt = new Date(now - 1000 * 24 * 3600 * 1000).toISOString();
		expect(recencyScore(updatedAt, now)).toBe(0);
	});

	it('decays linearly between 90d and 2y', () => {
		const oneYearAgo = new Date(now - 365 * 24 * 3600 * 1000).toISOString();
		const score = recencyScore(oneYearAgo, now);
		expect(score).toBeGreaterThan(0);
		expect(score).toBeLessThan(1);
	});
});

describe('coverageScore', () => {
	const bucket: BucketKey = {
		triggerType: 'webhook',
		primaryIntegration: 'slack',
		hasAI: false,
		controlFlowKind: 'linear',
	};

	it('is 1.0 for an empty running set', () => {
		expect(coverageScore(bucket, [])).toBe(1);
	});

	it('halves with each duplicate bucket', () => {
		expect(coverageScore(bucket, [bucket])).toBeCloseTo(0.5);
		expect(coverageScore(bucket, [bucket, bucket])).toBeCloseTo(1 / 3);
	});

	it('is unaffected by other buckets', () => {
		const other: BucketKey = { ...bucket, triggerType: 'schedule' };
		expect(coverageScore(bucket, [other, other, other])).toBe(1);
	});
});

describe('clarityScore', () => {
	it('rewards named nodes, sticky notes, and distinct types', () => {
		const detail = makeDetail({
			nodes: [
				{ id: 'sticky', type: 'n8n-nodes-base.stickyNote', name: 'Doc' },
				{ id: 't', type: 'n8n-nodes-base.scheduleTrigger', name: 'Daily 9am' },
				{ id: 'a', type: 'n8n-nodes-base.slack', name: 'Post update' },
				{ id: 'b', type: 'n8n-nodes-base.gmail', name: 'Send digest' },
			],
		});
		// All real nodes named, sticky present, ≥3 distinct types → 0.4 + 0.3 + 0.3 = 1.0
		expect(clarityScore(detail)).toBeCloseTo(1.0);
	});

	it('penalises default-named workflows', () => {
		const detail = makeDetail({
			nodes: [
				{ id: 't', type: 'n8n-nodes-base.scheduleTrigger', name: 'Schedule Trigger' },
				{ id: 's1', type: 'n8n-nodes-base.set', name: 'Edit Fields' },
				{ id: 's2', type: 'n8n-nodes-base.set', name: 'Edit Fields1' },
			],
		});
		// All default-named, no sticky, only 2 distinct types
		expect(clarityScore(detail)).toBeLessThan(0.4);
	});
});

describe('densityScore', () => {
	it('is 1.0 when every node is a different type', () => {
		const detail = makeDetail({
			nodes: [
				{ id: 't', type: 'n8n-nodes-base.scheduleTrigger' },
				{ id: 'a', type: 'n8n-nodes-base.slack' },
				{ id: 'b', type: 'n8n-nodes-base.gmail' },
			],
		});
		expect(densityScore(detail)).toBe(1);
	});

	it('is low when many nodes share types', () => {
		const detail = makeDetail({
			nodes: [
				{ id: 't', type: 'n8n-nodes-base.scheduleTrigger' },
				{ id: '1', type: 'n8n-nodes-base.set' },
				{ id: '2', type: 'n8n-nodes-base.set' },
				{ id: '3', type: 'n8n-nodes-base.set' },
			],
		});
		// 2 distinct / 4 nodes = 0.5
		expect(densityScore(detail)).toBeCloseTo(0.5);
	});
});

// ---------------------------------------------------------------------------
// Bucket key
// ---------------------------------------------------------------------------

describe('bucketKey', () => {
	it('classifies a webhook → slack workflow without AI', () => {
		const detail = makeDetail({
			nodes: [
				{ id: 't', type: 'n8n-nodes-base.webhook' },
				{ id: 'a', type: 'n8n-nodes-base.slack' },
				{ id: 'b', type: 'n8n-nodes-base.set' },
			],
		});
		const key = bucketKey(detail);
		expect(key.triggerType).toBe('webhook');
		expect(key.primaryIntegration).toBe('slack');
		expect(key.hasAI).toBe(false);
		expect(key.controlFlowKind).toBe('linear');
	});

	it('classifies AI agent workflows', () => {
		const detail = makeDetail({
			nodes: [
				{ id: 't', type: '@n8n/n8n-nodes-langchain.chatTrigger' },
				{ id: 'm', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' },
				{ id: 'a', type: '@n8n/n8n-nodes-langchain.agent' },
			],
		});
		const key = bucketKey(detail);
		expect(key.triggerType).toBe('chatTrigger');
		expect(key.hasAI).toBe(true);
	});

	it('detects branching control flow', () => {
		const detail = makeDetail({
			nodes: [
				{ id: 't', type: 'n8n-nodes-base.scheduleTrigger' },
				{ id: 'i', type: 'n8n-nodes-base.if' },
				{ id: 'a', type: 'n8n-nodes-base.slack' },
				{ id: 'b', type: 'n8n-nodes-base.gmail' },
			],
			connections: {},
		});
		expect(bucketKey(detail).controlFlowKind).toBe('branching');
	});

	it('detects loop control flow', () => {
		const detail = makeDetail({
			nodes: [
				{ id: 't', type: 'n8n-nodes-base.scheduleTrigger' },
				{ id: 'l', type: 'n8n-nodes-base.splitInBatches' },
				{ id: 'a', type: 'n8n-nodes-base.slack' },
			],
		});
		expect(bucketKey(detail).controlFlowKind).toBe('loop');
	});

	it('detects parallel control flow from connections fan-out', () => {
		const detail = makeDetail({
			nodes: [
				{ id: 't', type: 'n8n-nodes-base.scheduleTrigger', name: 'Trigger' },
				{ id: 'a', type: 'n8n-nodes-base.slack', name: 'A' },
				{ id: 'b', type: 'n8n-nodes-base.gmail', name: 'B' },
			],
			connections: {
				Trigger: {
					main: [
						[
							{ node: 'A', type: 'main', index: 0 },
							{ node: 'B', type: 'main', index: 0 },
						],
					],
				},
			},
		});
		expect(bucketKey(detail).controlFlowKind).toBe('parallel');
	});
});

describe('bucketKeyToString', () => {
	it('produces stable keys', () => {
		const a: BucketKey = {
			triggerType: 'webhook',
			primaryIntegration: 'slack',
			hasAI: false,
			controlFlowKind: 'linear',
		};
		expect(bucketKeyToString(a)).toBe('webhook|slack|noai|linear');
	});
});

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

describe('scoreCatalogEntry', () => {
	it('uses traction + recency only (other dims zero)', () => {
		const entry = makeCatalog({ totalViews: 10000, createdAt: new Date().toISOString() });
		const result = scoreCatalogEntry(entry);
		expect(result.breakdown.coverage).toBe(0);
		expect(result.breakdown.clarity).toBe(0);
		expect(result.breakdown.density).toBe(0);
		expect(result.total).toBeGreaterThan(0);
	});
});

describe('scoreDetailedTemplate', () => {
	it('combines all weighted dimensions', () => {
		const entry = makeCatalog();
		const detail = makeDetail();
		const result = scoreDetailedTemplate(entry, detail, []);
		expect(result.breakdown.traction).toBeGreaterThan(0);
		expect(result.breakdown.recency).toBeGreaterThan(0);
		expect(result.breakdown.coverage).toBe(1); // empty running set
		expect(result.total).toBeGreaterThan(0);
	});

	it('drops coverage as duplicates accumulate', () => {
		const entry = makeCatalog();
		const detail = makeDetail();
		const bucket = bucketKey(detail);
		const empty = scoreDetailedTemplate(entry, detail, []);
		const oneDup = scoreDetailedTemplate(entry, detail, [bucket]);
		expect(empty.total).toBeGreaterThan(oneDup.total);
	});

	it('aiAgent dimension contributes 0 to total because weight is 0', () => {
		const entry = makeCatalog();
		const aiDetail = makeDetail({
			nodes: [
				{ id: 't', type: '@n8n/n8n-nodes-langchain.chatTrigger' },
				{ id: 'a', type: '@n8n/n8n-nodes-langchain.agent' },
				{ id: 'm', type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' },
				{ id: 'l', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' },
			],
		});
		const noAiDetail = makeDetail();
		const aiResult = scoreDetailedTemplate(entry, aiDetail, []);
		const noAiResult = scoreDetailedTemplate(entry, noAiDetail, []);
		// AI signal is computed but the weight is 0 for now
		expect(aiResult.breakdown.aiAgent).toBeGreaterThan(0);
		expect(noAiResult.breakdown.aiAgent).toBe(0);
		expect(WEIGHTS.aiAgent).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Tagged internals (compact tests, low-risk)
// ---------------------------------------------------------------------------

describe('internal helpers', () => {
	it('vendorOf strips type prefix', () => {
		expect(__test.vendorOf('n8n-nodes-base.googleSheets')).toBe('googleSheets');
		expect(__test.vendorOf('@n8n/n8n-nodes-langchain.openAi')).toBe('langchain');
	});

	it('isDefaultName flags repeated default-style names', () => {
		expect(__test.isDefaultName({ name: 'Edit Fields', type: 'n8n-nodes-base.set' })).toBe(true);
		expect(__test.isDefaultName({ name: 'Edit Fields1', type: 'n8n-nodes-base.set' })).toBe(true);
		expect(__test.isDefaultName({ name: 'My Slack Post', type: 'n8n-nodes-base.slack' })).toBe(
			false,
		);
	});

	it('hasAI is true for any langchain-prefixed node', () => {
		const detail = makeDetail({
			nodes: [
				{ id: 't', type: 'n8n-nodes-base.scheduleTrigger' },
				{ id: 'a', type: '@n8n/n8n-nodes-langchain.agent' },
			],
		});
		expect(hasAI(detail)).toBe(true);
	});
});
