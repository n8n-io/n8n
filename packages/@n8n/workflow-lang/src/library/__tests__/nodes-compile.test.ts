/**
 * A guard for the node library: every library node in `src/nodes/` compiles
 * through the library linker with no diagnostic. A node that does not compile
 * breaks every workflow that links it, so it must not land.
 *
 * The test reads `src/nodes/` itself, so it also checks a node that is not in
 * the generated sources yet.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { compile } from '../../compiler/index.ts';
import { PACKAGE_ROOT } from '../../__tests__/helpers.ts';

/** The library node sources by path (`nodes/<file>`), as scripts/generate-sources.ts lists them. */
function nodeSources(): Record<string, string> {
	const out: Record<string, string> = {};
	for (const dir of ['src/nodes', 'src/nodes/declarative']) {
		for (const entry of readdirSync(join(PACKAGE_ROOT, dir), { withFileTypes: true })) {
			if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts'))
				continue;
			const path = `${dir}/${entry.name}`;
			out[path.replace(/^src\//, '')] = readFileSync(join(PACKAGE_ROOT, path), 'utf8');
		}
	}
	return out;
}

const sources = nodeSources();
const files = Object.keys(sources).sort();

function typeOf(text: string): string | undefined {
	return /^\ttype: '([^']+)',$/m.exec(text)?.[1];
}

/** A workflow that links the library node of `type`. */
function workflowFor(type: string): string {
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'x' })],
	async run(ctx, trigger) {
		return await ctx.node({ name: 'Step', type: ${JSON.stringify(type)}, parameters: {}, items: [trigger.body] });
	},
});
`;
}

describe('library nodes', () => {
	it('has a node type in each source', () => {
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) expect(typeOf(sources[file]), file).toBeDefined();
	});

	it.each(files)('%s compiles with no diagnostic', (file) => {
		const type = typeOf(sources[file]) ?? '';
		const result = compile(workflowFor(type), { nodes: { [file]: sources[file] } });
		const messages = result.diagnostics.map(
			(d) => `${d.file}:${d.line}:${d.column} ${d.code} ${d.message}`,
		);
		expect(messages).toEqual([]);
	});

	it('fails for a node that uses a method outside the workflow library', () => {
		const file = 'nodes/http-request.ts';
		const broken = sources[file].replace(
			'export default defineNode',
			"const cut = 'a/b'.lastIndexOf('/');\nexport default defineNode",
		);
		const result = compile(workflowFor('n8n-nodes-base.httpRequest'), {
			nodes: { [file]: broken },
		});
		expect(result.diagnostics.map((d) => d.code)).toContain('WL020');
	});
});
