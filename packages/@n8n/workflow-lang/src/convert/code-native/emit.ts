/**
 * Wraps a translated Code node body as one subset expression that gives the
 * result list.
 *
 * The expression is a call of an arrow function. Its parameters take the
 * input list and the lists of the other nodes that the code reads, so the
 * user code cannot see or change the variables of the workflow. It copies the
 * lists as JSON, as the fallback host gets them (but see `sharesInput`), and wraps the items as
 * `{ json, pairedItem }`, with the position of the item as v1's paired item.
 * The user code runs in an inner function, so its `return` gives the result,
 * which `codeItems` turns into the result list.
 */
import type { Translation } from './translate.ts';
import {
	ALL_NODES,
	MATCHES,
	FIRST_JSON,
	HTTP,
	INDEX,
	ITEM,
	ITEMS,
	nodeVar,
	P,
} from './translate.ts';

/**
 * True when the code reads the input list without a copy. The copy does three things: it
 * keeps changes of the code away from the list, it makes each value plain JSON (no
 * `undefined`, no NaN) as the task runner of v1 gets it, and it gives each object one place
 * only. So the code needs no copy when it provably changes nothing (`Translation.readOnly`)
 * and the list is plain JSON that came from a parse (`plainInput`: the result of a native
 * Code node or of a step of the fallback host).
 */
function sharesInput(t: Translation, plainInput: boolean): boolean {
	return plainInput && t.readOnly;
}

/** The helpers that `emitExpression` calls, besides those of the translation. */
export function emitHelpers(t: Translation, mode: 'all' | 'each', plainInput = false): string[] {
	const out = new Set(['codeWrap', mode === 'each' ? 'codeEachItems' : 'codeItems', ...t.helpers]);
	if (!sharesInput(t, plainInput) || t.nodes.length > 0) out.add('codeClone');
	if (t.nodes.length > 0) out.add('codeWrapJson');
	if (t.usesCollections) out.add('collPlain');
	if (t.writesBinary) out.add('codeBinarySizes');
	if (t.usesHttp) {
		out.add('codeHttpArgs');
		out.add('codeHttpResult');
	}
	return [...out];
}

/** Code that makes requests is an async function with a name: the workflow awaits its call. */
export interface AsyncForm {
	/** The name of the function. */
	fn: string;
	/** The name of the `http` step: the name of the node. */
	step: string;
}

/** The parts of the function that runs the code: its parameters, its body and its arguments. */
function emitParts(
	t: Translation,
	mode: 'all' | 'each',
	input: string,
	lists: string[],
	allLists: string[],
	plainInput: boolean,
	step: string | null,
): { params: string; lines: string[]; args: string } {
	const raw = (k: number) => `${P}r${k}`;
	const params = [
		`${P}in: Json[]`,
		...t.nodes.map((_, k) => `${raw(k)}: Json[]`),
		...(t.usesAllNodes ? [`${ALL_NODES}: Json`] : []),
	].join(', ');
	const head: string[] = [];
	t.nodes.forEach((_, k) => {
		head.push(
			`const ${nodeVar(k)}: Json[] = codeClone(${raw(k)}).map((${P}j: Json, ${P}k: number) => codeWrapJson(${P}j, ${P}k));`,
		);
	});
	const source = sharesInput(t, plainInput) ? `${P}in` : `codeClone(${P}in)`;
	head.push(
		`let ${ITEMS}: Json[] = ${source}.map((${P}j: Json, ${P}k: number) => codeWrap(${P}j, ${P}k));`,
	);
	if (t.usesMatchProps) head.push(`const ${MATCHES}: Json[] = [];`);
	if (step !== null) {
		// \`this.helpers.httpRequest\` of v1: one \`http\` step with the name of the node. The
		// helpers make the request from the options and the result from the response.
		head.push(
			[
				`const ${HTTP} = async (${P}o: Json): Promise<Json> => {`,
				`\t\tconst ${P}a: Json = codeHttpArgs(${P}o);`,
				`\t\tconst ${P}r: Json = await ctx.http({ name: ${JSON.stringify(step)}, method: ${P}a.method, url: ${P}a.url, headers: ${P}a.headers, qs: ${P}a.qs, qsFormat: 'brackets', body: ${P}a.body, timeoutMs: ${P}a.timeoutMs });`,
				`\t\treturn codeHttpResult(${P}o, ${P}r);`,
				'\t};',
			].join('\n'),
		);
	}
	// In code that makes requests, the user code is an async function, and its call is awaited.
	const fn = step === null ? '' : 'async ';
	const type = step === null ? 'Json' : 'Promise<Json>';
	const call = step === null ? '' : 'await ';
	// Binary data that the code makes or changes gets its size members, as in the host.
	const sized = t.writesBinary ? 'codeBinarySizes(' : '';
	const close = t.writesBinary ? ')' : '';
	// The user code keeps its text: indenting it would change multi-line template literals.
	const body = t.body;
	let main: string;
	if (mode === 'all') {
		if (t.usesFirstJson) head.push(`const ${FIRST_JSON}: Json = ${ITEMS}[0]?.json;`);
		const wrap = t.usesCollections ? 'collPlain' : '';
		main =
			step === null
				? [`return ${sized}codeItems(${wrap}(((): Json => {`, body, `\t})()))${close};`].join('\n')
				: [
						`const ${P}user = async (): Promise<Json> => {`,
						body,
						'\t};',
						`\treturn ${sized}codeItems(${wrap}(await ${P}user()))${close};`,
					].join('\n');
	} else {
		main = [
			`const ${P}run = ${fn}(${ITEM}: Json, ${INDEX}: number): ${type} => {`,
			body,
			'\t};',
			`\tconst ${P}out: Json[] = [];`,
			`\tfor (let ${P}k = 0; ${P}k < ${ITEMS}.length; ${P}k++) {`,
			`\t\tconst ${P}r: Json = ${call}${P}run(${ITEMS}[${P}k], ${P}k);`,
			// As v1's runner: a result that is null or undefined gives no output, and so
			// does any other value that is false (0, an empty string).
			`\t\tif (${P}r) ${P}out.push(${P}r);`,
			'\t}',
			t.usesCollections
				? `\treturn ${sized}codeEachItems(collPlain(${P}out))${close};`
				: `\treturn ${sized}codeEachItems(${P}out)${close};`,
		].join('\n');
	}
	// Every node that ran before, by name, for \`$(name)\` with a computed name.
	const all = t.allNodes.map((name, k) => `${JSON.stringify(name)}: ${allLists[k]}`).join(', ');
	const args = [input, ...lists, ...(t.usesAllNodes ? [`{ ${all} }`] : [])].join(', ');
	return { params, lines: [...head.map((h) => `\t${h}`), `\t${main}`], args };
}

/**
 * The declaration of the async function of code that makes requests, and the expression of
 * the result list: the awaited call of the function.
 */
export function emitAsync(
	t: Translation,
	mode: 'all' | 'each',
	form: AsyncForm,
	input: string,
	lists: string[],
	allLists: string[] = [],
	plainInput = false,
): { declaration: string; expression: string } {
	const parts = emitParts(t, mode, input, lists, allLists, plainInput, form.step);
	return {
		declaration: [
			`const ${form.fn} = async (${parts.params}): Promise<Json[]> => {`,
			...parts.lines,
			'};',
		].join('\n'),
		expression: `await ${form.fn}(${parts.args})`,
	};
}

/**
 * The expression of the result list. `input` is the code of the input list,
 * `lists[k]` the code of the list of node `t.nodes[k]`.
 */
export function emitExpression(
	t: Translation,
	mode: 'all' | 'each',
	input: string,
	lists: string[],
	allLists: string[] = [],
	plainInput = false,
): string {
	const parts = emitParts(t, mode, input, lists, allLists, plainInput, null);
	return [`((${parts.params}): Json[] => {`, ...parts.lines, `})(${parts.args})`].join('\n');
}
