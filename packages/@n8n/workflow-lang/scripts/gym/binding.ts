/**
 * Binds the fixed ids of a sample workflow (channels, users, records) to ids
 * of the tenant's world. Many sample workflows are node tests with made-up
 * ids such as `C08514ZPKB8`; the gym gives each tenant random ids, listed in
 * the ref map of the tenant (`refs`: logical name to native id).
 *
 * A rule names a service, the parameter names it applies to (the last key of
 * the path, or the key of a resource locator) and the ref prefixes whose ids
 * fit. Each distinct literal gets the next unused ref of the rule, in the
 * order of the sorted ref names, so two different ids in a workflow stay
 * different. Expressions are left as they are. A resource locator in `url`
 * mode becomes `id` mode.
 */
import { shortType } from './eligibility.ts';
import type { JsonRecord } from './sample.ts';
import { isRecord, nodesOf } from './sample.ts';

export interface Bound {
	workflow: JsonRecord;
	bindings: string[];
	unbound: string[];
}

interface Rule {
	/** Node short names (`slack`) the rule applies to. */
	nodes: string[];
	keys: RegExp;
	refs: string[];
	/** Turns the native value of a ref into the parameter value. */
	pick?: (native: string, ref: string) => string | undefined;
	/** Leaves refs out (for example a channel that the bot is not a member of). */
	skip?: RegExp;
	/** Every literal gets the first value (names such as a GitHub owner and repository). */
	shared?: boolean;
	/** Values to use instead of refs. */
	values?: (tenant: JsonRecord) => string[];
	/** Only for nodes with this `resource` parameter. */
	resource?: string;
	/** The kind that the native value must name (`file` in `file:abc`): refs of other services share prefixes. */
	kinds?: string[];
}

const lastPart = (v: string) => v.split('.').pop();

/** `channel:123` → `123`; `C0ABC/1794.0001` with `part: 1` → `1794.0001`. */
function nativeId(value: string, part?: number): string {
	const stripped = /^[a-z][a-z_]*:(?!\/\/)/.test(value)
		? value.slice(value.indexOf(':') + 1)
		: value;
	if (part === undefined) return stripped;
	return stripped.split('/')[part] ?? stripped;
}

const RULES: Rule[] = [
	{
		nodes: ['slack'],
		keys: /^(channel|channelId|channelIds|channels|searchChannel)$/,
		refs: ['channel:'],
		skip: /leadership/,
	},
	{ nodes: ['slack'], keys: /^(user|userId|userIds|users)$/, refs: ['person:'] },
	{
		nodes: ['slack'],
		keys: /^(ts|threadTs|timestamp|messageTs)$/,
		refs: ['msg:'],
		pick: (v) => nativeId(v, 1),
	},
	{ nodes: ['discord'], keys: /^(channelId|categoryId)$/, refs: ['channel:'] },
	{ nodes: ['discord'], keys: /^guildId$/, refs: ['guild'] },
	{ nodes: ['discord'], keys: /^messageId$/, refs: ['message:'] },
	{ nodes: ['telegram'], keys: /^chatId$/, refs: ['chat:'] },
	{ nodes: ['telegram'], keys: /^messageId$/, refs: ['msg:'], pick: (v) => nativeId(v, 1) },
	{ nodes: ['notion'], keys: /^databaseId$/, refs: ['db:', 'table:'], skip: /#/ },
	{ nodes: ['notion'], keys: /^(pageId|blockId)$/, refs: ['page:'] },
	{ nodes: ['pipedrive'], keys: /^dealId$/, refs: ['deal:'] },
	{ nodes: ['pipedrive'], keys: /^personId$/, refs: ['person:'] },
	{ nodes: ['pipedrive'], keys: /^(orgId|organizationId|org_id)$/, refs: ['org:'] },
	{ nodes: ['pipedrive'], keys: /^leadId$/, refs: ['lead:'] },
	{ nodes: ['pipedrive'], keys: /^noteId$/, refs: ['note:'] },
	{ nodes: ['pipedrive'], keys: /^activityId$/, refs: ['act:'] },
	{ nodes: ['pipedrive'], keys: /^fileId$/, refs: ['file:'] },
	{ nodes: ['salesforce'], keys: /^accountId$/, refs: ['org:'] },
	{ nodes: ['salesforce'], keys: /^opportunityId$/, refs: ['deal:'] },
	{
		nodes: ['salesforce'],
		keys: /^contactId$/,
		refs: ['person:'],
		pick: (v) => (v.startsWith('003') ? v : undefined),
	},
	{
		nodes: ['salesforce'],
		keys: /^leadId$/,
		refs: ['person:'],
		pick: (v) => (v.startsWith('00Q') ? v : undefined),
	},
	{
		nodes: ['salesforce'],
		keys: /^userId$/,
		refs: ['person:'],
		pick: (v) => (v.startsWith('005') ? v : undefined),
	},
	{ nodes: ['salesforce'], keys: /^(caseId)$/, refs: ['case:'] },
	{ nodes: ['salesforce'], keys: /^(taskId)$/, refs: ['task:'] },
	{ nodes: ['hubspot'], keys: /^contactId$/, refs: ['person:', 'contact:'] },
	{ nodes: ['hubspot'], keys: /^companyId$/, refs: ['org:', 'company:'] },
	{ nodes: ['hubspot'], keys: /^dealId$/, refs: ['deal:'] },
	{ nodes: ['hubspot'], keys: /^ticketId$/, refs: ['ticket:'] },
	{ nodes: ['airtable'], keys: /^(base|application)$/, refs: ['base:'] },
	{ nodes: ['airtable'], keys: /^table$/, refs: ['table:'] },
	{ nodes: ['airtable'], keys: /^id$/, refs: ['rec:'] },
	{ nodes: ['mondayCom'], keys: /^boardId$/, refs: ['board:'] },
	{ nodes: ['mondayCom'], keys: /^itemId$/, refs: ['item:'] },
	{ nodes: ['stripe'], keys: /^customerId$/, refs: ['customer:', 'cust:'] },
	{ nodes: ['youTube'], keys: /^channelId$/, refs: ['channel:'] },
	{ nodes: ['youTube'], keys: /^playlistId$/, refs: ['playlist:'] },
	{
		nodes: ['microsoftOutlook'],
		keys: /^messageId$/,
		refs: ['message:', 'thread:'],
		skip: /:sent$|#/,
	},
	{ nodes: ['microsoftOutlook'], keys: /^(folderId|parentFolderId)$/, refs: ['folder:'] },
	{ nodes: ['microsoftOutlook'], keys: /^contactId$/, refs: ['contact:'] },
	{ nodes: ['microsoftOutlook'], keys: /^eventId$/, refs: ['event:'] },
	{ nodes: ['zendesk'], keys: /^(ticketId|id)$/, refs: ['ticket:'] },
	{ nodes: ['googleSheets'], keys: /^documentId$/, refs: ['table:'] },
	{ nodes: ['gmail'], keys: /^(messageId|threadId)$/, refs: ['thread:', 'msg:', 'message:'] },
	// The GitHub world: user `mia` (the persona's mail name) owns the repository `app`.
	{
		nodes: ['github'],
		keys: /^owner$/,
		refs: [],
		shared: true,
		values: () => ['acme'],
		resource: 'organization',
	},
	{ nodes: ['github'], keys: /^owner$/, refs: [], shared: true, values: () => ['mia'] },
	{ nodes: ['github'], keys: /^repository$/, refs: [], shared: true, values: () => ['app'] },
	{ nodes: ['github'], keys: /^workflowId$/, refs: ['wf:'] },
	{ nodes: ['github'], keys: /^issueNumber$/, refs: [], shared: true, values: () => ['1'] },
	{ nodes: ['googleDrive'], keys: /^(fileId)$/, refs: ['file:', 'doc:'], kinds: ['file'] },
	{
		nodes: ['googleDrive'],
		keys: /^(folderId|folderNoRootId)$/,
		refs: ['folder:'],
		kinds: ['file'],
	},
	{ nodes: ['googleDrive'], keys: /^driveId$/, refs: ['drive:'], kinds: ['drive'] },
	{ nodes: ['googleBigQuery'], keys: /^projectId$/, refs: ['project:'] },
	{
		nodes: ['googleBigQuery'],
		keys: /^datasetId$/,
		refs: ['dataset:'],
		shared: true,
		pick: lastPart,
		skip: /staging/,
	},
	{
		nodes: ['googleBigQuery'],
		keys: /^tableId$/,
		refs: ['table:'],
		pick: lastPart,
		skip: /events/,
	},
];

function isExpression(v: unknown): boolean {
	return typeof v === 'string' && (v.startsWith('=') || v.includes('{{'));
}

class Binder {
	private readonly used = new Map<Rule, Map<string, string>>();

	readonly bindings: string[] = [];

	readonly unbound: string[] = [];

	private readonly refs: Array<[string, string]>;

	private readonly tenant: JsonRecord;

	constructor(tenant: JsonRecord) {
		this.tenant = tenant;
		const refs = isRecord(tenant.refs) ? tenant.refs : {};
		this.refs = Object.entries(refs)
			.filter((e): e is [string, string] => typeof e[1] === 'string')
			.sort((a, b) => a[0].localeCompare(b[0]));
	}

	bind(rule: Rule, literal: string, where: string): string | undefined {
		const seen = this.used.get(rule) ?? new Map<string, string>();
		this.used.set(rule, seen);
		const hit = seen.get(literal);
		if (hit !== undefined) return hit;
		const taken = new Set(seen.values());
		if (rule.shared && taken.size > 0) {
			const first = [...taken][0];
			seen.set(literal, first);
			this.bindings.push(`${where}: ${literal} -> ${first}`);
			return first;
		}
		for (const value of rule.values?.(this.tenant) ?? []) {
			if (taken.has(value)) continue;
			seen.set(literal, value);
			this.bindings.push(`${where}: ${literal} -> ${value}`);
			return value;
		}
		for (const [ref, native] of this.refs) {
			if (!rule.refs.some((p) => ref.startsWith(p)) || rule.skip?.test(ref)) continue;
			if (rule.kinds && !rule.kinds.some((k) => native.startsWith(`${k}:`))) continue;
			const value = rule.pick ? rule.pick(nativeId(native), ref) : nativeId(native);
			if (value === undefined || taken.has(value)) continue;
			seen.set(literal, value);
			this.bindings.push(`${where}: ${literal} -> ${ref}`);
			return value;
		}
		this.unbound.push(`${where}: ${literal} (no free ref ${rule.refs.join('|')})`);
		return undefined;
	}
}

function rewrite(
	value: unknown,
	key: string,
	path: string,
	rules: Rule[],
	binder: Binder,
): unknown {
	const rule = rules.find((r) => r.keys.test(key));
	if (isRecord(value)) {
		if (
			value.__rl === true &&
			rule &&
			typeof value.value === 'string' &&
			!isExpression(value.value) &&
			value.value !== ''
		) {
			const bound = binder.bind(rule, value.value, path);
			return bound === undefined
				? value
				: { ...value, value: bound, mode: value.mode === 'url' ? 'id' : value.mode };
		}
		const out: JsonRecord = {};
		for (const [k, v] of Object.entries(value))
			out[k] = rewrite(v, k, `${path}.${k}`, rules, binder);
		return out;
	}
	if (Array.isArray(value)) {
		return value.map((v, i) => rewrite(v, key, `${path}[${i}]`, rules, binder));
	}
	if (
		rule &&
		(typeof value === 'string' || typeof value === 'number') &&
		value !== '' &&
		!isExpression(value)
	) {
		const literal = String(value);
		const parts =
			typeof value === 'string' && value.includes(',')
				? value.split(',').map((x) => x.trim())
				: [literal];
		const bound = parts.map((p) => binder.bind(rule, p, path));
		if (bound.some((b) => b === undefined)) return value;
		const text = bound.join(',');
		return typeof value === 'number' && /^-?\d+$/.test(text) ? Number(text) : text;
	}
	return value;
}

export function bindWorkflow(workflow: JsonRecord, tenant: JsonRecord): Bound {
	const binder = new Binder(tenant);
	const nodes = nodesOf(workflow).map((n) => {
		const short = shortType(n.type);
		const resource = n.parameters?.resource;
		const rules = RULES.filter(
			(r) => r.nodes.includes(short) && (r.resource === undefined || r.resource === resource),
		);
		if (rules.length === 0 || !n.parameters) return n;
		const parameters = rewrite(n.parameters, '', n.name, rules, binder);
		return isRecord(parameters) ? { ...n, parameters } : n;
	});
	return { workflow: { ...workflow, nodes }, bindings: binder.bindings, unbound: binder.unbound };
}
