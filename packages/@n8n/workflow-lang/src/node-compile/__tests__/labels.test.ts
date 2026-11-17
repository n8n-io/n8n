import ts from 'typescript';

import { withoutLabels } from '../labels.ts';

function lower(source: string): string {
	const sf = ts.createSourceFile('a.ts', source, ts.ScriptTarget.ES2022, true);
	const out = withoutLabels(sf);
	if (!ts.isSourceFile(out)) throw new Error('The result is not a source file.');
	return ts.createPrinter().printFile(out);
}

function run(body: string): string {
	const fn: unknown = new Function(`const log = []; ${body}; return log.join(',');`);
	if (typeof fn !== 'function') throw new Error('The body is not a function.');
	return String(fn());
}

type Loop = (v: string, label: string, body: string) => string;

const LOOPS: Loop[] = [
	(v, label, body) => `${label} for (let ${v} = 0; ${v} < 3; ${v}++) { ${body} }`,
	(v, label, body) => `${label} for (const ${v} of [0, 1, 2]) { ${body} }`,
	(v, label, body) => `let ${v} = -1; ${label} while (++${v} < 3) { ${body} }`,
	(v, label, body) => `let ${v} = -1; ${label} do { ${v}++; ${body} } while (${v} < 2);`,
];

const JUMPS = ['break outer;', 'continue outer;', 'break;', 'continue;', ''];
const DEEP_JUMPS = [...JUMPS, 'break mid;', 'continue mid;'];

function programs(): string[] {
	const out: string[] = [];
	for (const outer of LOOPS)
		for (const inner of LOOPS)
			for (const j1 of JUMPS)
				for (const j2 of JUMPS)
					for (const at of [0, 1, 2]) {
						const body = `log.push('b' + i + j); if (j === ${at}) { try { ${j1} } finally { log.push('f'); } } if (i === 1) { ${j2} } log.push('c');`;
						out.push(
							`${outer('i', 'outer:', `log.push('a' + i); { ${inner('j', '', body)} } log.push('d' + i);`)} log.push('end');`,
						);
					}
	for (const j1 of DEEP_JUMPS)
		for (const j2 of DEEP_JUMPS)
			for (const j3 of JUMPS) {
				const deep = `for (let k = 0; k < 3; k++) { log.push('k' + i + j + k); if (k === 1 && j === 1) { ${j1} } if (k === 2 && i === 0) { ${j2} } }`;
				const mid = `mid: for (let j = 0; j < 3; j++) { ${deep} log.push('m' + j); if (j === 2 && i === 1) { ${j3} } }`;
				out.push(
					`outer: for (let i = 0; i < 3; i++) { ${mid} log.push('o' + i); } log.push('end');`,
				);
			}
	return out;
}

describe('node compiler: labelled loop exits', () => {
	it('gives the trace of the labelled form for each generated nest of loops', () => {
		const all = programs();
		expect(all.length).toBeGreaterThan(1400);
		let lowered = 0;
		for (const source of all) {
			const out = lower(source);
			expect(out, source).not.toMatch(/\b(outer|mid)\b/);
			if (out.includes('__jump')) lowered++;
			expect(run(out), source).toBe(run(source));
		}
		expect(lowered).toBeGreaterThan(500);
	});

	it('removes a label that no jump names', () => {
		expect(lower('a: for (;;) { break; }')).not.toContain('a:');
	});

	it('uses a plain jump when the jump is in the labelled loop itself', () => {
		const out = lower('a: for (const x of xs) { if (x) continue a; if (y) break a; }');
		expect(out).not.toContain('a:');
		expect(out).not.toContain('__jump');
	});

	it('keeps a label when a switch is between the jump and the loop', () => {
		expect(lower('a: for (;;) { switch (x) { case 1: break a; } }')).toContain('a:');
		expect(lower('a: for (;;) { for (;;) { switch (x) { case 1: continue a; } } }')).toContain(
			'a:',
		);
	});

	it('keeps a label of a statement that is not a loop', () => {
		expect(lower('a: { if (x) break a; y(); }')).toContain('a:');
	});

	it('does not take a name that the code has', () => {
		const out = lower('let __jump0 = 5; a: for (;;) { for (;;) { break a; } }');
		expect(out).toContain('__jump1');
	});
});
