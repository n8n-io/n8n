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
import { emitAsync, emitExpression, emitHelpers } from './emit.ts';

/** The workflow source of a translated Code node. */
export function harnessSource(
	t: Translation,
	mode: 'all' | 'each',
	plainInput = false,
	traced?: Translation,
): string {
	const lists = t.nodes.map((_, k) => `trigger.body.nodes[${k}]`);
	const all = t.allNodes.map((_, k) => `trigger.body.all[${k}]`);
	// Code that makes requests is an async function; its \`http\` step has the name \`code\`.
	const parts = t.usesHttp
		? emitAsync(
				t,
				mode,
				{ fn: 'runCode', step: 'code' },
				'trigger.body.input',
				lists,
				all,
				plainInput,
				traced,
			)
		: {
				declaration: '',
				expression: emitExpression(t, mode, 'trigger.body.input', lists, all, plainInput, traced),
			};
	const expr = parts.expression;
	return `import { webhook, workflow } from '@n8n/workflow-lang';

type Json = any;

export default workflow({
	triggers: [webhook<Json>({ path: 'code' })],${t.zones.size > 0 ? `\n\tzones: ${JSON.stringify([...t.zones])},` : ''}
	async run(ctx, trigger) {
		// The engine shape names the run index of a node \`runIndex\`.
		const runIndex: number = 0;
		${parts.declaration}
		const out: Json[] = ${expr};
		return out;
	},
});

${helperSources(emitHelpers(t, mode, plainInput, traced)).join('\n\n')}
`;
}

export type CheckResult =
	| { ok: true; compiled: CompileResult; source: string }
	| { ok: false; blockers: Blocker[] };

/**
 * Compiles the harness. Compiler diagnostics become blockers. `plainInput` gives the form
 * that reads the input list without a copy (`emit.ts`).
 */
export function checkTranslation(
	t: Translation,
	mode: 'all' | 'each',
	plainInput = false,
	traced?: Translation,
): CheckResult {
	const source = harnessSource(t, mode, plainInput, traced);
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
