/**
 * Pagination of the HTTP Request node (version 3 and later), as n8n-core's
 * `requestWithAuthenticationPaginated` does it. The generated workflow runs
 * the page loop: each page is one call of the library node with `page` (the
 * request parameters of the page), and the node gives the response and the
 * items of the page. The pagination expressions read `$response` (the last
 * response: `body`, `headers`, `statusCode`) and `$pageCount` (the pages so
 * far) as local variables.
 *
 * Supported: the modes "update a parameter in each request" and "response
 * contains next URL"; completion when the response is empty, on status
 * codes, or by an expression; a page limit; the interval between requests.
 * The node must stop the workflow on an error. Other forms fail with code
 * `http-pagination`, so the node runs in the fallback host.
 */
import type { Code } from './code.ts';
import { raw, str } from './code.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import type { TranslatedValue } from './expression.ts';
import { INDEX, ITEM } from './expression.ts';
import { isRecord, text } from './types.ts';

export interface Paging {
	/** Code of the `page` parameter, with the locals of `response` and `count`. */
	page: Code;
	/** Code that is true when another page follows. */
	more: string;
	/** Code of the page limit, or null. */
	max: string | null;
	/** Code of the wait between requests in milliseconds, or null. */
	interval: string | null;
	response: string;
	count: string;
	usesItem: boolean;
	usesIndex: boolean;
	/** "Continue on fail": a failed page gives the error item of v1 for the input item. */
	continueOnFail: boolean;
}

const fail = (message: string): never => {
	throw new NodeFailure('http-pagination', message, 'options.pagination');
};

/** The pagination of the node, or null when it has none (or mode "off"). */
export function readPaging(c: NodeContext, options: Record<string, unknown>): Paging | null {
	if (options.pagination === undefined) return null;
	const outer = isRecord(options.pagination) ? options.pagination : {};
	const pg = isRecord(outer.pagination) ? outer.pagination : {};
	const mode = pg.paginationMode ?? 'updateAParameterInEachRequest';
	if (mode === 'off') return null;
	const onError =
		c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
	if (onError === 'continueErrorOutput') {
		fail('Pagination with an error output is not supported by the library node.');
	}
	const response = c.local('PageResponse');
	const count = c.local('PageCount');
	const locals = { $response: response, $pageCount: count };
	let usesItem = false;
	let usesIndex = false;
	const value = (v: unknown, path: string): string => {
		const t: TranslatedValue = c.compiled(v, `options.pagination.pagination.${path}`, { locals });
		usesItem ||= t.usage.item;
		usesIndex ||= t.usage.index;
		// n8n-core resolves a pagination value that throws a TypeError to no value, so
		// lodash merge keeps the request part (the URL of the first page, for example).
		const code = c.print(t.code);
		if (!code.includes('orNull(')) return code;
		c.helper('orUndefined');
		return code.replaceAll('orNull(', 'orUndefined(');
	};
	const entries: Array<[string, Code]> = [];
	if (mode === 'responseContainsNextURL') {
		entries.push(['url', raw(value(pg.nextURL ?? '', 'nextURL'))]);
	} else if (mode === 'updateAParameterInEachRequest') {
		const outerList = isRecord(pg.parameters) ? pg.parameters.parameters : undefined;
		const list = Array.isArray(outerList) ? outerList.filter(isRecord) : [];
		const parts = new Map<string, Array<[string, Code]>>();
		list.forEach((p, k) => {
			const type = p.type ?? 'qs';
			if (type !== 'qs' && type !== 'headers' && type !== 'body') {
				fail(`The pagination parameter type "${text(type)}" is not valid.`);
			}
			if (typeof p.name !== 'string' || p.name === '' || p.name.startsWith('=')) {
				fail('A pagination parameter has no fixed name.');
			}
			if (p.value === '' || p.value === undefined) fail('A pagination parameter has no value.');
			const name = typeof p.name === 'string' ? p.name : '';
			const key = typeof type === 'string' ? type : 'qs';
			const part = parts.get(key) ?? [];
			part.push([name, raw(value(p.value, `parameters.parameters[${k}].value`))]);
			parts.set(key, part);
		});
		for (const [key, part] of parts) entries.push([key, { kind: 'object', entries: part }]);
	} else {
		fail(`The pagination mode "${text(mode)}" is not supported.`);
	}
	const neverError =
		isRecord(options.response) &&
		isRecord(options.response.response) &&
		options.response.response.neverError === true;
	const when = pg.paginationCompleteWhen ?? 'responseIsEmpty';
	let more: string;
	if (when === 'receiveSpecificStatusCodes') {
		const codes = text(pg.statusCodesWhenComplete ?? '')
			.split(',')
			.map((item) => parseInt(item.trim(), 10));
		more = `!${JSON.stringify(codes.map((n) => (Number.isNaN(n) ? null : n)))}.includes(${response}.statusCode)`;
	} else if (when === 'responseIsEmpty') {
		more = `(Array.isArray(${response}.body) ? ${response}.body.length !== 0 : Boolean(${response}.body))`;
	} else if (when === 'other') {
		const expression =
			typeof pg.completeExpression === 'string' ? pg.completeExpression.trim() : '';
		// v1 cuts `={{` and `}}` off the text, so only that form gives the expression.
		if (!expression.startsWith('={{') || !expression.endsWith('}}')) {
			fail('The pagination "complete" expression is not one `{{ }}` expression.');
		}
		// The continue expression of v1, as one expression: a TypeError in it gives no value,
		// so the loop stops (for example on an error body without the expected fields).
		const body = expression.slice(3, -2);
		const whole = neverError
			? `={{ !(${body}) }}`
			: `={{ !(${body}) || ($response.statusCode < 200 || $response.statusCode >= 300) }}`;
		more = `Boolean(${value(whole, 'completeExpression')})`;
	} else {
		return fail(`The pagination completion "${text(when)}" is not supported.`);
	}
	const max = pg.limitPagesFetched === true ? value(pg.maxRequests ?? 100, 'maxRequests') : null;
	const interval =
		pg.requestInterval !== undefined && pg.requestInterval !== 0
			? value(pg.requestInterval, 'requestInterval')
			: null;
	return {
		page: { kind: 'object', entries },
		more,
		max,
		interval,
		response,
		count,
		usesItem,
		usesIndex,
		continueOnFail: onError === 'continueRegularOutput',
	};
}

/**
 * Writes the page loop of each input item. `call` is the code of the
 * `ctx.node` options without `items`; `page` goes into its parameters.
 */
export function emitPaging(
	c: NodeContext,
	paging: Paging,
	parameters: Code,
	fields: Array<[string, Code]>,
): void {
	const { w, input } = c;
	const out = c.output(0);
	c.helper('paginationRepeat');
	const withPage: Code =
		parameters.kind === 'object'
			? { kind: 'object', entries: [...parameters.entries, ['page', paging.page]] }
			: parameters;
	const call: Code = {
		kind: 'object',
		entries: [
			['name', raw(str(c.node.name))],
			...fields.map(([k, v]): [string, Code] => (k === 'parameters' ? [k, withPage] : [k, v])),
			['items', raw(`[${ITEM}]`)],
		],
	};
	const guard = c.local('PageGuard');
	const result = c.local('Page');
	const pages = c.local('PageItems');
	const failed = c.local('PageFailed');
	w.line(`const ${out}: Json[] = [];`);
	w.open(`for (let ${INDEX} = 0; ${INDEX} < ${input}.length; ${INDEX}++) {`);
	w.line(`const ${ITEM} = ${input}[${INDEX}];`);
	w.line(`let ${paging.response}: Json = {};`);
	w.line(`let ${paging.count} = 0;`);
	w.line(`const ${guard}: Json = { length: 0, hash: '', count: 0 };`);
	w.line(`const ${pages}: Json[] = [];`);
	w.line(`let ${failed}: Json = null;`);
	w.open('for (;;) {');
	w.block(
		`const ${result}: Json[] = await ctx.node(${c.print(call, `const ${result}: Json[] = await ctx.node(`)});`,
	);
	w.line(`paginationRepeat(${guard}, ${result}[0].response);`);
	w.line(`for (const r of ${result}[0].items) ${pages}.push(r);`);
	w.line(`${paging.response} = ${result}[0].response;`);
	w.line(`${paging.count} = ${paging.count} + 1;`);
	// A literal number needs no test (TypeScript rejects `2 && …`, TS2872).
	const literal = (code: string) => /^\d+(\.\d+)?$/.test(code.trim());
	if (paging.max !== null) {
		const max = paging.max;
		if (!literal(max)) {
			w.line(`if (Boolean(${max}) && ${paging.count} >= Number(${max})) break;`);
		} else if (Number(max) !== 0) {
			w.line(`if (${paging.count} >= ${max}) break;`);
		}
	}
	w.line(`if (!${paging.more}) break;`);
	const interval = paging.interval;
	const wait = `await ctx.wait({ name: ${str(`${c.node.name} (page interval)`)}, duration: Number(${interval}) });`;
	if (interval !== null && !literal(interval)) w.line(`if (Boolean(${interval})) ${wait}`);
	else if (interval !== null && Number(interval) !== 0) w.line(wait);
	// v1 fails the node with the NodeApiError of the status, which the page gives. With
	// "continue on fail", the input item gives one error item in place of its pages.
	if (paging.continueOnFail) {
		w.open(`if (${result}[0].failure) {`);
		w.line(`${failed} = ${result}[0].failure;`);
		w.line('break;');
		w.close();
	} else {
		w.line(`if (${result}[0].failure) throw ${result}[0].failure;`);
	}
	w.close();
	if (paging.continueOnFail) {
		const version = Number(c.version);
		const r = paging.response;
		const error = `{ statusCode: ${r}.statusCode, error: typeof ${r}.body === 'object' && ${r}.body !== null ? JSON.stringify(${r}.body) : String(${r}.body), isAxiosError: true, response: { headers: ${r}.headers, status: ${r}.statusCode, statusText: ${failed}.statusText } }`;
		const details = `{ message: ${failed}.message, description: ${failed}.description, httpCode: ${failed}.httpCode, body: ${r}.body, context: { itemIndex: ${INDEX} } }`;
		w.open(`if (${failed} !== null) {`);
		w.line(
			version >= 4.5
				? `${out}.push({ error: ${error}, details: ${details} });`
				: `${out}.push({ error: ${error} });`,
		);
		w.close('} else {');
		w.depth++;
		w.line(`for (const r of ${pages}) ${out}.push(r);`);
		w.close();
	} else {
		w.line(`for (const r of ${pages}) ${out}.push(r);`);
	}
	w.close();
}
