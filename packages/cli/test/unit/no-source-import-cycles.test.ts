import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * A value-import cycle between two `@Service()` modules is not a style problem:
 * whichever module the graph is entered at gets an unresolved `design:paramtypes`
 * entry for the other, and `@n8n/di` silently injects `undefined` for it. The
 * class then fails at call time with "Cannot read properties of undefined",
 * hundreds of test files away from the import that caused it.
 *
 * `import-x/no-cycle` is only a warning, and it reports per-import rather than
 * per-cycle, so this test is the gate.
 */

const SRC = path.resolve(__dirname, '../../src');

const resolveSpecifier = (specifier: string, importer: string): string | null => {
	let base: string;
	if (specifier.startsWith('@/')) base = path.join(SRC, specifier.slice(2));
	else if (specifier.startsWith('.')) base = path.resolve(path.dirname(importer), specifier);
	else return null;

	// `@/foo.js` is the on-disk `@/foo.ts` (NodeNext-style specifiers).
	const withoutJs = base.endsWith('.js') ? base.slice(0, -3) : base;

	for (const candidate of [withoutJs + '.ts', path.join(withoutJs, 'index.ts')]) {
		try {
			if (statSync(candidate).isFile()) return candidate;
		} catch {
			// not this candidate
		}
	}
	return null;
};

/**
 * Static value imports and re-exports only. `import type` and dynamic
 * `await import()` do not create an evaluation-order edge, which is exactly
 * why they are the escape hatch when a cycle is unavoidable.
 */
// Clauses never contain quotes or semicolons, so [^'";]*? spans multi-line
// braced imports without leaking past a bare side-effect import's statement.
const importPattern = /(?:^|\n)\s*import\s+(type\s+)?(?:[^'";]*?\bfrom\s*)?['"]([^'"]+)['"]/g;
// Re-exports (`export ... from`) are evaluation-order edges too — barrels route cycles.
const exportPattern =
	/(?:^|\n)\s*export\s+(type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/g;

const valueImportsOf = (file: string): string[] => {
	const source = readFileSync(file, 'utf8');
	const edges: string[] = [];

	for (const pattern of [importPattern, exportPattern]) {
		for (const match of source.matchAll(pattern)) {
			if (match[1]) continue;
			const resolved = resolveSpecifier(match[2], file);
			if (resolved) edges.push(resolved);
		}
	}
	return edges;
};

/** Tarjan's algorithm, iterative to stay clear of the call-stack limit. */
const findCycles = (nodes: string[], edgesOf: (node: string) => string[]): string[][] => {
	const index = new Map<string, number>();
	const lowlink = new Map<string, number>();
	const onStack = new Set<string>();
	const stack: string[] = [];
	const cycles: string[][] = [];
	let counter = 0;

	for (const root of nodes) {
		if (index.has(root)) continue;

		const work: Array<{ node: string; edge: number }> = [{ node: root, edge: 0 }];
		index.set(root, counter);
		lowlink.set(root, counter);
		counter += 1;
		stack.push(root);
		onStack.add(root);

		while (work.length > 0) {
			const frame = work[work.length - 1];
			const neighbours = edgesOf(frame.node);

			if (frame.edge < neighbours.length) {
				const next = neighbours[frame.edge];
				frame.edge += 1;

				if (!index.has(next)) {
					index.set(next, counter);
					lowlink.set(next, counter);
					counter += 1;
					stack.push(next);
					onStack.add(next);
					work.push({ node: next, edge: 0 });
				} else if (onStack.has(next)) {
					lowlink.set(frame.node, Math.min(lowlink.get(frame.node)!, index.get(next)!));
				}
				continue;
			}

			work.pop();
			const parent = work[work.length - 1];
			if (parent) {
				lowlink.set(parent.node, Math.min(lowlink.get(parent.node)!, lowlink.get(frame.node)!));
			}

			if (lowlink.get(frame.node) === index.get(frame.node)) {
				const component: string[] = [];
				let member: string;
				do {
					member = stack.pop()!;
					onStack.delete(member);
					component.push(member);
				} while (member !== frame.node);

				if (component.length > 1) cycles.push(component);
			}
		}
	}

	return cycles;
};

test('packages/cli/src has no value-import cycles', () => {
	const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
		.filter(
			(file) => file.endsWith('.ts') && !file.includes('__tests__') && !file.endsWith('.test.ts'),
		)
		.map((file) => path.join(SRC, file));

	const cache = new Map<string, string[]>();
	const edgesOf = (file: string) => {
		let edges = cache.get(file);
		if (!edges) {
			edges = valueImportsOf(file);
			cache.set(file, edges);
		}
		return edges;
	};

	const cycles = findCycles(files, edgesOf)
		// Only a cycle that reaches a DI service can corrupt an injected
		// dependency. TypeORM entities, for one, reference each other by design
		// for bidirectional relations and have no injected constructor params.
		.filter((cycle) => cycle.some((file) => readFileSync(file, 'utf8').includes('@Service(')))
		.map((cycle) => cycle.map((file) => path.relative(SRC, file)).sort());

	expect(cycles).toEqual([]);
});
