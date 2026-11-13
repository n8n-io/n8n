/**
 * Nodes that wait: Wait (all resume modes), Form pages, and the "send and
 * wait" operations of message nodes (Slack, Gmail, Telegram, Chat, …).
 *
 * - Wait for a time interval or until a date → `ctx.wait`.
 * - Wait for a webhook call or a form submission, a Form page, and send and
 *   wait → `ctx.approval`. The runtime parks the execution and emits a
 *   `waiting` event; n8n resumes it through `POST /_admin/resume/…` (spec
 *   section 9.1) with the resume value `{ approved, data? }`.
 *   - Wait (webhook, form), Form page, Chat: `data` is the item that the v1
 *     node gives on resume (the webhook request `{ headers, params, query,
 *     body }`, or the form fields). The node gives `[data]`.
 *   - Send and wait: `data` is the `data` member of the v1 output item
 *     (`{ approved }`, `{ text }` or the form fields). The node gives
 *     `[{ data }]`, and `[{ data: { approved } }]` without `data`.
 *   - Without `data` (the time limit ended the wait) the node gives its input
 *     items.
 * v1 reads the parameters of these nodes for the first item, so the code
 * does too.
 */
import type { Code } from './code.ts';
import { print, raw, str } from './code.ts';
import type { NodeContext } from './context.ts';
import { INDEX, ITEM, isExpression } from './expression.ts';
import type { N8nNode } from './types.ts';
import { isRecord, text } from './types.ts';

const UNIT_MS: Record<string, number> = {
	seconds: 1000,
	minutes: 60_000,
	hours: 3_600_000,
	days: 86_400_000,
};

const flatCode = (code: Code) => print(code, '', 0, Number.MAX_SAFE_INTEGER);

/** True for the "send and wait" operation of a message node. */
export function isSendAndWait(node: N8nNode): boolean {
	return node.parameters?.operation === 'sendAndWait';
}

/** Translates parameters read for the first item, and opens the guard block. */
class FirstItem {
	private item = false;

	private index = false;

	private readonly c: NodeContext;

	constructor(c: NodeContext) {
		this.c = c;
	}

	value(value: unknown, path: string): string {
		const t = this.c.compiled(value, path);
		this.item ||= t.usage.item;
		this.index ||= t.usage.index;
		return flatCode(t.code);
	}

	/** The code of a parameter tree. Expressions that do not translate go to the host as text. */
	tree(value: unknown): Code {
		const t = this.c.translate(value, '');
		this.item ||= t.usage.item;
		this.index ||= t.usage.index;
		for (const f of t.failures) {
			this.c.warn(
				'raw-expression',
				`The expression does not translate (${f.issues.map((i) => i.feature).join(', ')}). The fallback host evaluates it when it sends the message.`,
				f.path,
			);
		}
		return t.code;
	}

	open(): void {
		const { c } = this;
		c.w.open(`if (${c.input}.length > 0) {`);
		if (this.item) c.w.line(`const ${ITEM} = ${c.input}[0];`);
		if (this.index) c.w.line(`const ${INDEX} = 0;`);
	}
}

/** Milliseconds of `amount` × `unit`, as code. */
function duration(
	first: FirstItem,
	amount: unknown,
	unit: unknown,
	path: string,
	defaults: { unit: string; amount: number } = { unit: 'hours', amount: 1 },
) {
	const u = text(unit, defaults.unit);
	const ms = UNIT_MS[u];
	// v1 fails when the node runs, not before.
	if (ms === undefined) {
		const message = "Invalid wait unit. Valid units are 'seconds', 'minutes', 'hours', or 'days'.";
		return `((): number => { throw new Error(${JSON.stringify(message)}); })()`;
	}
	const value = first.value(amount ?? defaults.amount, path);
	// n8n reads the amount as a number parameter: text such as "300" is the number 300.
	return typeof amount === 'number' || amount === undefined
		? `${value} * ${ms}`
		: `Number(${value}) * ${ms}`;
}

/** The time limit of a webhook or form wait, as code of milliseconds from now, or null. */
function limit(c: NodeContext, first: FirstItem): string | null {
	const p = c.parameters;
	if (p.limitWaitTime !== true) return null;
	if (text(p.limitType, 'afterTimeInterval') === 'afterTimeInterval') {
		return duration(first, p.resumeAmount, p.resumeUnit, 'resumeAmount');
	}
	return `Math.max(new Date(${first.value(p.maxDateAndTime ?? '', 'maxDateAndTime')}).getTime() - ctx.now(), 0)`;
}

/** Emits the approval call and the output list. */
function emitApproval(
	c: NodeContext,
	first: FirstItem,
	via: string,
	message: string,
	timeout: string | null,
	output: (result: string) => string,
	always = false,
	node: Code | null = null,
) {
	const w = c.w;
	const out = c.output(0);
	const result = c.local('Resume');
	const call: Code = {
		kind: 'object',
		entries: [
			['name', raw(str(c.node.name))],
			['message', raw(message)],
			['via', raw(str(via))],
			...(timeout === null ? [] : ([['timeout', raw(timeout)]] as Array<[string, Code]>)),
			...(node === null ? [] : ([['node', node]] as Array<[string, Code]>)),
		],
	};
	w.line(`let ${out}: Json[] = ${c.input};`);
	first.open();
	w.block(
		`const ${result} = await ctx.approval(${c.print(call, `const ${result} = await ctx.approval(`)});`,
	);
	if (always) {
		w.line(`${out} = ${output(result)};`);
	} else {
		w.comment(
			'`resumeItem` gives null when the time limit ended the wait: the node gives its input items.',
		);
		const item = c.local('Item');
		w.line(`const ${item}: Json = ${output(result)};`);
		w.line(`if (${item} !== null) ${out} = [${item}];`);
	}
	w.close();
}

export function lowerWait(c: NodeContext): void {
	const p = c.parameters;
	const resume = text(p.resume, 'timeInterval');
	const w = c.w;
	const first = new FirstItem(c);
	if (resume === 'timeInterval') {
		// Wait 1 defaults to 1 hour; later versions to 5 seconds (`Wait.node.ts`).
		const defaults = c.version <= 1 ? { unit: 'hours', amount: 1 } : { unit: 'seconds', amount: 5 };
		const ms = duration(first, p.amount, p.unit, 'amount', defaults);
		first.open();
		w.line(`await ctx.wait({ name: ${str(c.node.name)}, duration: ${ms} });`);
		w.close();
		w.line(`const ${c.output(0)}: Json[] = ${c.input};`);
		return;
	}
	// v1 waits until `dateTime` for "specificTime" and for any other value that is not
	// "timeInterval", "webhook" or "form" (the else branch of `Wait.execute`).
	if (resume !== 'webhook' && resume !== 'form') {
		let until: string;
		if (isExpression(p.dateTime)) {
			until = `new Date(${first.value(p.dateTime, 'dateTime')}).getTime()`;
		} else {
			const at = typeof p.dateTime === 'string' ? Date.parse(p.dateTime) : Number.NaN;
			if (Number.isNaN(at)) {
				// v1 fails when the node runs, with this message.
				first.open();
				w.line(
					`throw new Error(${str('Cannot put execution to wait because `dateTime` parameter is not a valid date. Please pick a specific date and time to wait until.')});`,
				);
				w.close();
				w.line(`const ${c.output(0)}: Json[] = ${c.input};`);
				return;
			}
			until = String(at);
		}
		c.warn('wait', 'The wait time is read as UTC when it has no time zone.', 'dateTime');
		first.open();
		w.line(`await ctx.wait({ name: ${str(c.node.name)}, until: ${until} });`);
		w.close();
		w.line(`const ${c.output(0)}: Json[] = ${c.input};`);
		return;
	}
	if (resume === 'webhook' || resume === 'form') {
		const timeout = limit(c, first);
		const message =
			resume === 'form'
				? first.value(p.formTitle ?? 'Form', 'formTitle')
				: str('Waiting for a call of the resume URL.');
		c.helper('resumeItem');
		emitApproval(c, first, resume, message, timeout, (r) => `resumeItem(${r}, ${str(resume)})`);
		return;
	}
}

/** Form (a page after a Form Trigger): a page waits for its submission; the completion page ends. */
export function lowerForm(c: NodeContext): void {
	const p = c.parameters;
	const operation = text(p.operation, 'page');
	if (operation === 'completion') {
		c.info('form', 'The completion page is shown by n8n; the converted code passes the items on.');
		c.w.line(`const ${c.output(0)}: Json[] = ${c.input};`);
		return;
	}
	const first = new FirstItem(c);
	const title = first.value(p.formTitle ?? 'Form', 'formTitle');
	c.helper('resumeItem');
	emitApproval(c, first, 'form', title, limit(c, first), (r) => `resumeItem(${r}, 'form')`);
}

/** Send and wait: one message for the first item, then a wait for the answer. */
export function lowerSendAndWait(c: NodeContext): void {
	const p = c.parameters;
	const first = new FirstItem(c);
	const message = first.value(p.message ?? '', 'message');
	const via = c.node.type
		.replace(/^n8n-nodes-base\./, '')
		.replace(/^@n8n\/n8n-nodes-langchain\./, '');
	const options = isRecord(p.options) ? p.options : {};
	const limitOption =
		isRecord(options.limitWaitTime) && isRecord(options.limitWaitTime.values)
			? options.limitWaitTime.values
			: null;
	let timeout: string | null = null;
	if (limitOption) {
		timeout =
			text(limitOption.limitType, 'afterTimeInterval') === 'afterTimeInterval'
				? duration(first, limitOption.resumeAmount, limitOption.resumeUnit, 'options.limitWaitTime')
				: `Math.max(new Date(${first.value(limitOption.maxDateAndTime ?? '', 'options.limitWaitTime')}).getTime() - ctx.now(), 0)`;
	}
	// The runtime sends the message through the fallback host with this node, then waits (spec 9.4).
	const nodeEntries: Array<[string, Code]> = [
		['type', raw(str(c.node.type))],
		['typeVersion', raw(String(c.version))],
		['parameters', first.tree(p)],
	];
	const credential = c.credential();
	if (credential !== undefined) nodeEntries.push(['credential', raw(str(credential))]);
	const node: Code = { kind: 'object', entries: nodeEntries };
	const chat = c.node.type.startsWith('@n8n/n8n-nodes-langchain.');
	if (chat) {
		c.helper('resumeItem');
		emitApproval(c, first, via, message, timeout, (r) => `resumeItem(${r}, 'chat')`, false, node);
		return;
	}
	emitApproval(
		c,
		first,
		via,
		message,
		timeout,
		(r) => `[{ data: ${r}.data ?? { approved: ${r}.approved } }]`,
		true,
		node,
	);
}
