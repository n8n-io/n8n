/**
 * Deterministic Triggers-pane facts for the workflow overview (spike).
 *
 * Walks a workflow's nodes and derives human-readable trigger clauses from
 * node types and literal parameters — no LLM involved. Where a parameter is
 * an expression (or a type is unknown), the clause degrades to a generic but
 * never-wrong description and the fact is marked inexact.
 *
 * Scope note: trigger detection is heuristic (known core type ids + the
 * `*Trigger` type-name convention) because this package cannot depend on the
 * NodeTypes registry. A metadata-provider interface can replace the
 * heuristics later without changing callers.
 */
import { isRecord } from '@n8n/utils/is-record';

/** Minimal structural node shape — fits both instance-ai WorkflowNode and n8n INode. */
export interface TriggerSourceNode {
	name: string;
	type: string;
	typeVersion?: number;
	parameters?: Record<string, unknown>;
	disabled?: boolean;
}

export interface TriggerFact {
	nodeName: string;
	nodeType: string;
	/** Clause composable after "Runs …" or as "When …", e.g. "every Monday at 09:00". */
	clause: string;
	/** False when a parameter was dynamic/unreadable and the clause is a safe generalisation. */
	exact: boolean;
}

/** A described trigger before it is attached to its node. */
type DescribedTrigger = Omit<TriggerFact, 'nodeName' | 'nodeType'>;

/**
 * Node-type metadata the extractor cannot know on its own — implemented by the
 * host over its node registry and injected. Partial by design: a node type
 * that is not installed on the instance returns undefined, and the extractor
 * falls back to its name-based heuristics for that node.
 */
export interface TriggerNodeMetaProvider {
	getNodeMeta(
		type: string,
		typeVersion?: number,
	): { isTrigger: boolean; displayName: string } | undefined;
}

/*
 * English-only on purpose, like every string in this module. When clause
 * localization lands (ICU message templates), DAY_NAMES, formatTime and
 * joinList swap to their platform equivalents in the same change —
 * Intl.DateTimeFormat ({ weekday: 'long' } over a known-Sunday anchor date,
 * and { hour, minute }) and Intl.ListFormat — so days, times and joins
 * localize coherently rather than piecemeal. Swapping any of them alone
 * produces mixed-language clauses ("every Montag at 09:00").
 * Index order is cron day-of-week: 0 = Sunday (see Schedule GenericFunctions).
 */
const DAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
] as const;

/** Values that were configured as n8n expressions are unknowable statically. */
function isExpression(value: unknown): boolean {
	return typeof value === 'string' && value.trimStart().startsWith('=');
}

function asPositiveInt(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) && value > 0
		? Math.floor(value)
		: undefined;
}

/** 9 / 5 → "09:05". Only called when the hour was explicitly configured. */
function formatTime(hour: number, minute: number): string {
	const hh = String(Math.max(0, Math.min(23, hour))).padStart(2, '0');
	const mm = String(Math.max(0, Math.min(59, minute))).padStart(2, '0');
	return `${hh}:${mm}`;
}

/** "at HH:MM" when the hour is explicitly set; unset hours are runtime-jittered, so say nothing. */
function timeSuffix(interval: Record<string, unknown>): string {
	const hour = interval.triggerAtHour;
	if (typeof hour !== 'number') return '';
	const minute = typeof interval.triggerAtMinute === 'number' ? interval.triggerAtMinute : 0;
	return ` at ${formatTime(hour, minute)}`;
}

function joinList(items: string[], conjunction: 'and' | 'or'): string {
	if (items.length <= 1) return items[0] ?? '';
	if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
	return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
}

function pluralUnit(n: number, unit: string): string {
	return n === 1 ? `every ${unit}` : `every ${n} ${unit}s`;
}

/** One Schedule Trigger interval entry → clause fragment, or null when dynamic. */
function describeScheduleInterval(interval: Record<string, unknown>): string | null {
	// Expression anywhere in the entry → the schedule is not statically knowable.
	if (Object.values(interval).some(isExpression)) return null;

	const field = typeof interval.field === 'string' ? interval.field : 'days';
	switch (field) {
		case 'cronExpression': {
			const expression = interval.expression;
			return typeof expression === 'string' && expression.length > 0
				? `on a custom schedule (\`${expression}\`)`
				: 'on a custom schedule';
		}
		case 'seconds':
			return pluralUnit(asPositiveInt(interval.secondsInterval) ?? 1, 'second');
		case 'minutes':
			return pluralUnit(asPositiveInt(interval.minutesInterval) ?? 1, 'minute');
		case 'hours': {
			const n = asPositiveInt(interval.hoursInterval) ?? 1;
			const minute = interval.triggerAtMinute;
			const suffix = typeof minute === 'number' ? ` at :${String(minute).padStart(2, '0')}` : '';
			return `${pluralUnit(n, 'hour')}${suffix}`;
		}
		case 'days': {
			const n = asPositiveInt(interval.daysInterval) ?? 1;
			return `${pluralUnit(n, 'day')}${timeSuffix(interval)}`;
		}
		case 'weeks': {
			const n = asPositiveInt(interval.weeksInterval) ?? 1;
			// Runtime defaults an unset day list to Sunday (see Schedule GenericFunctions).
			const rawDays = Array.isArray(interval.triggerAtDay) ? interval.triggerAtDay : [0];
			const dayNames = rawDays
				.filter((d): d is number => typeof d === 'number')
				.map((d) => DAY_NAMES[((d % 7) + 7) % 7]);
			const days = joinList([...new Set(dayNames)], 'and');
			if (!days) return `${pluralUnit(n, 'week')}${timeSuffix(interval)}`;
			return n === 1
				? `every ${days}${timeSuffix(interval)}`
				: `every ${n} weeks on ${days}${timeSuffix(interval)}`;
		}
		case 'months': {
			const n = asPositiveInt(interval.monthsInterval) ?? 1;
			const day = asPositiveInt(interval.triggerAtDayOfMonth);
			// An unset day-of-month is runtime-jittered, so don't invent one.
			const base =
				day === undefined
					? pluralUnit(n, 'month')
					: n === 1
						? `on day ${day} of every month`
						: `every ${n} months on day ${day}`;
			return `${base}${timeSuffix(interval)}`;
		}
		default:
			return null;
	}
}

function describeScheduleTrigger(parameters: Record<string, unknown>): DescribedTrigger {
	// A genuinely blank node runs on the node's documented default: daily.
	if (Object.keys(parameters).length === 0) return { clause: 'every day', exact: true };

	const rule = isRecord(parameters.rule) ? parameters.rule : undefined;
	const rawIntervals = rule && Array.isArray(rule.interval) ? rule.interval : undefined;
	// Parameters exist but not in a shape we recognize (e.g. a future node
	// version): say something vague-but-true instead of inventing the default.
	if (!rawIntervals || rawIntervals.length === 0) {
		return { clause: 'on a schedule', exact: false };
	}

	const clauses: string[] = [];
	let exact = true;
	for (const entry of rawIntervals) {
		const described = isRecord(entry) ? describeScheduleInterval(entry) : null;
		if (described === null) exact = false;
		else clauses.push(described);
	}
	if (clauses.length === 0) return { clause: 'on a dynamic schedule', exact: false };
	return { clause: joinList([...new Set(clauses)], 'and'), exact };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function describeWebhook(parameters: Record<string, unknown>): DescribedTrigger {
	const rawMethod = parameters.httpMethod;
	const methods = Array.isArray(rawMethod)
		? rawMethod.filter((m): m is string => typeof m === 'string')
		: typeof rawMethod === 'string' && !isExpression(rawMethod)
			? [rawMethod]
			: ['GET'];
	const method = methods.map((m) => m.toUpperCase()).join('/');

	const path = parameters.path;
	// The default path is a generated UUID — meaningless to users, so omit it.
	const showPath =
		typeof path === 'string' && path.length > 0 && !isExpression(path) && !UUID_RE.test(path);
	return showPath
		? {
				clause: `when a ${method} request is received at /${String(path).replace(/^\//, '')}`,
				exact: true,
			}
		: { clause: `when a ${method} webhook request is received`, exact: true };
}

function describeFormTrigger(parameters: Record<string, unknown>): DescribedTrigger {
	const title = parameters.formTitle;
	if (typeof title === 'string' && title.length > 0 && !isExpression(title)) {
		return { clause: `when someone submits the "${title}" form`, exact: true };
	}
	return { clause: 'when someone submits the form', exact: !isExpression(title) };
}

function describeLegacyInterval(parameters: Record<string, unknown>): DescribedTrigger {
	const n = asPositiveInt(parameters.interval) ?? 1;
	const unit = typeof parameters.unit === 'string' ? parameters.unit : 'seconds';
	const singular = unit.endsWith('s') ? unit.slice(0, -1) : unit;
	return { clause: pluralUnit(n, singular), exact: true };
}

type Describer = (parameters: Record<string, unknown>) => DescribedTrigger;

/** Exact-type formatters. Anything else falls back to the `*Trigger` generic. */
const DESCRIBERS: Record<string, Describer> = {
	'n8n-nodes-base.scheduleTrigger': describeScheduleTrigger,
	'n8n-nodes-base.cron': () => ({ clause: 'on a schedule', exact: false }),
	'n8n-nodes-base.interval': describeLegacyInterval,
	'n8n-nodes-base.webhook': describeWebhook,
	'n8n-nodes-base.formTrigger': describeFormTrigger,
	'n8n-nodes-base.manualTrigger': () => ({ clause: 'manually on demand', exact: true }),
	'n8n-nodes-base.start': () => ({ clause: 'manually on demand', exact: true }),
	'n8n-nodes-base.executeWorkflowTrigger': () => ({
		clause: 'when another workflow calls it',
		exact: true,
	}),
	'n8n-nodes-base.errorTrigger': () => ({
		clause: 'when another workflow fails',
		exact: true,
	}),
	'n8n-nodes-base.emailReadImap': () => ({ clause: 'when a new email arrives', exact: true }),
	'@n8n/n8n-nodes-langchain.chatTrigger': () => ({
		clause: 'when a chat message is received',
		exact: true,
	}),
	'@n8n/n8n-nodes-langchain.mcpTrigger': () => ({
		clause: 'when an AI client calls it over MCP',
		exact: true,
	}),
};

/** `n8n-nodes-base.googleDriveTrigger` → "Google Drive". */
function serviceLabelFromType(type: string): string {
	const bare = (type.split('.').pop() ?? type).replace(/Trigger$/, '');
	const spaced = bare
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Prefer the registry's curated display name ("RSS Feed Trigger" → "RSS Feed")
 * over camelCase-splitting the type id — it gets acronyms and branding right.
 * Shared with result-facts (module-internal: not re-exported from the package).
 */
export function serviceLabel(type: string, displayName?: string): string {
	if (displayName) {
		const stripped = displayName.replace(/\s*Trigger$/i, '').trim();
		if (stripped.length > 0) return stripped;
	}
	return serviceLabelFromType(type);
}

/** "messageReceived" / "message_received" → "message received". */
function humanizeEventName(event: string): string {
	return event
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[_.-]+/g, ' ')
		.toLowerCase()
		.trim();
}

// Article-free templates on purpose: "when a ${service} …" breaks on
// vowel-initial names ("a Asana") and acronyms ("a RSS"), and correct a/an
// selection is sound-based, not letter-based.
function describeGenericTrigger(
	type: string,
	parameters: Record<string, unknown>,
	displayName?: string,
): DescribedTrigger {
	const service = serviceLabel(type, displayName);
	const rawEvents = Array.isArray(parameters.events)
		? parameters.events
		: parameters.event !== undefined
			? [parameters.event]
			: [];
	const events = rawEvents
		.filter((e): e is string => typeof e === 'string' && e.length > 0 && !isExpression(e))
		.map(humanizeEventName);
	if (events.length === 1) {
		return { clause: `on ${service} "${events[0]}" events`, exact: false };
	}
	if (events.length > 1) {
		return {
			clause: `on ${service} events (${events.join(', ')})`,
			exact: false,
		};
	}
	return { clause: `on ${service} events`, exact: false };
}

function isTriggerType(type: string): boolean {
	if (type in DESCRIBERS) return true;
	const bare = type.split('.').pop() ?? type;
	return /Trigger$/.test(bare);
}

/**
 * Derive one fact per enabled trigger node. Returns [] when the graph has no
 * recognizable triggers — callers should fall back to the LLM pane then.
 *
 * When a {@link TriggerNodeMetaProvider} is supplied, its registry verdict is
 * authoritative for detection (both directions) and its display names feed the
 * generic clause; nodes it doesn't know fall back to the name heuristics.
 */
export function extractTriggerFacts(
	nodes: TriggerSourceNode[],
	meta?: TriggerNodeMetaProvider,
): TriggerFact[] {
	const facts: TriggerFact[] = [];
	for (const node of nodes) {
		if (node.disabled === true) continue;
		const nodeMeta = meta?.getNodeMeta(node.type, node.typeVersion);
		const isTrigger = nodeMeta ? nodeMeta.isTrigger : isTriggerType(node.type);
		if (!isTrigger) continue;
		const parameters = isRecord(node.parameters) ? node.parameters : {};
		const describer = DESCRIBERS[node.type];
		const described = describer
			? describer(parameters)
			: describeGenericTrigger(node.type, parameters, nodeMeta?.displayName);
		facts.push({ nodeName: node.name, nodeType: node.type, ...described });
	}
	return facts;
}

/** Unique clauses in canvas order — what UIs render as a stacked any-of list. */
export function triggerPaneClauses(facts: TriggerFact[]): string[] {
	return [...new Set(facts.map((f) => f.clause))];
}

/**
 * Compose facts into the Triggers pane sentence, mirroring the LLM style:
 * "Runs every Monday at 09:00, or manually on demand." /
 * "When a POST request is received at /intake."
 * Returns null when there is nothing to say (caller falls back to the LLM).
 */
export function formatTriggersPane(facts: TriggerFact[]): string | null {
	const clauses = triggerPaneClauses(facts);
	if (clauses.length === 0) return null;
	// Always ", or " before the last clause — matches the pane's exemplar style.
	const joined =
		clauses.length === 1
			? clauses[0]
			: `${clauses.slice(0, -1).join(', ')}, or ${clauses[clauses.length - 1]}`;
	const sentence = joined.startsWith('when ')
		? `When ${joined.slice('when '.length)}`
		: `Runs ${joined}`;
	return `${sentence}.`;
}
