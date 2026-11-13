/**
 * Compiles a native Code node expression on its own, in a small workflow
 * whose trigger body gives the input list and the lists of other nodes. The
 * converter uses it to decide between the native form and the host step.
 * The equivalence tests run the same workflow.
 */
import { compile } from '../../compiler/index.ts';
import type { CompileResult } from '../../compiler/index.ts';
import { issueOf, withoutTypeNoise } from '../../legacy/index.ts';
import { helperSources } from '../helpers.ts';
import type { Blocker, Translation } from './translate.ts';
import { emitExpression, emitHelpers } from './emit.ts';

/** The workflow source of a translated Code node. */
export function harnessSource(t: Translation, mode: 'all' | 'each'): string {
	const lists = t.nodes.map((_, k) => `trigger.body.nodes[${k}]`);
	const all = t.allNodes.map((_, k) => `trigger.body.all[${k}]`);
	const expr = emitExpression(t, mode, 'trigger.body.input', lists, all);
	return `import { webhook, workflow } from '@n8n/workflow-lang';

type Json = any;

export default workflow({
	triggers: [webhook<Json>({ path: 'code' })],${t.zones.size > 0 ? `\n\tzones: ${JSON.stringify([...t.zones])},` : ''}
	async run(ctx, trigger) {
		// The engine shape names the run index of a node \`runIndex\`.
		const runIndex: number = 0;
		const out: Json[] = ${expr};
		return out;
	},
});

${helperSources(emitHelpers(t)).join('\n\n')}
`;
}

export type CheckResult =
	| { ok: true; compiled: CompileResult; source: string }
	| { ok: false; blockers: Blocker[] };

/** Compiles the harness. Compiler diagnostics become blockers. */
export function checkTranslation(t: Translation, mode: 'all' | 'each'): CheckResult {
	const source = harnessSource(t, mode);
	const compiled = compile(source, { nodes: {} });
	if (compiled.ok) return { ok: true, compiled, source };
	const issues = withoutTypeNoise(compiled.diagnostics.map(issueOf));
	const blockers: Blocker[] = [];
	for (const i of issues) {
		const feature = i.feature === 'WL020' ? `WL020 ${i.message}` : i.feature;
		if (!blockers.some((b) => b.feature === feature)) {
			blockers.push({ feature, message: `${i.code} ${i.message}` });
		}
	}
	return { ok: false, blockers };
}
