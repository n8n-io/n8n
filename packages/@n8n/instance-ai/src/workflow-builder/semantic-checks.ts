/**
 * Semantic checks
 *
 * Defensive validators that surface known node-config patterns the builder
 * regularly gets wrong but the Zod schema validator cannot catch. Each check
 * targets a *concrete runtime failure* the agent already produces — the goal
 * is to convert a downstream "Could not get parameter" / null reference into
 * a blocking submit-time error the builder can self-correct.
 *
 * Rules:
 *   - Only flag configurations that fail at runtime with high confidence.
 *   - Surface the fix in the message, not just the diagnosis — the builder
 *     consumes the text directly to plan the next patch.
 *   - Never invent business logic. We do not, for example, force
 *     `continueOnFail` on parallel branches — that is a design choice the
 *     agent owns.
 */

import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IDataObject } from 'n8n-workflow';

import type { ValidationWarning } from './types';

interface NodeForCheck {
	name?: string;
	type: string;
	parameters?: IDataObject;
}

function asRecord(value: unknown): IDataObject | undefined {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as IDataObject)
		: undefined;
}

function readMatchingColumns(columns: IDataObject | undefined): string[] | undefined {
	if (!columns) return undefined;
	const raw = columns.matchingColumns;
	if (!Array.isArray(raw)) return undefined;
	const filtered = raw.filter(
		(entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
	);
	return filtered.length > 0 ? filtered : undefined;
}

/**
 * Resource-mapper-shaped parameters. n8n's "resource mapper" is the
 * standardised UI for upsert/match-on operations across many nodes
 * (Google Sheets, Postgres, Microsoft SQL, MongoDB, MySQL, Airtable,
 * dataTable, Notion in some operations, etc.). The runtime contract is:
 *   - `mappingMode` selects between `defineBelow` (explicit per-column
 *     expressions in `value`) and `autoMapInputData` (top-level field
 *     copy).
 *   - `matchingColumns: string[]` names the columns used to identify
 *     existing rows in upsert/update operations.
 *   - `value: Record<string, unknown>` holds the per-column expression
 *     (when `mappingMode === 'defineBelow'`).
 *
 * Detection here is structural — we look for the shape, not the node
 * type — so the check generalises across all resource-mapper consumers
 * without enumerating node types.
 */
interface ResourceMapperShape {
	mappingMode?: unknown;
	matchingColumns: string[];
	value: IDataObject;
}

function readResourceMapper(parameters: IDataObject | undefined): ResourceMapperShape | undefined {
	const columns = asRecord(parameters?.columns);
	if (!columns) return undefined;
	const matching = readMatchingColumns(columns);
	if (!matching) return undefined;
	const value = asRecord(columns.value);
	if (!value) return undefined;
	return { mappingMode: columns.mappingMode, matchingColumns: matching, value };
}

/**
 * Volatile expressions that produce a *new* value every execution. When
 * one of these appears in the expression for a matching/upsert key, the
 * upsert can never match an existing row — every execution either fails
 * with `Could not get parameter` (Google Sheets) or inserts a duplicate
 * row (other resource-mapper consumers). The fix is always either to
 * remove that column from `matchingColumns` (it can still appear in
 * `value` as a written column) or to switch the operation to `append`
 * / `insert`.
 *
 * Patterns are deliberately conservative: each one names a runtime
 * primitive that *cannot* be a stable identifier:
 *   - `$now` / `$today`               : DateTime evaluated per execution
 *   - `Date.now()` / `new Date(`      : JS clock primitives
 *   - `Math.random(`                  : random
 *   - `crypto.randomUUID(` / `uuid(` / `randomUUID(` : random
 *   - `crypto.randomBytes(`           : random
 *   - `$execution.id`                 : per-execution id (never matches a prior row)
 *   - `$itemIndex` / `$runIndex`      : per-item / per-run counters
 */
const VOLATILE_EXPRESSION_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
	{ pattern: /\$now\b/, label: '$now' },
	{ pattern: /\$today\b/, label: '$today' },
	{ pattern: /\bDate\.now\s*\(/, label: 'Date.now()' },
	{ pattern: /\bnew\s+Date\s*\(/, label: 'new Date(...)' },
	{ pattern: /\bMath\.random\s*\(/, label: 'Math.random()' },
	{ pattern: /\b(?:crypto\.)?randomUUID\s*\(/, label: 'randomUUID()' },
	{ pattern: /\bcrypto\.randomBytes\s*\(/, label: 'crypto.randomBytes(...)' },
	{ pattern: /\buuid\s*\(/, label: 'uuid()' },
	{ pattern: /\$execution\.id\b/, label: '$execution.id' },
	{ pattern: /\$itemIndex\b/, label: '$itemIndex' },
	{ pattern: /\$runIndex\b/, label: '$runIndex' },
];

function findVolatileExpression(expression: string): string | undefined {
	if (!expression.startsWith('=')) return undefined;
	for (const { pattern, label } of VOLATILE_EXPRESSION_PATTERNS) {
		if (pattern.test(expression)) return label;
	}
	return undefined;
}

/**
 * Generic across all resource-mapper-using node types: if any column
 * named in `matchingColumns` resolves to a volatile expression in
 * `value`, the upsert / update operation can never match a prior row.
 * The same mechanism makes Google Sheets `appendOrUpdate` throw
 * `Could not get parameter` mid-execution and silently duplicates rows
 * on every other resource-mapper consumer.
 *
 * Detection is structural — we don't gate on node type — so this check
 * fires uniformly on Google Sheets, Postgres, Microsoft SQL, MongoDB,
 * MySQL, Airtable, dataTable, etc. once they use the resource-mapper
 * `columns.matchingColumns` shape.
 */
function checkResourceMapperMatchingColumnDynamicValue(
	node: NodeForCheck,
): ValidationWarning | undefined {
	const mapper = readResourceMapper(node.parameters);
	if (!mapper) return undefined;

	interface OffendingMatch {
		column: string;
		expression: string;
		volatile: string;
	}
	const offending: OffendingMatch[] = [];
	for (const column of mapper.matchingColumns) {
		const raw = mapper.value[column];
		if (typeof raw !== 'string') continue;
		const volatile = findVolatileExpression(raw);
		if (volatile) offending.push({ column, expression: raw, volatile });
	}
	if (offending.length === 0) return undefined;

	const pairs = offending
		.map((o) => `'${o.column}' = ${truncateForMessage(o.expression, 60)} (volatile: ${o.volatile})`)
		.join('; ');

	return {
		code: 'RESOURCE_MAPPER_MATCHING_COLUMN_DYNAMIC_VALUE',
		nodeName: node.name,
		parameterPath: 'parameters.columns.matchingColumns',
		message:
			`Node "${node.name ?? '(unnamed)'}" (${node.type}) lists matching column(s) whose value is a volatile expression evaluated per-execution: ${pairs}. ` +
			'A column used to identify an existing row in an upsert / update cannot be a fresh value every run — it will never match a prior row (and on Google Sheets it additionally throws "Could not get parameter" at runtime). ' +
			'Either (a) remove the volatile column(s) from `matchingColumns` and keep them as written columns only, leaving a stable identifier (e.g. an `Email`, `id`, or external key) as the match key, or (b) switch the operation to a non-matching variant (`append` / `insert`) if duplicates are acceptable.',
	};
}

const NODE_CHECKS: Array<(node: NodeForCheck) => ValidationWarning | undefined> = [
	checkResourceMapperMatchingColumnDynamicValue,
];

// ── Graph-context checks ────────────────────────────────────────────────────

/**
 * `autoMapInputData` is the resource-mapper option that copies each
 * top-level field of the upstream item into the same-named column on
 * the destination. After a Webhook trigger the upstream item only
 * carries the envelope keys `{ body, headers, query, params, webhookUrl,
 * executionMode }` — the form/JSON payload is nested under `body` — so
 * autoMapInputData populates only envelope keys and leaves the actual
 * data columns empty.
 *
 * This mechanism is shape-agnostic: it bites every consumer of the
 * shared resource-mapper UI (Google Sheets, Postgres, Microsoft SQL,
 * MongoDB, MySQL, Airtable, dataTable, Notion in some operations, etc.).
 * Detection is therefore structural — we don't gate on node type.
 *
 * Conditions (all must hold):
 *   1. Node parameters have the resource-mapper shape with
 *      `columns.mappingMode === 'autoMapInputData'`;
 *   2. Walking back through passthrough predecessors lands on a
 *      `n8n-nodes-base.webhook` node.
 *
 * Form Trigger / Chat Trigger / Telegram Trigger emit data at the top
 * level (or under a different envelope) and are intentionally NOT flagged.
 */
function checkResourceMapperAutoMapAfterWebhook(workflow: WorkflowJSON): ValidationWarning[] {
	const nodes = workflow.nodes ?? [];
	if (nodes.length === 0) return [];

	const predecessors = buildMainPredecessorMap(workflow);
	const nodeTypesByName = new Map<string, string>();
	for (const node of nodes) {
		if (node.name && node.type) nodeTypesByName.set(node.name, node.type);
	}

	const issues: ValidationWarning[] = [];
	for (const node of nodes) {
		if (!node.name || !node.type) continue;
		const columns = asRecord(node.parameters?.columns);
		if (!columns) continue;
		if (columns.mappingMode !== 'autoMapInputData') continue;

		const ancestor = findFirstNonPassthroughAncestor(node.name, predecessors, nodeTypesByName);
		if (!ancestor || ancestor.type !== 'n8n-nodes-base.webhook') continue;

		const isGoogleSheets = node.type === 'n8n-nodes-base.googleSheets';
		const code = isGoogleSheets
			? 'GOOGLE_SHEETS_AUTOMAP_AFTER_WEBHOOK'
			: 'RESOURCE_MAPPER_AUTOMAP_AFTER_WEBHOOK';

		issues.push({
			code,
			nodeName: node.name,
			parameterPath: 'parameters.columns.mappingMode',
			message:
				`Node "${node.name}" (${node.type}) uses mappingMode 'autoMapInputData', but its main input comes from the Webhook trigger "${ancestor.name}". ` +
				'Webhook output wraps the form/JSON payload under `body` (top-level keys are body, headers, query, params, webhookUrl, executionMode), so autoMapInputData only populates those envelope keys and leaves the real data columns empty. ' +
				`Switch to mappingMode 'defineBelow' with explicit per-column expressions referencing $('${ancestor.name}').item.json.body.<field>, or insert a Set node before "${node.name}" that flattens body into top-level fields.`,
		});
	}
	return issues;
}

/**
 * Top-level langchain root nodes whose main output is `{ output,
 * intermediateSteps }`. Reported with an Agent/Chain-specific message so the
 * agent gets the exact reason `$json.<trigger root>` resolves to `undefined`.
 * Sub-nodes (memory, models, tools, embeddings, vector stores) attach via
 * non-`main` outputs and never appear on the main ancestor chain.
 */
const LANGCHAIN_ROOT_TYPES: readonly string[] = [
	'@n8n/n8n-nodes-langchain.agent',
	'@n8n/n8n-nodes-langchain.chainLlm',
	'@n8n/n8n-nodes-langchain.chainSummarization',
	'@n8n/n8n-nodes-langchain.chainRetrievalQa',
	'@n8n/n8n-nodes-langchain.informationExtractor',
	'@n8n/n8n-nodes-langchain.textClassifier',
	'@n8n/n8n-nodes-langchain.sentimentAnalysis',
];

function isLangchainRoot(nodeType: string): boolean {
	return LANGCHAIN_ROOT_TYPES.includes(nodeType);
}

/**
 * Node types that genuinely passthrough `$json` from input to output — a
 * downstream `$json.<trigger root>` reference is still valid after them
 * because they do not emit their own data shape. Deliberately conservative:
 * Set, Code, Merge, SplitInBatches, SplitOut, and Aggregate are NOT here,
 * because they reshape data in ways the agent often doesn't anticipate.
 */
const PASSTHROUGH_NODE_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.filter',
	'n8n-nodes-base.noOp',
	'n8n-nodes-base.limit',
	'n8n-nodes-base.removeDuplicates',
	'n8n-nodes-base.sort',
	'n8n-nodes-base.stopAndError',
	'n8n-nodes-base.wait',
]);

function isPassthrough(nodeType: string): boolean {
	return PASSTHROUGH_NODE_TYPES.has(nodeType);
}

function isTriggerType(nodeType: string): boolean {
	return /Trigger$/i.test(nodeType) || nodeType.endsWith('.webhook');
}

/**
 * Known trigger-payload roots that are commonly read via `$json.<root>` and
 * that vanish after an agent/chain node clobbers `$json`. Matching is
 * structural — the presence of one of these segments at the head of a
 * `$json` path is a strong signal that the agent meant to reference the
 * original trigger payload, not whatever the upstream `main` actually
 * carries at evaluation time.
 */
const TRIGGER_JSON_PATH_ROOTS: readonly string[] = [
	'message', // Telegram Trigger
	'body', // Webhook
	'chatInput', // Chat Trigger
	'update', // Telegram raw update payload
	'from', // chat-like trigger sender
	'entry', // Slack / IG / FB event triggers
	'event', // Generic event triggers
];

const TRIGGER_JSON_REFERENCE_REGEX = new RegExp(
	`\\$json\\s*(?:\\.\\s*(${TRIGGER_JSON_PATH_ROOTS.join('|')})\\b|\\[\\s*['"](${TRIGGER_JSON_PATH_ROOTS.join('|')})['"]\\s*\\])`,
);

function firstTriggerJsonRoot(expression: string): string | undefined {
	const match = TRIGGER_JSON_REFERENCE_REGEX.exec(expression);
	if (!match) return undefined;
	return match[1] ?? match[2];
}

/**
 * Walk a parameter value tree and collect every expression string that
 * references `$json.<known trigger root>`. n8n expression strings are
 * leading-`=` strings; literal values are never evaluated.
 */
function collectTriggerJsonRefs(
	value: unknown,
	paramPath: string,
	out: Array<{ paramPath: string; expression: string; root: string }>,
): void {
	if (typeof value === 'string') {
		if (!value.startsWith('=')) return;
		const root = firstTriggerJsonRoot(value);
		if (root) out.push({ paramPath, expression: value, root });
		return;
	}
	if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			collectTriggerJsonRefs(value[i], `${paramPath}[${String(i)}]`, out);
		}
		return;
	}
	if (value && typeof value === 'object') {
		for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
			const nextPath = paramPath ? `${paramPath}.${key}` : key;
			collectTriggerJsonRefs(child, nextPath, out);
		}
	}
}

/**
 * Build a `dest -> sources` map for the `main` connection type only. Non-main
 * connections (ai_memory, ai_languageModel, ai_tool, ai_embedding, etc.) are
 * deliberately ignored — they are sub-node attachments and do not
 * participate in the data-flow `$json` ancestry chain.
 */
function buildMainPredecessorMap(workflow: WorkflowJSON): Map<string, Set<string>> {
	const out = new Map<string, Set<string>>();
	const connections = workflow.connections;
	if (!connections || typeof connections !== 'object') return out;
	for (const [sourceName, byType] of Object.entries(connections)) {
		if (!byType || typeof byType !== 'object') continue;
		const mainOutputs = (byType as Record<string, unknown>).main;
		if (!Array.isArray(mainOutputs)) continue;
		for (const targetList of mainOutputs) {
			if (!Array.isArray(targetList)) continue;
			for (const target of targetList) {
				if (!target || typeof target !== 'object') continue;
				const destName = (target as { node?: unknown }).node;
				const destType = (target as { type?: unknown }).type;
				if (typeof destName !== 'string') continue;
				if (typeof destType === 'string' && destType !== 'main') continue;
				let sources = out.get(destName);
				if (!sources) {
					sources = new Set();
					out.set(destName, sources);
				}
				sources.add(sourceName);
			}
		}
	}
	return out;
}

/**
 * Walk back from `nodeName` through passthrough predecessors. Returns the
 * first non-passthrough ancestor (the node whose output actually feeds the
 * starting node's `$json`), or undefined if the chain hits a graph root
 * without finding one. Triggers count as non-passthrough — they are the
 * legitimate source of trigger-shaped `$json`.
 */
function findFirstNonPassthroughAncestor(
	nodeName: string,
	predecessors: Map<string, Set<string>>,
	nodeTypesByName: Map<string, string>,
): { name: string; type: string } | undefined {
	const visited = new Set<string>();
	const queue: string[] = [];
	for (const src of predecessors.get(nodeName) ?? []) queue.push(src);
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current || visited.has(current)) continue;
		visited.add(current);
		const currentType = nodeTypesByName.get(current) ?? '';
		if (!isPassthrough(currentType)) {
			return { name: current, type: currentType };
		}
		for (const upstream of predecessors.get(current) ?? []) {
			if (!visited.has(upstream)) queue.push(upstream);
		}
	}
	return undefined;
}

/**
 * Find the closest trigger ancestor on the `main` chain leading into
 * `nodeName`. A trigger is a node whose type ends with `Trigger`, or one
 * that lives at the root of the connection graph (no main predecessors).
 * Used to produce the explicit `$('<TriggerName>').item.json.<…>` fix.
 */
function findClosestTriggerAncestor(
	nodeName: string,
	predecessors: Map<string, Set<string>>,
	nodeTypesByName: Map<string, string>,
): string | undefined {
	const visited = new Set<string>();
	const queue: string[] = [];
	let fallbackRoot: string | undefined;
	for (const src of predecessors.get(nodeName) ?? []) queue.push(src);
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current || visited.has(current)) continue;
		visited.add(current);
		const type = nodeTypesByName.get(current) ?? '';
		const isTrigger = /Trigger$/i.test(type) || type.endsWith('.webhook');
		if (isTrigger) return current;
		const upstreams = predecessors.get(current);
		if (!upstreams || upstreams.size === 0) fallbackRoot = current;
		else for (const upstream of upstreams) if (!visited.has(upstream)) queue.push(upstream);
	}
	return fallbackRoot;
}

function truncateForMessage(value: string, maxChars = 80): string {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, maxChars)}\u2026`;
}

/**
 * Detect trigger-data `$json` references that no longer point at the
 * trigger because an intermediate node has clobbered `$json` on the main
 * chain. Two failure modes share this root cause:
 *
 *   - Post-agent: Agent/Chain root emits `{ output, intermediateSteps }`
 *     and the downstream node still reads `$json.message.*` /
 *     `$json.body.*` / `$json.chatInput`. (telegram-chatbot scenario)
 *   - Post-action: Webhook → Gmail → Telegram → Sheets, where each
 *     action emits its own API response and the downstream node still
 *     reads `$json.body.<field>`. (contact-form scenario)
 *
 * Both silently resolve to `undefined` at runtime. The fix is the same:
 *   `$('<TriggerName>').item.json.<root>.\u2026`
 * which is stable regardless of the upstream main chain.
 *
 * Match conditions:
 *   1. Node is NOT itself a langchain root or a trigger — those
 *      legitimately read `$json` from their own input / config;
 *   2. Walking back through passthrough predecessors (IF/Switch/Filter/
 *      NoOp/Limit/Sort/RemoveDuplicates/StopAndError/Wait) does not land
 *      on a trigger; instead it lands on a clobbering node;
 *   3. Node parameters contain an expression string referencing
 *      `$json.<known trigger root>`.
 *
 * When the clobbering ancestor is a langchain root the message names
 * the Agent-specific output shape, otherwise it uses a generic message.
 */
function checkPostNonTriggerTriggerJsonRefs(workflow: WorkflowJSON): ValidationWarning[] {
	const nodes = workflow.nodes ?? [];
	if (nodes.length === 0) return [];

	const predecessors = buildMainPredecessorMap(workflow);
	const nodeTypesByName = new Map<string, string>();
	for (const node of nodes) {
		if (node.name && node.type) nodeTypesByName.set(node.name, node.type);
	}

	const issues: ValidationWarning[] = [];
	for (const node of nodes) {
		if (!node.name || !node.type) continue;
		if (isLangchainRoot(node.type)) continue;
		if (isTriggerType(node.type)) continue;

		const refs: Array<{ paramPath: string; expression: string; root: string }> = [];
		collectTriggerJsonRefs(node.parameters, '', refs);
		if (refs.length === 0) continue;

		const ancestor = findFirstNonPassthroughAncestor(node.name, predecessors, nodeTypesByName);
		if (!ancestor) continue; // No predecessor at all — this is the trigger fanout root.
		if (isTriggerType(ancestor.type)) continue; // Directly after the trigger (modulo passthroughs).

		const triggerName = findClosestTriggerAncestor(node.name, predecessors, nodeTypesByName);
		const sample = refs[0];
		const suggestion = triggerName
			? `Replace each $json.${sample.root}.\u2026 reference with $('${triggerName}').item.json.${sample.root}.\u2026 .`
			: `Reference the trigger directly by name instead of $json (e.g. $('<Trigger Node Name>').item.json.${sample.root}.\u2026).`;

		const clobberExplanation = isLangchainRoot(ancestor.type)
			? `Agent/chain nodes emit { output, intermediateSteps } on main output, so $json.${sample.root} resolves to undefined at runtime.`
			: `Every n8n node emits its own data on main output — after "${ancestor.name}" (${ancestor.type}) runs, $json is that node's response, not the trigger payload, so $json.${sample.root} resolves to undefined at runtime.`;

		const messageParts = [
			`Node "${node.name}" reads $json.${sample.root} (parameter ${sample.paramPath || 'parameters'}: ${truncateForMessage(sample.expression)}),`,
			`but its main-input chain runs through "${ancestor.name}" (${ancestor.type}).`,
			clobberExplanation,
			suggestion,
		];
		issues.push({
			code: isLangchainRoot(ancestor.type)
				? 'TRIGGER_JSON_REF_AFTER_AGENT'
				: 'TRIGGER_JSON_REF_AFTER_NON_TRIGGER',
			nodeName: node.name,
			parameterPath: sample.paramPath,
			message: messageParts.join(' '),
		});
	}
	return issues;
}

// ── Parallel-branches-before-Merge resilience check ──────────────────────────

/**
 * Node types that are NOT data-shaped external-API actions: control flow,
 * utility shaping, triggers, merge, and langchain roots/sub-nodes.
 *
 * Everything else is treated as "a node that calls an external system and
 * can therefore fail at runtime" — Gmail, Telegram, Slack, Google Sheets,
 * Notion, Airtable, Microsoft Teams, httpRequest, sendGrid, mailgun,
 * postgres, mysql, mongoDb, etc.
 *
 * The intent of the list is structural: anything that the agent typically
 * fans-out across parallel branches to satisfy a multi-action requirement
 * is counted as an action; anything used as plumbing is not.
 */
const NON_ACTION_NODE_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.set',
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
	'n8n-nodes-base.merge',
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.filter',
	'n8n-nodes-base.noOp',
	'n8n-nodes-base.limit',
	'n8n-nodes-base.removeDuplicates',
	'n8n-nodes-base.sort',
	'n8n-nodes-base.stopAndError',
	'n8n-nodes-base.wait',
	'n8n-nodes-base.splitInBatches',
	'n8n-nodes-base.splitOut',
	'n8n-nodes-base.itemLists',
	'n8n-nodes-base.aggregate',
	'n8n-nodes-base.dateTime',
	'n8n-nodes-base.respondToWebhook',
	'n8n-nodes-base.executeWorkflow',
	'n8n-nodes-base.errorTrigger',
]);

function isActionNode(type: string): boolean {
	if (NON_ACTION_NODE_TYPES.has(type)) return false;
	if (isPassthrough(type)) return false;
	if (isTriggerType(type)) return false;
	if (isLangchainRoot(type)) return false;
	if (type.startsWith('@n8n/n8n-nodes-langchain.')) return false;
	return true;
}

/**
 * onError value that makes a node's failure non-fatal for the rest of the
 * workflow: either route the error onto a separate pin (`continueErrorOutput`)
 * or emit empty main output (`continueRegularOutput`). Both keep downstream
 * branches alive; the default `stopWorkflow` does not.
 */
function nodeToleratesFailure(node: { onError?: unknown }): boolean {
	return node.onError === 'continueRegularOutput' || node.onError === 'continueErrorOutput';
}

/**
 * Collect every action-node ancestor (main chain only) of `startName`
 * walking back through predecessors. Stops at triggers and at langchain
 * roots. Returns `{ name, type, onErrorOk }` entries for every action node
 * encountered. Used per-branch-of-merge.
 */
function collectActionAncestors(
	startName: string,
	predecessors: Map<string, Set<string>>,
	nodesByName: Map<string, { type: string; onError?: unknown }>,
): Array<{ name: string; type: string; onErrorOk: boolean }> {
	const seen = new Set<string>();
	const result: Array<{ name: string; type: string; onErrorOk: boolean }> = [];
	const queue: string[] = [startName];
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current || seen.has(current)) continue;
		seen.add(current);
		const meta = nodesByName.get(current);
		if (!meta) continue;
		if (isTriggerType(meta.type)) continue; // do not cross triggers
		if (isLangchainRoot(meta.type)) continue; // langchain root terminates the data chain
		if (isActionNode(meta.type)) {
			result.push({
				name: current,
				type: meta.type,
				onErrorOk: nodeToleratesFailure(meta),
			});
		}
		for (const up of predecessors.get(current) ?? []) {
			if (!seen.has(up)) queue.push(up);
		}
	}
	return result;
}

/**
 * When the agent builds parallel-fan-out -> Merge to combine results of
 * several external-API actions, n8n's default per-node behavior
 * (`onError: 'stopWorkflow'`) means any single branch failure halts the
 * entire workflow before the Merge ever runs. The Merge node sitting in
 * the graph is the structural signal that the agent intends all branches
 * to contribute — so the absence of `onError` on any failable action node
 * upstream of the Merge is almost always a bug.
 *
 * Conditions (all must hold to flag):
 *   1. Merge node (`n8n-nodes-base.merge`) is present.
 *   2. It has ≥ 2 distinct `main` input branches.
 *   3. Each branch traced back to the trigger contains at least one action
 *      node (external-API surface).
 *   4. ≥ 2 of those branches have NO action node with onError set to
 *      `continueRegularOutput` or `continueErrorOutput`.
 *
 * Recovery path is concrete and uniform: set `onError:
 * 'continueRegularOutput'` on the action node(s) that can legitimately
 * fail. Adding this is harmless when the node never fails in practice
 * (output passes through unchanged) and is the only thing standing
 * between the workflow and merge-starvation when any branch fails.
 */
function checkMergeBranchesNoErrorTolerance(workflow: WorkflowJSON): ValidationWarning[] {
	const nodes = workflow.nodes ?? [];
	if (nodes.length === 0) return [];

	const predecessors = buildMainPredecessorMap(workflow);
	const nodesByName = new Map<string, { type: string; onError?: unknown }>();
	for (const n of nodes) {
		if (n.name && n.type) nodesByName.set(n.name, { type: n.type, onError: n.onError });
	}

	const issues: ValidationWarning[] = [];
	for (const mergeNode of nodes) {
		if (!mergeNode.name || mergeNode.type !== 'n8n-nodes-base.merge') continue;
		const mergeInputs = predecessors.get(mergeNode.name);
		if (!mergeInputs || mergeInputs.size < 2) continue;

		interface BranchSummary {
			input: string;
			actionNodes: Array<{ name: string; type: string; onErrorOk: boolean }>;
		}
		const branches: BranchSummary[] = [];
		for (const input of mergeInputs) {
			const actionNodes = collectActionAncestors(input, predecessors, nodesByName);
			if (actionNodes.length > 0) branches.push({ input, actionNodes });
		}

		const exposedBranches = branches.filter((b) => b.actionNodes.every((a) => !a.onErrorOk));
		if (branches.length < 2 || exposedBranches.length < 2) continue;

		const nameList = exposedBranches
			.map(
				(b) =>
					`branch ending at "${b.input}" with action node(s) ${b.actionNodes
						.map((a) => `${a.name} (${a.type})`)
						.join(', ')}`,
			)
			.join('; ');

		issues.push({
			code: 'MERGE_PARALLEL_BRANCHES_NO_ERROR_TOLERANCE',
			nodeName: mergeNode.name,
			parameterPath: 'onError',
			message:
				`Merge node "${mergeNode.name}" has ${branches.length} parallel input branches, but ${exposedBranches.length} of them contain external-API action nodes without any onError tolerance configured: ${nameList}. ` +
				"With n8n's default `onError: 'stopWorkflow'`, any single branch failure aborts the entire workflow before " +
				`"${mergeNode.name}" can run, so the parallel structure offers no resilience. ` +
				"Set `onError: 'continueRegularOutput'` (or `'continueErrorOutput'` if you want the failure routed onto a dedicated pin) on the action node(s) above that can legitimately fail. " +
				'This is harmless when the node succeeds (output passes through unchanged) and is required for the Merge to receive partial results when one branch errors.',
		});
	}
	return issues;
}

const GRAPH_CHECKS: Array<(workflow: WorkflowJSON) => ValidationWarning[]> = [
	checkPostNonTriggerTriggerJsonRefs,
	checkResourceMapperAutoMapAfterWebhook,
	checkMergeBranchesNoErrorTolerance,
];

/**
 * Run all semantic checks on a workflow. Returns one or more
 * `ValidationWarning`s that are treated as blocking errors by
 * `partitionWarnings`.
 */
export function checkSemanticIssues(workflow: WorkflowJSON): ValidationWarning[] {
	const issues: ValidationWarning[] = [];
	for (const node of workflow.nodes ?? []) {
		const nodeForCheck: NodeForCheck = {
			name: node.name,
			type: node.type,
			parameters: node.parameters,
		};
		for (const check of NODE_CHECKS) {
			const issue = check(nodeForCheck);
			if (issue) issues.push(issue);
		}
	}
	for (const check of GRAPH_CHECKS) {
		for (const issue of check(workflow)) {
			issues.push(issue);
		}
	}
	return issues;
}
