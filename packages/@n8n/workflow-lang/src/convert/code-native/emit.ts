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
import { codeHelperNames, codeHelperSources } from './helpers.ts';
import type { Translation } from './translate.ts';
import {
	ALL_NODES,
	FILES,
	MADE,
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
export function emitHelpers(
	t: Translation,
	mode: 'all' | 'each',
	plainInput = false,
	traced?: Translation,
): string[] {
	const out = new Set(['codeWrap', mode === 'each' ? 'codeEachItems' : 'codeItems', ...t.helpers]);
	// Code that cannot run twice runs in its traced form, with the helpers of that form.
	if (traced !== undefined && !t.repeatable) {
		out.add('codeAt');
		for (const h of traced.helpers) out.add(h);
	}
	// The traced form of other code runs on new copies, after a failure.
	if (!sharesInput(t, plainInput) || t.nodes.length > 0 || traced !== undefined)
		out.add('codeClone');
	if (t.usesCollections) out.add('collPlain');
	if (t.usesHttp) {
		out.add('codeHttpArgs');
		out.add('codeHttpResult');
	}
	return [...out];
}

/**
 * The helpers that only the error path of the code calls, as local function declarations:
 * the message of the error, and the helpers of the traced form that the plain form does
 * not have.
 */
function localHelpers(
	t: Translation,
	mode: 'all' | 'each',
	plainInput: boolean,
	traced: Translation | undefined,
): string[] {
	const main = codeHelperNames(emitHelpers(t, mode, plainInput, traced));
	const wanted = codeHelperNames([
		'codeFail',
		...(traced !== undefined && t.repeatable ? ['codeAt', ...traced.helpers] : []),
	]);
	for (const name of main) wanted.delete(name);
	return codeHelperSources(wanted);
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
	traced: Translation | undefined,
	files: string,
	made: string,
): { params: string; lines: string[]; args: string } {
	const raw = (k: number) => `${P}r${k}`;
	const params = [
		`${P}in: Json[]`,
		...t.nodes.map((_, k) => `${raw(k)}: Json[]`),
		...(t.usesAllNodes ? [`${ALL_NODES}: Json`] : []),
		// The base64 text of the stored files of the input items (\`Translation.binaryNames\`).
		...(t.binaryNames !== undefined ? [`${FILES}: Json`] : []),
		// The plan and the stored entries of \`prepareBinaryData\` (\`codePrepareBinary\`).
		...(t.preparesBinary ? [`${MADE}: Json`] : []),
	].join(', ');
	/** The values that the code reads: the items of other nodes, and the input items. */
	const values = (source: string): string[] => {
		const out: string[] = [];
		t.nodes.forEach((_, k) => {
			out.push(
				`const ${nodeVar(k)}: Json[] = codeClone(${raw(k)}).map((${P}j: Json, ${P}k: number) => codeWrap(${P}j, ${P}k));`,
			);
		});
		out.push(
			`let ${ITEMS}: Json[] = ${source}.map((${P}j: Json, ${P}k: number) => codeWrap(${P}j, ${P}k));`,
		);
		if (t.usesMatchProps) out.push(`const ${MATCHES}: Json[] = [];`);
		if (mode === 'all' && t.usesFirstJson)
			out.push(`const ${FIRST_JSON}: Json = ${ITEMS}[0]?.json;`);
		return out;
	};
	const head = values(sharesInput(t, plainInput) ? `${P}in` : `codeClone(${P}in)`);
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
	const wrap = t.usesCollections ? 'collPlain' : '';
	// The user code keeps its text: indenting it would change multi-line template literals.
	// Code that can run twice runs in its plain form; after a failure, the traced form runs on
	// new copies and gives the error with its line. Other code runs in the traced form only.
	const again = traced !== undefined && t.repeatable;
	const body = traced !== undefined && !t.repeatable ? traced.body : t.body;
	// The helpers of the error path are local functions of the catch block: a run without an
	// error does not make them.
	const local = localHelpers(t, mode, plainInput, traced);
	const failure = (retrace: string[]): string[] => [
		`\t} catch (${P}e) {`,
		// The mark of \`RUNS_IN_HOST\` is not an error of the code (\`Translation.handsOver\`).
		...(t.handsOver ? [`\t\tif (fileLimitInHost(${P}e)) throw ${P}e;`] : []),
		...local,
		...retrace,
		'\t}',
	];
	let main: string;
	if (mode === 'all') {
		const retrace = again
			? [
					`\t\tconst ${P}t = (): Json => {`,
					...values(`codeClone(${P}in)`).map((v) => `\t\t\t${v}`),
					'\t\t\ttry {',
					'\t\t\t\t((): Json => {',
					traced.body,
					'\t\t\t\t})();',
					`\t\t\t} catch (${P}x) {`,
					`\t\t\t\treturn ${P}x;`,
					'\t\t\t}',
					'\t\t\treturn undefined;',
					'\t\t};',
					`\t\tthrow codeFail(${P}t(), ${P}e);`,
				]
			: [`\t\tthrow codeFail(undefined, ${P}e);`];
		// The whole user code is in the try block, so its declarations keep their scope.
		const user = [`${fn}(): ${type} => {`, '\ttry {', body, ...failure(retrace), '\t}'];
		main =
			step === null
				? [`return codeItems(${wrap}((${user[0]}`, ...user.slice(1, -1), '\t})()));'].join('\n')
				: [
						// The workflow awaits only a call of a local async function, so it has a name.
						`const ${P}user = ${user[0]}`,
						...user.slice(1, -1),
						'\t};',
						`\treturn codeItems(${wrap}(await ${P}user()));`,
					].join('\n');
	} else {
		// The traced form runs the items before the failed one again: they can change shared values.
		const retrace = again
			? [
					`\t\tconst ${P}t = (): Json => {`,
					...values(`codeClone(${P}in)`).map((v) => `\t\t\t${v}`),
					`\t\t\tconst ${P}run = (${ITEM}: Json, ${INDEX}: number): Json => {`,
					traced.body,
					'\t\t\t};',
					'\t\t\ttry {',
					`\t\t\t\tfor (let ${P}j = 0; ${P}j <= ${P}k; ${P}j++) ${P}run(${ITEMS}[${P}j], ${P}j);`,
					`\t\t\t} catch (${P}x) {`,
					`\t\t\t\treturn ${P}x;`,
					'\t\t\t}',
					'\t\t\treturn undefined;',
					'\t\t};',
					`\t\tthrow codeFail(${P}t(), ${P}e);`,
				]
			: [`\t\tthrow codeFail(undefined, ${P}e);`];
		main = [
			`const ${P}run = ${fn}(${ITEM}: Json, ${INDEX}: number): ${type} => {`,
			body,
			'\t};',
			`\tconst ${P}out: Json[] = [];`,
			`\tlet ${P}k = 0;`,
			'\ttry {',
			`\t\tfor (; ${P}k < ${ITEMS}.length; ${P}k++) {`,
			`\t\t\tconst ${P}r: Json = ${call}${P}run(${ITEMS}[${P}k], ${P}k);`,
			// As v1's runner: a result that is null or undefined gives no output, and so
			// does any other value that is false (0, an empty string).
			`\t\t\tif (${P}r) ${P}out[${P}k] = ${P}r;`,
			'\t\t}',
			...failure(retrace),
			`\treturn codeEachItems(${wrap}(${P}out));`,
		].join('\n');
	}
	// Every node that ran before, by name, for \`$(name)\` with a computed name.
	const all = t.allNodes.map((name, k) => `${JSON.stringify(name)}: ${allLists[k]}`).join(', ');
	const args = [
		input,
		...lists,
		...(t.usesAllNodes ? [`{ ${all} }`] : []),
		...(t.binaryNames !== undefined ? [files] : []),
		...(t.preparesBinary ? [made] : []),
	].join(', ');
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
	traced?: Translation,
	files = '{}',
	made = '{ plan: [] }',
): { declaration: string; expression: string } {
	const parts = emitParts(
		t,
		mode,
		input,
		lists,
		allLists,
		plainInput,
		form.step,
		traced,
		files,
		made,
	);
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
	traced?: Translation,
	files = '{}',
	made = '{ plan: [] }',
): string {
	const parts = emitParts(t, mode, input, lists, allLists, plainInput, null, traced, files, made);
	return [`((${parts.params}): Json[] => {`, ...parts.lines, `})(${parts.args})`].join('\n');
}
