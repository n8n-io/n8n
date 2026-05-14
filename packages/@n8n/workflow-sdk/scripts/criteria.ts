/**
 * Helpfulness rubric for template curation.
 *
 * Tunable knobs are at the top of the file. Documentation lives in
 * `docs/template-criteria.md`. The score breakdown is preserved per template
 * so manifest entries are reviewable: anyone can see why a template ranked
 * where it did.
 *
 * Two scoring stages:
 *   - `scoreCatalogEntry()` — runs against cheap list metadata, used to pick
 *     the top-K candidates worth fetching detail for.
 *   - `scoreDetailedTemplate()` — runs against full detail JSON, used to
 *     pick the final manifest set with full diversity bucketing.
 */
import type { CatalogEntry, DetailResponse } from './fetch-templates';

// ---------------------------------------------------------------------------
// Tunable weights
// ---------------------------------------------------------------------------

export const WEIGHTS = {
	traction: 20,
	recency: 20,
	coverage: 35,
	aiAgent: 0, // folded into bucket key; lift if telemetry shows under-use
	clarity: 15,
	density: 5,
} as const;

export const NODE_COUNT_MIN = 3;
export const NODE_COUNT_MAX = 40;
export const RECENCY_FRESH_DAYS = 90;
export const RECENCY_STALE_DAYS = 730; // 2 years

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GateResult = { ok: true } | { ok: false; reason: string };

export interface RubricBreakdown {
	traction: number;
	recency: number;
	coverage: number;
	aiAgent: number;
	clarity: number;
	density: number;
}

export interface ScoreResult {
	total: number;
	breakdown: RubricBreakdown;
}

export type TriggerType =
	| 'webhook'
	| 'schedule'
	| 'chatTrigger'
	| 'formTrigger'
	| 'manual'
	| 'telegram'
	| 'gmail'
	| 'other';

export type ControlFlowKind = 'linear' | 'branching' | 'loop' | 'parallel';

export interface BucketKey {
	triggerType: TriggerType;
	primaryIntegration: string;
	hasAI: boolean;
	controlFlowKind: ControlFlowKind;
}

// ---------------------------------------------------------------------------
// Mechanical gate
// ---------------------------------------------------------------------------

/** Catalog-stage gate. List-only metadata. */
export function mechanicalGateCatalog(entry: CatalogEntry): GateResult {
	if (entry.purchaseUrl !== null) return { ok: false, reason: 'paid (purchaseUrl set)' };
	if (entry.price !== null && entry.price !== undefined && entry.price > 0) {
		return { ok: false, reason: `paid (price=${entry.price})` };
	}
	if (!entry.user?.verified) return { ok: false, reason: 'unverified author' };
	const listNodeCount = entry.nodes?.length ?? 0;
	// List nodes is sparse; only enforce upper bound here. Lower bound rechecked at detail.
	if (listNodeCount > NODE_COUNT_MAX) {
		return { ok: false, reason: `too large (list reports ${listNodeCount} nodes)` };
	}
	return { ok: true };
}

/** Detail-stage gate. Real workflow JSON. */
export function mechanicalGateDetail(detail: DetailResponse): GateResult {
	const attrs = detail.data.attributes;
	if (attrs.status !== 'published') return { ok: false, reason: `status=${attrs.status}` };
	const realNodeCount = attrs.workflow.nodes?.length ?? 0;
	if (realNodeCount < NODE_COUNT_MIN || realNodeCount > NODE_COUNT_MAX) {
		return {
			ok: false,
			reason: `nodeCount ${realNodeCount} outside [${NODE_COUNT_MIN}, ${NODE_COUNT_MAX}]`,
		};
	}
	if (findTriggerNode(detail) === null) {
		return { ok: false, reason: 'no trigger node' };
	}
	return { ok: true };
}

// ---------------------------------------------------------------------------
// Per-dimension scorers
// ---------------------------------------------------------------------------

/** Traction: log-scaled views; mixes total + recent so freshness matters too. */
export function tractionScore(totalViews: number, recentViews: number): number {
	const total = Math.log10(Math.max(0, totalViews) + 1);
	const recent = Math.log10(Math.max(0, recentViews) + 1);
	// Normalise to ~[0, 1]: log10(1M) = 6, log10(1K) = 3 → cap divisor at 8
	return Math.min(1, (total + recent) / 8);
}

/** Recency: 1.0 if updated within N days, 0.0 once stale, linear in between. */
export function recencyScore(updatedAt: string, now: number = Date.now()): number {
	const ageMs = now - new Date(updatedAt).getTime();
	const ageDays = ageMs / (24 * 3600 * 1000);
	if (ageDays <= RECENCY_FRESH_DAYS) return 1;
	if (ageDays >= RECENCY_STALE_DAYS) return 0;
	return 1 - (ageDays - RECENCY_FRESH_DAYS) / (RECENCY_STALE_DAYS - RECENCY_FRESH_DAYS);
}

/** Marginal coverage: how rare is this template's bucket in the running set? */
export function coverageScore(bucket: BucketKey, runningSet: BucketKey[]): number {
	const key = bucketKeyToString(bucket);
	const count = runningSet.reduce(
		(n, existing) => (bucketKeyToString(existing) === key ? n + 1 : n),
		0,
	);
	return 1 / (1 + count);
}

/** AI-agent presence (currently weighted 0; signal still computed for telemetry). */
export function aiAgentScore(detail: DetailResponse): number {
	if (!hasAI(detail)) return 0;
	if (hasSubnodePattern(detail)) return 1;
	return 0.6;
}

/** Structural clarity: signals of authoring care. */
export function clarityScore(detail: DetailResponse): number {
	const nodes = detail.data.attributes.workflow.nodes ?? [];
	let score = 0;

	const realNodes = nodes.filter((n) => !isStickyNote(n));
	const namedRatio =
		realNodes.length === 0
			? 0
			: realNodes.filter((n) => !isDefaultName(n)).length / realNodes.length;
	if (namedRatio >= 0.5) score += 0.4;

	const stickyCount = nodes.filter(isStickyNote).length;
	if (stickyCount >= 1) score += 0.3;

	const distinctTypes = new Set(realNodes.map((n) => String(n.type ?? ''))).size;
	if (distinctTypes >= 3) score += 0.3;

	return score;
}

/** Pedagogical density: distinct node types relative to total. */
export function densityScore(detail: DetailResponse): number {
	const nodes = detail.data.attributes.workflow.nodes ?? [];
	const realNodes = nodes.filter((n) => !isStickyNote(n));
	if (realNodes.length === 0) return 0;
	const distinctTypes = new Set(realNodes.map((n) => String(n.type ?? ''))).size;
	return Math.min(1, distinctTypes / realNodes.length);
}

// ---------------------------------------------------------------------------
// Public scorers (compose per-dimension scores into totals)
// ---------------------------------------------------------------------------

/** Catalog-stage score. Does not include coverage, clarity, density (need detail). */
export function scoreCatalogEntry(entry: CatalogEntry): ScoreResult {
	const traction = tractionScore(entry.totalViews ?? 0, 0); // recentViews unavailable here
	// List endpoint only returns createdAt; detail stage rescores with updatedAt.
	const recency = recencyScore(entry.createdAt);
	const breakdown: RubricBreakdown = {
		traction,
		recency,
		coverage: 0,
		aiAgent: 0,
		clarity: 0,
		density: 0,
	};
	const total = WEIGHTS.traction * traction + WEIGHTS.recency * recency;
	return { total, breakdown };
}

/** Detail-stage score. Full rubric. `runningSet` lets coverage update as picks accumulate. */
export function scoreDetailedTemplate(
	entry: CatalogEntry,
	detail: DetailResponse,
	runningSet: BucketKey[],
): ScoreResult {
	const attrs = detail.data.attributes;
	const traction = tractionScore(attrs.views ?? 0, attrs.recentViews ?? 0);
	const recency = recencyScore(attrs.updatedAt);
	const bucket = bucketKey(detail);
	const coverage = coverageScore(bucket, runningSet);
	const aiAgent = aiAgentScore(detail);
	const clarity = clarityScore(detail);
	const density = densityScore(detail);

	const breakdown: RubricBreakdown = { traction, recency, coverage, aiAgent, clarity, density };
	const total =
		WEIGHTS.traction * traction +
		WEIGHTS.recency * recency +
		WEIGHTS.coverage * coverage +
		WEIGHTS.aiAgent * aiAgent +
		WEIGHTS.clarity * clarity +
		WEIGHTS.density * density;

	return { total, breakdown };
}

// ---------------------------------------------------------------------------
// Bucket key derivation
// ---------------------------------------------------------------------------

export function bucketKey(detail: DetailResponse): BucketKey {
	return {
		triggerType: classifyTrigger(detail),
		primaryIntegration: classifyIntegration(detail),
		hasAI: hasAI(detail),
		controlFlowKind: classifyControlFlow(detail),
	};
}

export function bucketKeyToString(b: BucketKey): string {
	return `${b.triggerType}|${b.primaryIntegration}|${b.hasAI ? 'ai' : 'noai'}|${b.controlFlowKind}`;
}

function classifyTrigger(detail: DetailResponse): TriggerType {
	const node = findTriggerNode(detail);
	if (!node) return 'other';
	const type = String(node.type ?? '');
	if (type.includes('chatTrigger')) return 'chatTrigger';
	if (type.includes('webhook')) return 'webhook';
	if (type.includes('scheduleTrigger') || type.includes('cron')) return 'schedule';
	if (type.includes('formTrigger')) return 'formTrigger';
	if (type.includes('manualTrigger')) return 'manual';
	if (type.includes('telegram')) return 'telegram';
	if (type.includes('gmail')) return 'gmail';
	return 'other';
}

function classifyIntegration(detail: DetailResponse): string {
	const counts = new Map<string, number>();
	for (const node of detail.data.attributes.workflow.nodes ?? []) {
		const t = String(node.type ?? '');
		if (!t) continue;
		// Skip triggers and meta nodes from primary integration calc
		if (isTriggerType(t) || isMetaType(t)) continue;
		const integ = vendorOf(t);
		counts.set(integ, (counts.get(integ) ?? 0) + 1);
	}
	if (counts.size === 0) return 'none';
	const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
	return sorted[0][0];
}

function classifyControlFlow(detail: DetailResponse): ControlFlowKind {
	const nodes = detail.data.attributes.workflow.nodes ?? [];
	const types = nodes.map((n) => String(n.type ?? ''));
	if (types.some((t) => t.includes('splitInBatches'))) return 'loop';
	if (types.some((t) => t.includes('.if') || t.includes('.switch'))) return 'branching';
	const connections = detail.data.attributes.workflow.connections ?? {};
	for (const fromNode of Object.values(connections)) {
		const main = (fromNode as { main?: unknown[][] }).main;
		if (Array.isArray(main) && main.length > 1) return 'parallel';
		if (Array.isArray(main) && main[0] && Array.isArray(main[0]) && main[0].length > 1) {
			return 'parallel';
		}
	}
	return 'linear';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findTriggerNode(detail: DetailResponse): Record<string, unknown> | null {
	for (const node of detail.data.attributes.workflow.nodes ?? []) {
		const type = String(node.type ?? '');
		if (isTriggerType(type)) return node;
	}
	return null;
}

function isTriggerType(type: string): boolean {
	return (
		type.includes('Trigger') ||
		type.endsWith('.webhook') ||
		type.endsWith('.cron') ||
		type.endsWith('.manualTrigger')
	);
}

function isMetaType(type: string): boolean {
	return type.endsWith('.stickyNote') || type.endsWith('.noOp');
}

function isStickyNote(node: Record<string, unknown>): boolean {
	return String(node.type ?? '').endsWith('.stickyNote');
}

/**
 * Names n8n auto-assigns when a node is added. Numeric suffixes (`Edit Fields1`,
 * `HTTP Request2`) are stripped before lookup. Curated; extend as new common
 * defaults surface.
 */
const KNOWN_DEFAULT_NAMES = new Set([
	'Edit Fields',
	'HTTP Request',
	'Schedule Trigger',
	'Manual Trigger',
	'Webhook',
	'Form Trigger',
	'Email Trigger (IMAP)',
	'When chat message received',
	'Sticky Note',
	'AI Agent',
	'Basic LLM Chain',
	'OpenAI Chat Model',
	'Simple Memory',
	'Window Buffer Memory',
]);

/**
 * Heuristic: is this node's name auto-generated by n8n rather than authored?
 *
 * Two flavours of default:
 *   - A single Title-Case word optionally followed by a digit: `Set`, `Code`,
 *     `Slack2`, `Gmail`. These are generated from the node's display name.
 *   - A known multi-word default in `KNOWN_DEFAULT_NAMES`.
 *
 * Custom names typically break out of these patterns by adding lowercase words
 * (`Post daily update`), specific personalisation (`My Slack post`), or by
 * being longer than the canonical default form.
 */
function isDefaultName(node: Record<string, unknown>): boolean {
	const name = String(node.name ?? '').trim();
	if (!name) return true;
	const stripped = name.replace(/\d+$/, '').trim();
	if (KNOWN_DEFAULT_NAMES.has(stripped)) return true;
	// Single Title-Case word: 'Set', 'Slack', 'Gmail'
	if (/^[A-Z][a-zA-Z]*$/.test(stripped)) return true;
	return false;
}

function vendorOf(type: string): string {
	// '@n8n/n8n-nodes-langchain.openAi' → 'langchain'
	// 'n8n-nodes-base.googleSheets' → 'googleSheets'
	if (type.startsWith('@n8n/n8n-nodes-langchain.')) return 'langchain';
	const dot = type.lastIndexOf('.');
	if (dot < 0) return type;
	return type.slice(dot + 1);
}

export function hasAI(detail: DetailResponse): boolean {
	for (const node of detail.data.attributes.workflow.nodes ?? []) {
		const t = String(node.type ?? '');
		if (t.startsWith('@n8n/n8n-nodes-langchain.')) return true;
		if (t.includes('openAi') || t.includes('anthropic')) return true;
	}
	return false;
}

function hasSubnodePattern(detail: DetailResponse): boolean {
	const types = (detail.data.attributes.workflow.nodes ?? []).map((n) => String(n.type ?? ''));
	const hasAgent = types.some((t) => t.endsWith('.agent'));
	const hasMemory = types.some((t) => t.includes('memory'));
	const hasTool = types.some((t) => t.includes('tool'));
	return hasAgent && (hasMemory || hasTool);
}

// ---------------------------------------------------------------------------
// Exports for tests
// ---------------------------------------------------------------------------

export const __test = {
	classifyTrigger,
	classifyIntegration,
	classifyControlFlow,
	findTriggerNode,
	isDefaultName,
	vendorOf,
};
