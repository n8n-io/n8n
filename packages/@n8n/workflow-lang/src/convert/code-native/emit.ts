/**
 * Wraps a translated Code node body as one subset expression that gives the
 * result list.
 *
 * The expression is a call of an arrow function. Its parameters take the
 * input list and the lists of the other nodes that the code reads, so the
 * user code cannot see or change the variables of the workflow. It copies the
 * lists as JSON, as the fallback host gets them, and wraps the items as
 * `{ json }`. The user code runs in an inner function, so its `return` gives
 * the result, which `codeItems` turns into the result list.
 */
import type { Translation } from './translate.ts';
import { ALL_NODES, MATCHES, FIRST_JSON, INDEX, ITEM, ITEMS, nodeVar, P } from './translate.ts';

/** The helpers that `emitExpression` calls, besides those of the translation. */
export function emitHelpers(t: Translation): string[] {
	const out = new Set(['codeClone', 'codeWrap', 'codeItems', ...t.helpers]);
	if (t.nodes.length > 0) out.add('codeWrapJson');
	if (t.usesCollections) out.add('collPlain');
	return [...out];
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
): string {
	const raw = (k: number) => `${P}r${k}`;
	const params = [
		`${P}in: Json[]`,
		...t.nodes.map((_, k) => `${raw(k)}: Json[]`),
		...(t.usesAllNodes ? [`${ALL_NODES}: Json`] : []),
	].join(', ');
	const head: string[] = [];
	t.nodes.forEach((_, k) => {
		head.push(`const ${nodeVar(k)}: Json[] = codeClone(${raw(k)}).map(codeWrapJson);`);
	});
	head.push(`let ${ITEMS}: Json[] = codeClone(${P}in).map(codeWrap);`);
	if (t.usesMatchProps) head.push(`const ${MATCHES}: Json[] = [];`);
	// The user code keeps its text: indenting it would change multi-line template literals.
	const body = t.body;
	let main: string;
	if (mode === 'all') {
		if (t.usesFirstJson) head.push(`const ${FIRST_JSON}: Json = ${ITEMS}[0]?.json;`);
		const wrap = t.usesCollections ? 'collPlain' : '';
		main = [`return codeItems(${wrap}(((): Json => {`, body, '\t})()));'].join('\n');
	} else {
		main = [
			`const ${P}run = (${ITEM}: Json, ${INDEX}: number): Json => {`,
			body,
			'\t};',
			`\tconst ${P}out: Json[] = [];`,
			`\tfor (let ${P}k = 0; ${P}k < ${ITEMS}.length; ${P}k++) {`,
			`\t\tconst ${P}r: Json = ${P}run(${ITEMS}[${P}k], ${P}k);`,
			`\t\tif (${P}r !== undefined && ${P}r !== null) ${P}out.push(${P}r);`,
			'\t}',
			t.usesCollections
				? `\treturn codeItems(collPlain(${P}out));`
				: `\treturn codeItems(${P}out);`,
		].join('\n');
	}
	// Every node that ran before, by name, for \`$(name)\` with a computed name.
	const all = t.allNodes.map((name, k) => `${JSON.stringify(name)}: ${allLists[k]}`).join(', ');
	const args = [input, ...lists, ...(t.usesAllNodes ? [`{ ${all} }`] : [])].join(', ');
	return [
		`((${params}): Json[] => {`,
		...head.map((h) => `\t${h}`),
		`\t${main}`,
		`})(${args})`,
	].join('\n');
}
