/**
 * Writes one module for each library-node equivalence case to a folder.
 * `wfrt aot-gen` compiles the library and prelude functions of these
 * modules to Zig (workflow-runtime/src/core/aot.zig):
 *
 *   node scripts/aot-modules.ts <dir> [node-type-pattern]
 *   wfrt aot-gen src/core/aot_gen.zig <dir>/*.wfm
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { compile } from '../src/compiler/index.ts';
import { EQUIVALENCE_CASES } from '../src/nodes/__tests__/equivalence-cases.ts';

const [dir, pattern] = process.argv.slice(2);
if (!dir) {
	console.error('usage: node scripts/aot-modules.ts <dir> [node-type-pattern]');
	process.exit(2);
}
const match = new RegExp(pattern ?? '.', 'i');
mkdirSync(dir, { recursive: true });
let written = 0;
for (const [i, c] of EQUIVALENCE_CASES.entries()) {
	if (!match.test(c.type)) continue;
	const credentials = c.credential
		? `credentials: { c: { type: ${JSON.stringify(c.credential.type)} } },`
		: '';
	const source = `import { webhook, workflow } from '@n8n/workflow-lang';
export default workflow({
	triggers: [webhook({ path: 'aot' })],
	${credentials}
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: ${JSON.stringify(c.type)},
			typeVersion: ${c.typeVersion},
			parameters: ${JSON.stringify(c.parameters)},
			${c.items ? `items: ${JSON.stringify(c.items)},` : ''}
			${c.credential ? "credential: 'c'," : ''}
		});
	},
});
`;
	const out = compile(source);
	if (!out.module) {
		console.error(`${c.name}: ${out.diagnostics.map((d) => d.message).join('; ')}`);
		process.exit(1);
	}
	writeFileSync(join(dir, `${String(i).padStart(4, '0')}.wfm`), out.module);
	written++;
}
console.log(`${written} modules in ${dir}`);
