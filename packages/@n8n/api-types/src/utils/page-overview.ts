import { splitIntoBlocks, toPlainText } from './page-tour';

/** How a workflow starts. The order is the priority when a workflow has several triggers. */
export const WORKFLOW_TRIGGER_CATEGORIES = [
	'schedule',
	'webhook',
	'form',
	'chat',
	'appEvent',
	'subWorkflow',
	'manual',
] as const;

export type WorkflowTriggerCategory = (typeof WORKFLOW_TRIGGER_CATEGORIES)[number];

/** The trigger node types with a fixed category, by their name without the package. */
const CATEGORY_BY_TRIGGER_NAME: Record<string, WorkflowTriggerCategory> = {
	scheduleTrigger: 'schedule',
	cron: 'schedule',
	interval: 'schedule',
	webhook: 'webhook',
	formTrigger: 'form',
	chatTrigger: 'chat',
	manualChatTrigger: 'chat',
	executeWorkflowTrigger: 'subWorkflow',
	manualTrigger: 'manual',
};

const TRIGGER_NAME_SUFFIX = 'Trigger';

const NO_TRIGGER_CATEGORY: WorkflowTriggerCategory = 'manual';

/** Removes the package from a node type name: `n8n-nodes-base.slackTrigger` gives `slackTrigger`. */
function toShortNodeTypeName(nodeType: string): string {
	return nodeType.slice(nodeType.lastIndexOf('.') + 1);
}

function toAppEventCategory(shortName: string): WorkflowTriggerCategory | undefined {
	return shortName.endsWith(TRIGGER_NAME_SUFFIX) ? 'appEvent' : undefined;
}

/** Gives the category of a trigger node type. Returns `undefined` for a node type that starts no workflow. */
function toCategoryOfNodeType(nodeType: string): WorkflowTriggerCategory | undefined {
	const shortName = toShortNodeTypeName(nodeType);
	return Object.hasOwn(CATEGORY_BY_TRIGGER_NAME, shortName)
		? CATEGORY_BY_TRIGGER_NAME[shortName]
		: toAppEventCategory(shortName);
}

/** Tells if a node type starts a workflow. The test is on the name of the node type only. */
export function isTriggerNodeType(nodeType: string): boolean {
	return toCategoryOfNodeType(nodeType) !== undefined;
}

/**
 * Gives how a workflow starts, from the type names of its nodes.
 * A workflow with several triggers takes the first of its categories in `WORKFLOW_TRIGGER_CATEGORIES`.
 * A workflow with no trigger is `manual`.
 */
export function toTriggerCategory(nodeTypes: string[]): WorkflowTriggerCategory {
	const categories = new Set(nodeTypes.map(toCategoryOfNodeType));
	return (
		WORKFLOW_TRIGGER_CATEGORIES.find((category) => categories.has(category)) ?? NO_TRIGGER_CATEGORY
	);
}

const HEADING_OR_TABLE_ROW = /^\s*(?:#{1,6}\s|\|)/;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const ELLIPSIS = '…';
const TRAILING_PUNCTUATION = /[\s.,;:!?-]+$/;

function assertPositiveInteger(maxLength: number): void {
	if (!Number.isInteger(maxLength) || maxLength <= 0) {
		throw new RangeError('The maximum length of an excerpt must be a positive integer');
	}
}

/** Keeps the start of the text up to the last complete word. A text of one long word is cut inside the word. */
function cutAtWordBoundary(text: string, length: number): string {
	const start = text.slice(0, length);
	const isWordComplete = /\s/.test(text.charAt(length));
	const lastSpace = start.lastIndexOf(' ');
	return isWordComplete || lastSpace <= 0 ? start : start.slice(0, lastSpace);
}

/** Shortens the text to at most `maxLength` characters. A shortened text ends with an ellipsis. */
function truncate(text: string, maxLength: number): string {
	return text.length <= maxLength
		? text
		: `${cutAtWordBoundary(text, maxLength - ELLIPSIS.length).replace(TRAILING_PUNCTUATION, '')}${ELLIPSIS}`;
}

/**
 * Gives the plain text of the first paragraph of a markdown text, at most `maxLength` characters long.
 * Headings, table rows, code blocks and blocks without a letter or a digit do not count as a paragraph.
 * A link reads as its label. A longer paragraph is cut at a word boundary and ends with an ellipsis.
 * Returns an empty text when the markdown has no paragraph.
 * @throws {RangeError} when `maxLength` is not a positive integer
 */
export function toPageExcerpt(markdown: string, maxLength: number): string {
	assertPositiveInteger(maxLength);
	const paragraph = splitIntoBlocks(markdown)
		.filter((block) => !HEADING_OR_TABLE_ROW.test(block))
		.map((block) => toPlainText(block, () => undefined))
		.find((text) => LETTER_OR_DIGIT.test(text));
	return truncate(paragraph ?? '', maxLength);
}

/** The key fact of the trigger of a workflow. Each kind carries the values that its node holds. */
export type PageOverviewTrigger =
	| { kind: 'webhook'; method: string; path: string }
	| {
			kind: 'schedule';
			/** The unit of the rule: `minutes`, `hours`, `days`, `weeks` or `cronExpression`. */
			field: string;
			triggerAtHour?: number;
			triggerAtMinute?: number;
			/** The days of the week, where 0 is Sunday. */
			triggerAtDay?: number[];
			minutesInterval?: number;
			hoursInterval?: number;
			/** The cron expression of a `cronExpression` rule. */
			expression?: string;
	  }
	| { kind: 'form'; title: string }
	| { kind: 'appEvent'; events: string[] };

/** A node as a workflow stores it. The parameters can have any shape. */
export type TriggerNodeInput = { type: string; parameters?: unknown };

/** The most events that the fact of an app trigger gives. */
const TRIGGER_EVENTS_LIMIT = 3;

const SCHEDULE_TRIGGER_NAME = 'scheduleTrigger';
const DEFAULT_WEBHOOK_METHOD = 'GET';
const DEFAULT_SCHEDULE_FIELD = 'days';
const EXPRESSION_PREFIX = '=';

/** The units whose rule can skip periods, each with the parameter that holds the number of periods. */
const PERIOD_INTERVAL_PARAMETERS: Record<string, string> = {
	days: 'daysInterval',
	weeks: 'weeksInterval',
};

/** The rule units that the fact can describe. */
const SCHEDULE_FIELDS = new Set(['minutes', 'hours', 'days', 'weeks', 'cronExpression']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A fixed text is a text that is not empty and not an expression. */
function isFixedText(value: unknown): value is string {
	return typeof value === 'string' && value.trim() !== '' && !value.startsWith(EXPRESSION_PREFIX);
}

function isWholeNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Lists the fixed texts of a value that is one text or a list of texts. */
function toFixedTexts(value: unknown): string[] {
	return (Array.isArray(value) ? value : [value]).filter(isFixedText);
}

/** Keeps the entry when the value passes the guard. */
function pick<Key extends string, Value>(
	key: Key,
	value: unknown,
	isValid: (candidate: unknown) => candidate is Value,
): Partial<Record<Key, Value>> {
	const entry: Partial<Record<Key, Value>> = {};
	return isValid(value) ? { ...entry, [key]: value } : entry;
}

function isWholeNumberList(value: unknown): value is number[] {
	return Array.isArray(value) && value.length > 0 && value.every(isWholeNumber);
}

/** No stored method means the default method of the webhook node. Several methods give one text. */
function toWebhookMethod(value: unknown): string | undefined {
	return value === undefined ? DEFAULT_WEBHOOK_METHOD : toFixedTexts(value).join(', ') || undefined;
}

function toWebhookFact(parameters: Record<string, unknown>): PageOverviewTrigger | undefined {
	const method = toWebhookMethod(parameters.httpMethod);
	const { path } = parameters;
	return method !== undefined && isFixedText(path) ? { kind: 'webhook', method, path } : undefined;
}

/** A rule that runs in each period has no period count, or a count of 1. */
function runsEachPeriod(rule: Record<string, unknown>, field: string): boolean {
	const count = rule[PERIOD_INTERVAL_PARAMETERS[field] ?? ''];
	return count === undefined || count === 1;
}

/** Reads the first rule of a schedule trigger. No stored unit means the default unit, days. */
function toScheduleFact(parameters: Record<string, unknown>): PageOverviewTrigger | undefined {
	const intervals = isRecord(parameters.rule) ? parameters.rule.interval : undefined;
	const rule: unknown = Array.isArray(intervals) ? intervals[0] : undefined;
	const field = isRecord(rule) ? (rule.field ?? DEFAULT_SCHEDULE_FIELD) : undefined;
	const isReadable =
		isRecord(rule) &&
		isFixedText(field) &&
		SCHEDULE_FIELDS.has(field) &&
		runsEachPeriod(rule, field);
	return isReadable
		? {
				kind: 'schedule',
				field,
				...pick('triggerAtHour', rule.triggerAtHour, isWholeNumber),
				...pick('triggerAtMinute', rule.triggerAtMinute, isWholeNumber),
				...pick('triggerAtDay', rule.triggerAtDay, isWholeNumberList),
				...pick('minutesInterval', rule.minutesInterval, isWholeNumber),
				...pick('hoursInterval', rule.hoursInterval, isWholeNumber),
				...pick('expression', rule.expression, isFixedText),
			}
		: undefined;
}

function toFormFact(parameters: Record<string, unknown>): PageOverviewTrigger | undefined {
	const title = parameters.formTitle;
	return isFixedText(title) ? { kind: 'form', title } : undefined;
}

function toAppEventFact(parameters: Record<string, unknown>): PageOverviewTrigger | undefined {
	const events = toFixedTexts(parameters.events ?? parameters.event).slice(0, TRIGGER_EVENTS_LIMIT);
	return events.length > 0 ? { kind: 'appEvent', events } : undefined;
}

/** Reads the fact of one trigger node. Only the `scheduleTrigger` node has a schedule that can be read. */
function toFactOfNode(
	node: TriggerNodeInput,
	category: WorkflowTriggerCategory,
): PageOverviewTrigger | undefined {
	const parameters = isRecord(node.parameters) ? node.parameters : {};
	switch (category) {
		case 'webhook':
			return toWebhookFact(parameters);
		case 'schedule':
			return toShortNodeTypeName(node.type) === SCHEDULE_TRIGGER_NAME
				? toScheduleFact(parameters)
				: undefined;
		case 'form':
			return toFormFact(parameters);
		case 'appEvent':
			return toAppEventFact(parameters);
		default:
			return undefined;
	}
}

/**
 * Reads the key fact of the trigger of a workflow from its nodes.
 * The trigger is the first node of the category that `toTriggerCategory` gives.
 * A value that is an expression, or that has an unknown shape, is left out.
 * Returns `undefined` when the category has no fact or when the parameters give none.
 */
export function toWorkflowTrigger(nodes: TriggerNodeInput[]): PageOverviewTrigger | undefined {
	const category = toTriggerCategory(nodes.map((node) => node.type));
	const trigger = nodes.find((node) => toCategoryOfNodeType(node.type) === category);
	return trigger === undefined ? undefined : toFactOfNode(trigger, category);
}
