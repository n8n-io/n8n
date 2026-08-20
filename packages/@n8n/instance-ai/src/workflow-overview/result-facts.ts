/**
 * Deterministic Results-pane facts for the workflow overview (spike).
 *
 * Classifies every enabled node as a side-effect ("write"), a read, or a pure
 * transform, and derives human-readable result clauses from writes — no LLM
 * involved. Unlike triggers there is no safe naming convention separating
 * writes from reads, so extraction is guarded by a completeness gate: the
 * deterministic pane is only usable when EVERY node was classified. Nodes the
 * extractor cannot classify are reported so callers can fall back to LLM
 * generation grounded with the partial facts (see formatResultFactsContext).
 *
 * Classification layers, in order:
 *  1. triggers and pure transforms — no result fact;
 *  2. curated describers for top nodes — destination-rich clauses read from
 *     literal parameters ("sends a message to #support");
 *  3. registry `action` metadata via {@link ResultNodeMetaProvider} — the
 *     operation's author-written action phrase ("Send a message") classified
 *     by its leading verb and rephrased ("sends a message via Slack").
 *
 * English-only on purpose — same localization plan as trigger-facts.
 */
import { isRecord } from '@n8n/utils/is-record';

import { serviceLabel, type TriggerNodeMetaProvider } from './trigger-facts';

/** Minimal structural node shape — fits both instance-ai WorkflowNode and n8n INode. */
export interface ResultSourceNode {
	name: string;
	type: string;
	typeVersion?: number;
	parameters?: Record<string, unknown>;
	disabled?: boolean;
}

export interface ResultFact {
	nodeName: string;
	nodeType: string;
	/** Verb-led present-tense clause, e.g. "sends a message to #support". */
	clause: string;
	/** False when a parameter was dynamic/unreadable and the clause is a safe generalisation. */
	exact: boolean;
}

/**
 * Registry-backed metadata for result extraction. Extends the trigger provider
 * (authoritative trigger detection + display names) with per-operation action
 * phrases — the `action` strings node authors maintain for the nodes panel.
 */
export interface ResultNodeMetaProvider extends TriggerNodeMetaProvider {
	/**
	 * The action phrase for a node operation, e.g. "Send a message". Pass the
	 * node's literal `resource`/`operation` parameter values when present;
	 * undefined means "the description's default". Returns undefined when the
	 * type is unknown or the operation has no action metadata.
	 */
	getActionPhrase(
		type: string,
		typeVersion?: number,
		resource?: string,
		operation?: string,
	): string | undefined;
}

export interface ResultExtraction {
	facts: ResultFact[];
	/** Nodes the extractor could not classify — non-empty trips the completeness gate. */
	unclassified: Array<{ nodeName: string; nodeType: string }>;
}

/**
 * A described result before it is attached to its node. Clauses are BASE-form
 * verb phrases ("send a message to #support") — conjugated ("sends …") or
 * softened ("may send …" for agent-decided tools) only when the fact is built.
 */
type DescribedResult = Omit<ResultFact, 'nodeName' | 'nodeType'>;

/**
 * Per-node classification outcome: a result fact, "classified but produces
 * nothing user-visible" (reads, transforms), defer to the next layer, or
 * unclassifiable (trips the gate).
 */
type EffectOutcome =
	| { kind: 'fact'; described: DescribedResult; conditional?: boolean }
	| { kind: 'no-effect' }
	| { kind: 'defer' }
	| { kind: 'unknown' };

const fact = (clause: string, exact: boolean): EffectOutcome => ({
	kind: 'fact',
	described: { clause, exact },
});
const NO_EFFECT: EffectOutcome = { kind: 'no-effect' };
const DEFER: EffectOutcome = { kind: 'defer' };
const UNKNOWN: EffectOutcome = { kind: 'unknown' };

/** Values that were configured as n8n expressions are unknowable statically. */
function isExpression(value: unknown): boolean {
	return typeof value === 'string' && value.trimStart().startsWith('=');
}

/** Literal string param, or undefined when absent/expression/non-string. */
function literal(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 && !isExpression(value) ? value : undefined;
}

/** Human label out of a resource-locator value: cachedResultName, else a by-name literal. */
function rlcLabel(value: unknown): { label?: string; dynamic: boolean } {
	if (typeof value === 'string') {
		return isExpression(value) ? { dynamic: true } : { label: literal(value), dynamic: false };
	}
	if (!isRecord(value)) return { dynamic: false };
	const cached = value.cachedResultName;
	if (typeof cached === 'string' && cached.length > 0) return { label: cached, dynamic: false };
	if (isExpression(value.value)) return { dynamic: true };
	if (value.mode === 'name' || value.mode === 'url')
		return { label: literal(value.value), dynamic: false };
	return { dynamic: false };
}

/*
 * Node types with no external side effects: data shaping, flow control, and
 * in-workflow AI steps (model calls produce data, not outcomes — their writes
 * surface through tool nodes). Conservative by design: anything uncertain is
 * left out and falls through to the registry layer or the completeness gate.
 */
const PURE_TRANSFORM_TYPES = new Set<string>([
	'n8n-nodes-base.set',
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.merge',
	'n8n-nodes-base.filter',
	'n8n-nodes-base.noOp',
	'n8n-nodes-base.splitInBatches',
	'n8n-nodes-base.splitOut',
	'n8n-nodes-base.aggregate',
	'n8n-nodes-base.summarize',
	'n8n-nodes-base.sort',
	'n8n-nodes-base.limit',
	'n8n-nodes-base.removeDuplicates',
	'n8n-nodes-base.dateTime',
	'n8n-nodes-base.renameKeys',
	'n8n-nodes-base.itemLists',
	'n8n-nodes-base.markdown',
	'n8n-nodes-base.html',
	'n8n-nodes-base.xml',
	'n8n-nodes-base.crypto',
	'n8n-nodes-base.extractFromFile',
	'n8n-nodes-base.convertToFile',
	'n8n-nodes-base.compression',
	'n8n-nodes-base.editImage',
	'n8n-nodes-base.spreadsheetFile',
	'n8n-nodes-base.wait',
	'n8n-nodes-base.stopAndError',
	'n8n-nodes-base.stickyNote',
	'n8n-nodes-base.debugHelper',
	'n8n-nodes-base.executionData',
	'n8n-nodes-base.compareDatasets',
	'n8n-nodes-base.form',
	'n8n-nodes-base.aiTransform',
	'@n8n/n8n-nodes-langchain.agent',
	'@n8n/n8n-nodes-langchain.chainLlm',
	'@n8n/n8n-nodes-langchain.chainSummarization',
	'@n8n/n8n-nodes-langchain.chainRetrievalQa',
	'@n8n/n8n-nodes-langchain.informationExtractor',
	'@n8n/n8n-nodes-langchain.textClassifier',
	'@n8n/n8n-nodes-langchain.sentimentAnalysis',
	'@n8n/n8n-nodes-langchain.openAi',
	'@n8n/n8n-nodes-langchain.code',
	'@n8n/n8n-nodes-langchain.toolCalculator',
	'@n8n/n8n-nodes-langchain.toolThink',
	'@n8n/n8n-nodes-langchain.toolCode',
	'@n8n/n8n-nodes-langchain.toolWikipedia',
	'@n8n/n8n-nodes-langchain.toolSerpApi',
	'@n8n/n8n-nodes-langchain.toolSearXng',
	'@n8n/n8n-nodes-langchain.toolWolframAlpha',
]);

/** AI sub-node machinery (models, memory, parsers, …) — attached, never side-effecting. */
const LANGCHAIN_MACHINERY_RE =
	/^(lm[A-Z]|memory[A-Z]|outputParser|embeddings|retriever|textSplitter|document)/;

function isLangchainMachinery(type: string): boolean {
	if (!type.startsWith('@n8n/n8n-nodes-langchain.')) return false;
	const bare = type.split('.').pop() ?? type;
	return LANGCHAIN_MACHINERY_RE.test(bare);
}

/*
 * Leading-verb classification for registry action phrases ("Send a message" →
 * write, "Get a message" → read). A verb in neither set leaves the node
 * unclassified — the gate then routes the pane to the LLM, so an incomplete
 * list degrades safely. In-workflow data production (generate, translate,
 * summarize…) counts as read: it only becomes user-visible through a write.
 */
const WRITE_VERBS = new Set<string>([
	'send',
	'create',
	'append',
	'add',
	'update',
	'upsert',
	'post',
	'upload',
	'insert',
	'write',
	'delete',
	'remove',
	'move',
	'copy',
	'rename',
	'set',
	'mark',
	'reply',
	'forward',
	'invite',
	'schedule',
	'publish',
	'share',
	'assign',
	'unassign',
	'complete',
	'close',
	'reopen',
	'archive',
	'unarchive',
	'star',
	'unstar',
	'label',
	'submit',
	'push',
	'merge',
	'sync',
	'import',
	'export',
	'book',
	'register',
	'ban',
	'kick',
	'pin',
	'unpin',
	'react',
	'tag',
	'notify',
	'log',
	'record',
	'save',
	'store',
	'cancel',
	'execute',
	'run',
	'start',
	'stop',
	'pause',
	'resume',
	'restart',
	'trigger',
	'make',
	'call',
	'play',
	'restore',
	'clear',
]);

const READ_VERBS = new Set<string>([
	'get',
	'search',
	'list',
	'read',
	'download',
	'retrieve',
	'fetch',
	'find',
	'lookup',
	'count',
	'check',
	'query',
	'watch',
	'wait',
	'extract',
	'parse',
	'analyze',
	'classify',
	'summarize',
	'translate',
	'transcribe',
	'generate',
	'describe',
	'compare',
	'verify',
	'validate',
	'test',
	'calculate',
	'chat',
	'message',
	'embed',
	'rank',
	'score',
	'detect',
]);

/** "send" → "sends", "push" → "pushes", "reply" → "replies". */
function thirdPerson(verb: string): string {
	if (/(s|sh|ch|x|z|o)$/.test(verb)) return `${verb}es`;
	if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ies`;
	return `${verb}s`;
}

/**
 * Conjugate a base-form clause: "send a message to #support" → "sends a
 * message to #support". Compound verbs joined by and/or conjugate too when
 * the joined word is a known verb: "add or update rows" → "adds or updates
 * rows", but "delete rows or columns" keeps "columns" untouched.
 */
function thirdPersonClause(clause: string): string {
	const words = clause.split(' ');
	return words
		.map((word, index) => {
			if (index === 0) return thirdPerson(word.toLowerCase());
			const previous = words[index - 1];
			if (previous !== 'or' && previous !== 'and') return word;
			const lower = word.toLowerCase();
			return WRITE_VERBS.has(lower) || READ_VERBS.has(lower) ? thirdPerson(lower) : word;
		})
		.join(' ');
}

/** "Send a message" + "Slack" → base-form "send a message via Slack". */
function clauseFromActionPhrase(phrase: string, service: string): string {
	const base = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
	// Skip "via X" when the phrase already names the service ("Create sheet" is
	// generic enough that "via Google Sheets" still helps, so plain substring).
	return base.includes(service.toLowerCase()) ? base : `${base} via ${service}`;
}

// --- curated describers -----------------------------------------------------

/*
 * Defaults mirrored from node descriptions (saved params omit values equal to
 * the default): Slack resource=message/operation=post, Gmail
 * resource=message/operation=send, Sheets resource=sheet/operation=read.
 * Same params-schema coupling caveat as trigger-facts — contract tests against
 * nodes-base shapes are a roadmap item.
 */

function describeSlack(params: Record<string, unknown>): EffectOutcome {
	if (isExpression(params.resource) || isExpression(params.operation)) return UNKNOWN;
	const resource = literal(params.resource) ?? 'message';
	const operation = literal(params.operation) ?? 'post';
	if (resource !== 'message' || operation !== 'post') return DEFER;
	if (literal(params.select) === 'user') return fact('send a direct message on Slack', true);
	const channel = rlcLabel(params.channelId);
	if (channel.label) return fact(`send a message to #${channel.label.replace(/^#/, '')}`, true);
	return fact('send a message on Slack', !channel.dynamic);
}

function describeGmail(params: Record<string, unknown>): EffectOutcome {
	if (isExpression(params.resource) || isExpression(params.operation)) return UNKNOWN;
	const resource = literal(params.resource) ?? 'message';
	const operation = literal(params.operation) ?? 'send';
	if (resource === 'draft' && operation === 'create') return fact('create an email draft', true);
	if (resource !== 'message' || operation !== 'send') return DEFER;
	const to = literal(params.sendTo);
	if (to) return fact(`send an email to ${to}`, true);
	return fact('send an email', !isExpression(params.sendTo));
}

function describeEmailSend(params: Record<string, unknown>): EffectOutcome {
	const to = literal(params.toEmail);
	if (to) return fact(`send an email to ${to}`, true);
	return fact('send an email', !isExpression(params.toEmail));
}

/** "the 'Leads' sheet" from the sheet tab RLC, else the spreadsheet RLC, else generic. */
function sheetsTarget(params: Record<string, unknown>): { label: string; exact: boolean } {
	const sheet = rlcLabel(params.sheetName);
	if (sheet.label) return { label: `the '${sheet.label}' sheet`, exact: true };
	const doc = rlcLabel(params.documentId);
	if (doc.label) return { label: `the '${doc.label}' spreadsheet`, exact: true };
	return { label: 'a Google Sheet', exact: !sheet.dynamic && !doc.dynamic };
}

function describeGoogleSheets(params: Record<string, unknown>): EffectOutcome {
	if (isExpression(params.resource) || isExpression(params.operation)) return UNKNOWN;
	const resource = literal(params.resource) ?? 'sheet';
	const operation = literal(params.operation) ?? 'read';
	if (resource !== 'sheet') return DEFER;
	const target = sheetsTarget(params);
	switch (operation) {
		case 'append':
			return fact(`add a row to ${target.label}`, target.exact);
		case 'appendOrUpdate':
			return fact(`add or update rows in ${target.label}`, target.exact);
		case 'update':
			return fact(`update rows in ${target.label}`, target.exact);
		case 'clear':
			return fact(`clear ${target.label}`, target.exact);
		case 'delete':
			return fact(`delete rows or columns in ${target.label}`, target.exact);
		default:
			return DEFER; // read/create/… — registry action phrase classifies them.
	}
}

const HTTP_WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const HTTP_READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

function describeHttpRequest(params: Record<string, unknown>): EffectOutcome {
	if (isExpression(params.method)) return UNKNOWN;
	const method = (literal(params.method) ?? 'GET').toUpperCase();
	if (HTTP_READ_METHODS.has(method)) return NO_EFFECT;
	if (!HTTP_WRITE_METHODS.has(method)) return UNKNOWN;
	const url = literal(params.url);
	if (url) {
		try {
			return fact(`send a ${method} request to ${new URL(url).host}`, true);
		} catch {
			return fact(`send a ${method} request to an external service`, false);
		}
	}
	return fact(`send a ${method} request to an external service`, false);
}

function describeExecuteWorkflow(params: Record<string, unknown>): EffectOutcome {
	const target = rlcLabel(params.workflowId);
	if (target.label) return fact(`run the '${target.label}' workflow`, true);
	return fact('run another workflow', !target.dynamic);
}

function describeReadWriteFile(params: Record<string, unknown>): EffectOutcome {
	if (isExpression(params.operation)) return UNKNOWN;
	const operation = literal(params.operation) ?? 'read';
	if (operation !== 'write') return NO_EFFECT;
	const path = literal(params.fileName);
	return path ? fact(`save a file to ${path}`, true) : fact('save a file to disk', false);
}

type ResultDescriber = (parameters: Record<string, unknown>) => EffectOutcome;

/** Destination-rich formatters for top nodes. DEFER falls to the registry layer. */
const RESULT_DESCRIBERS: Record<string, ResultDescriber> = {
	'n8n-nodes-base.slack': describeSlack,
	'n8n-nodes-base.gmail': describeGmail,
	'n8n-nodes-base.emailSend': describeEmailSend,
	'n8n-nodes-base.googleSheets': describeGoogleSheets,
	'n8n-nodes-base.httpRequest': describeHttpRequest,
	'n8n-nodes-base.executeWorkflow': describeExecuteWorkflow,
	'n8n-nodes-base.readWriteFile': describeReadWriteFile,
	'n8n-nodes-base.respondToWebhook': () => fact('return a response to the caller', true),
	'@n8n/n8n-nodes-langchain.toolWorkflow': describeExecuteWorkflow,
	'@n8n/n8n-nodes-langchain.toolHttpRequest': describeHttpRequest,
};

// --- classification pipeline ------------------------------------------------

/** Mirrors trigger-facts' fallback: `*Trigger` naming convention. */
function looksLikeTrigger(type: string): boolean {
	const bare = type.split('.').pop() ?? type;
	return /Trigger$/.test(bare);
}

const NON_SUFFIX_TRIGGER_TYPES = new Set<string>([
	'n8n-nodes-base.cron',
	'n8n-nodes-base.interval',
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.start',
	'n8n-nodes-base.emailReadImap',
]);

/** Agent-attached tool variant of a regular node ("n8n-nodes-base.slackTool"). */
function toolBaseType(type: string): string | undefined {
	if (type.startsWith('@n8n/n8n-nodes-langchain.')) return undefined; // native tools are curated/pure
	const bare = type.split('.').pop() ?? type;
	if (!bare.endsWith('Tool') || bare === 'Tool') return undefined;
	return type.slice(0, -'Tool'.length);
}

function classifyEffect(
	type: string,
	typeVersion: number | undefined,
	parameters: Record<string, unknown>,
	meta: ResultNodeMetaProvider | undefined,
): EffectOutcome {
	if (PURE_TRANSFORM_TYPES.has(type) || isLangchainMachinery(type)) return NO_EFFECT;

	// Agent tools: classify the underlying node, then soften — the agent
	// decides at runtime whether the effect happens.
	const baseType = toolBaseType(type);
	if (baseType) {
		const base = classifyEffect(baseType, typeVersion, parameters, meta);
		if (base.kind !== 'fact') return base;
		return {
			kind: 'fact',
			described: { clause: base.described.clause, exact: false },
			conditional: true,
		};
	}

	const curated = RESULT_DESCRIBERS[type];
	if (curated) {
		const outcome = curated(parameters);
		if (outcome.kind !== 'defer') return outcome;
	}

	if (isExpression(parameters.resource) || isExpression(parameters.operation)) return UNKNOWN;
	const phrase = meta?.getActionPhrase(
		type,
		typeVersion,
		literal(parameters.resource),
		literal(parameters.operation),
	);
	if (!phrase) return UNKNOWN;
	const verb = (phrase.trim().split(/\s+/)[0] ?? '').toLowerCase();
	if (READ_VERBS.has(verb)) return NO_EFFECT;
	if (!WRITE_VERBS.has(verb)) return UNKNOWN;
	const service = serviceLabel(type, meta?.getNodeMeta(type, typeVersion)?.displayName);
	return fact(clauseFromActionPhrase(phrase, service), true);
}

/**
 * Classify every enabled node and derive one fact per side-effecting node.
 * `unclassified` non-empty means the completeness gate tripped: the
 * deterministic pane must not be used (see {@link formatResultsPane}), and the
 * facts are only good as LLM grounding context.
 *
 * When a {@link ResultNodeMetaProvider} is supplied its registry verdict is
 * authoritative for trigger detection and action phrases; without one, only
 * curated describers and heuristics classify — everything else trips the gate.
 */
export function extractResultFacts(
	nodes: ResultSourceNode[],
	meta?: ResultNodeMetaProvider,
): ResultExtraction {
	const facts: ResultFact[] = [];
	const unclassified: ResultExtraction['unclassified'] = [];
	let hasSubworkflowTrigger = false;

	for (const node of nodes) {
		if (node.disabled === true) continue;
		if (node.type === 'n8n-nodes-base.executeWorkflowTrigger') hasSubworkflowTrigger = true;

		const nodeMeta = meta?.getNodeMeta(node.type, node.typeVersion);
		const isTrigger = nodeMeta
			? nodeMeta.isTrigger
			: looksLikeTrigger(node.type) || NON_SUFFIX_TRIGGER_TYPES.has(node.type);
		if (isTrigger) continue;

		const parameters = isRecord(node.parameters) ? node.parameters : {};
		const outcome = classifyEffect(node.type, node.typeVersion, parameters, meta);
		if (outcome.kind === 'fact') {
			// Base-form clauses finalize here: conjugated for unconditional
			// effects, "may …" for agent-decided ones.
			const clause = outcome.conditional
				? `may ${outcome.described.clause}`
				: thirdPersonClause(outcome.described.clause);
			facts.push({
				nodeName: node.name,
				nodeType: node.type,
				clause,
				exact: outcome.described.exact,
			});
		} else if (outcome.kind !== 'no-effect') {
			unclassified.push({ nodeName: node.name, nodeType: node.type });
		}
	}

	// A sub-workflow with no writes of its own still produces something: its
	// output goes back to the caller. Only stated when fully classified.
	if (facts.length === 0 && unclassified.length === 0 && hasSubworkflowTrigger) {
		facts.push({
			nodeName: '',
			nodeType: 'n8n-nodes-base.executeWorkflowTrigger',
			clause: 'returns its output to the workflow that called it',
			exact: true,
		});
	}

	return { facts, unclassified };
}

/** Unique clauses in canvas order — what UIs render as a stacked all-of list. */
export function resultPaneClauses(extraction: ResultExtraction): string[] {
	return [...new Set(extraction.facts.map((f) => f.clause))];
}

/**
 * Compose facts into the Results pane sentence: "Sends a message to #support,
 * and adds a row to the 'Leads' sheet." Returns:
 *  - null when the completeness gate tripped (caller falls back to the LLM,
 *    grounding it with {@link formatResultFactsContext});
 *  - "" when every node is classified and none writes — the pane is KNOWN to
 *    be empty (pure-transform workflows), which the LLM would instead fill
 *    with an invented outcome.
 */
export function formatResultsPane(extraction: ResultExtraction): string | null {
	if (extraction.unclassified.length > 0) return null;
	const clauses = resultPaneClauses(extraction);
	if (clauses.length === 0) return '';
	const joined =
		clauses.length === 1
			? clauses[0]
			: `${clauses.slice(0, -1).join(', ')}, and ${clauses[clauses.length - 1]}`;
	return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}

/**
 * Partial facts as LLM grounding for when the gate tripped: confirmed writes
 * the model must not contradict, plus the nodes it still has to reason about.
 * Returns null when no fact was extracted — plain generation is no worse then.
 */
export function formatResultFactsContext(extraction: ResultExtraction): string | null {
	if (extraction.facts.length === 0) return null;
	const lines = [
		'Outputs confirmed from the workflow structure (authoritative — never contradict, rephrase freely):',
		...extraction.facts.map((f) => `- ${f.clause}${f.nodeName ? ` (node: "${f.nodeName}")` : ''}`),
	];
	if (extraction.unclassified.length > 0) {
		lines.push(
			'Nodes whose effects could not be derived (describe only what other evidence supports):',
			...extraction.unclassified.map((n) => `- "${n.nodeName}" (${n.nodeType})`),
		);
	}
	return lines.join('\n');
}
