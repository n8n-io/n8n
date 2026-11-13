/**
 * Converts a v1 n8n workflow (`{ nodes, connections, settings }`) to a
 * workflow-language source file. `generator.ts` writes the source; see its
 * header for the two shapes of a workflow body (flat lists, or the v1 run
 * stack for loops).
 *
 * The converter compiles the result. When the compiler rejects a translated
 * expression, the converter marks the expression as failed and converts
 * again, so the node can fall back to the host or fail with the reason.
 */
import { compile } from '../compiler/index.ts';
import type { LegacyIssue } from '../legacy/index.ts';
import { issueOf } from '../legacy/index.ts';
import type { ConvertOptions, Round } from './generator.ts';
import { diagnosticKey, ModuleGenerator, readWorkflow } from './generator.ts';
import type { ConvertDiagnostic, ConvertResult } from './types.ts';

export type { ConvertDiagnostic, ConvertResult, N8nWorkflow } from './types.ts';
export type { ConvertOptions } from './generator.ts';

const MAX_ROUNDS = 16;

/** The default time budget of one conversion. */
const BUDGET_MS = 60_000;

/** The largest generated source that the converter compiles. */
const MAX_SOURCE_CHARS = 32 * 1024 * 1024;

const failed = (code: string, message: string): ConvertResult => ({
	ok: false,
	source: '',
	diagnostics: [{ severity: 'error', code, message }],
	fallbackNodes: [],
});

/**
 * Converts parsed workflow JSON. The result has the source, the diagnostics,
 * and `ok: false` when a diagnostic is an error.
 */
export function convertWorkflow(input: unknown, options: ConvertOptions = {}): ConvertResult {
	const wf = readWorkflow(input);
	if (typeof wf === 'string') {
		return {
			ok: false,
			source: '',
			diagnostics: [{ severity: 'error', code: 'input', message: wf }],
			fallbackNodes: [],
		};
	}
	const known = new Map<string, LegacyIssue[]>();
	const broken = new Map<string, { code: string; message: string }>();
	// Native Code nodes whose code the compiler rejects run in the host on the next round.
	const codeHost = new Map<string, string>();
	let round: Round | string = '';
	const extra: ConvertDiagnostic[] = [];
	// A pathological workflow fails with a diagnostic, not a hung process.
	const started = Date.now();
	const budgetMs = options.budgetMs ?? BUDGET_MS;
	for (let r = 0; r < MAX_ROUNDS; r++) {
		if (r > 0 && Date.now() - started > budgetMs) {
			return failed('budget', `The conversion took more than ${budgetMs} ms.`);
		}
		try {
			const hostCodeNodes = [...(options.hostCodeNodes ?? []), ...codeHost.keys()];
			round = new ModuleGenerator(wf, known, broken, { ...options, hostCodeNodes }).generate();
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return {
				ok: false,
				source: '',
				diagnostics: [{ severity: 'error', code: 'input', message }],
				fallbackNodes: [],
			};
		}
		if (typeof round === 'string') {
			const code = round.includes('loop')
				? 'loop'
				: round.includes('trigger')
					? 'no-trigger'
					: 'input';
			return {
				ok: false,
				source: '',
				diagnostics: [{ severity: 'error', code, message: round }],
				fallbackNodes: [],
			};
		}
		if (round.source.length > MAX_SOURCE_CHARS) {
			return failed('budget', `The generated source has more than ${MAX_SOURCE_CHARS} characters.`);
		}
		let compiled: ReturnType<typeof compile>;
		try {
			compiled = compile(round.source, { fileName: '/workflow.ts' });
		} catch (e) {
			// For example a stack overflow on a deep expression: a diagnostic, not a crash.
			return failed(
				'compile',
				`The compiler failed: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
		// Errors outside node blocks belong to this round only.
		extra.length = 0;
		if (compiled.ok) break;
		let progress = false;
		for (const d of compiled.diagnostics) {
			const hit =
				d.file === '/workflow.ts'
					? round.ranges.find((x) => d.start >= x.start && d.start < x.end)
					: undefined;
			if (hit) {
				const key = diagnosticKey(hit.node, hit.path);
				const issue = issueOf(d);
				const list = known.get(key) ?? [];
				if (!list.some((i) => i.message === issue.message)) {
					known.set(key, [...list, issue]);
					progress = true;
				}
			} else if (
				d.file === '/workflow.ts' &&
				round.blocks.some((b) => d.line >= b.from && d.line < b.to)
			) {
				const block = round.blocks.find((b) => d.line >= b.from && d.line < b.to);
				const native = block !== undefined && isNativeCode(round.source, block);
				if (block && native && codeHost.has(block.node)) {
					// Already moved to the host: the next round writes the host step.
				} else if (block && native) {
					codeHost.set(block.node, `${d.code} ${d.message}`);
					progress = true;
				} else if (block && !broken.has(block.node)) {
					broken.set(
						block.node,
						d.code === 'WL060'
							? {
									code: 'library-operation',
									message: `${d.message} A library type cannot run in the fallback host.`,
								}
							: {
									code: 'compile',
									message: `The generated code of the node does not compile: ${d.code} ${d.message}`,
								},
					);
					progress = true;
				}
			} else {
				extra.push({
					severity: 'error',
					code: 'compile',
					message: `The generated source does not compile: ${d.code} ${d.message} (line ${d.line})`,
				});
			}
		}
		if (!progress) break;
		if (r === MAX_ROUNDS - 1) {
			extra.push({
				severity: 'error',
				code: 'compile',
				message: 'The generated source does not compile after several rounds.',
			});
		}
	}
	if (typeof round === 'string')
		return { ok: false, source: '', diagnostics: [], fallbackNodes: [] };
	const diagnostics = [...round.diagnostics, ...extra];
	for (const [node, message] of codeHost) {
		diagnostics.push({
			severity: 'info',
			code: 'code-host',
			node,
			message: `The code runs in the fallback host: the compiler rejects its native form (${message}).`,
		});
	}
	return {
		ok: !diagnostics.some((d) => d.severity === 'error'),
		source: round.source,
		diagnostics,
		fallbackNodes: round.fallbackNodes,
		credentials: round.credentials,
	};
}

/** True when the lines of a node block hold a native Code node (`code-native/emit.ts`). */
function isNativeCode(source: string, block: { from: number; to: number }): boolean {
	const lines = source.split('\n').slice(block.from - 1, block.to - 1);
	return lines.some((l) => l.includes('codeItems(')) && !lines.some((l) => l.includes('ctx.code('));
}

/** One line of text for a diagnostic. */
export function formatConvertDiagnostic(d: ConvertDiagnostic): string {
	const where = d.node ? ` [${d.node}${d.parameter ? ` › ${d.parameter}` : ''}]` : '';
	return `${d.severity} ${d.code}${where}: ${d.message}`;
}
