/**
 * instance-ai-flavored codegen.
 *
 * Wraps `generateWorkflowCode()` to produce TypeScript that matches what the
 * instance-ai builder agent writes in its sandbox: a top `import` line, shared
 * credentials hoisted to top-level `const` declarations, and an optional JSDoc
 * header pulled from manifest metadata.
 *
 * Why dedup credentials: real-world workflows often reference the same credential
 * id from multiple nodes. The default codegen emits the same `newCredential('Name',
 * 'id')` literal at every callsite, which is structurally correct but obscures the
 * "these nodes share a credential" pattern. Hoisting makes it explicit.
 */
// Import from source module to avoid the codegen/index.ts barrel cycle.
import { generateCode } from './code-generator';
import { buildCompositeTree } from './composite-builder';
import { annotateGraph } from './graph-annotator';
import { buildSemanticGraph } from './semantic-graph';
import type { WorkflowJSON } from '../types/base';

function generateWorkflowCode(workflow: WorkflowJSON): string {
	const graph = buildSemanticGraph(workflow);
	annotateGraph(graph);
	const tree = buildCompositeTree(graph);
	return generateCode(tree, workflow, graph, {});
}

/**
 * SDK functions a workflow file may call. Order matters only for tidiness.
 *
 * A drift test (`emit-instance-ai.test.ts`) asserts this list stays in sync with the
 * function exports of `@n8n/workflow-sdk`. When you add or remove a function export,
 * the test will fail until the new name is placed either here (if a workflow file
 * may call it) or in the test's intentional-exclusion list (if it's a utility).
 */
export const SDK_FUNCTIONS = [
	'workflow',
	'trigger',
	'node',
	'sticky',
	'placeholder',
	'merge',
	'ifElse',
	'switchCase',
	'newCredential',
	'languageModel',
	'memory',
	'tool',
	'outputParser',
	'embedding',
	'embeddings',
	'vectorStore',
	'retriever',
	'documentLoader',
	'textSplitter',
	'fromAi',
	'splitInBatches',
	'nextBatch',
	'expr',
] as const;

export interface EmitInstanceAiOptions {
	/**
	 * Optional JSDoc header to prepend (already wrapped in a comment block).
	 * Typically built from the curation manifest entry.
	 */
	jsdocHeader?: string;
}

/**
 * Generate a workflow .ts file matching the shape the instance-ai builder agent writes.
 *
 * Returns a single string containing: optional JSDoc header, single import line,
 * hoisted shared credentials, and the workflow body.
 */
export function emitInstanceAi(workflow: WorkflowJSON, opts: EmitInstanceAiOptions = {}): string {
	const body = generateWorkflowCode(workflow);
	const dedupedBody = hoistSharedCredentials(body);
	const importLine = buildImports(dedupedBody);

	const sections: string[] = [];
	if (opts.jsdocHeader) sections.push(opts.jsdocHeader.trim());
	if (importLine) sections.push(importLine);
	sections.push(dedupedBody);

	return sections.join('\n\n') + '\n';
}

/**
 * Build the single SDK import line by detecting which functions appear in the body.
 * Looks for `name(` to avoid false positives from substring matches.
 */
export function buildImports(body: string): string {
	const used: string[] = [];
	for (const fn of SDK_FUNCTIONS) {
		if (containsCall(body, fn)) used.push(fn);
	}
	if (used.length === 0) return '';
	return `import { ${used.join(', ')} } from '@n8n/workflow-sdk';`;
}

function containsCall(body: string, fnName: string): boolean {
	// `\bname\(` — word-boundary anchored to avoid matching `mynewCredential(`
	const pattern = new RegExp(`\\b${fnName}\\(`);
	return pattern.test(body);
}

/**
 * Find every `newCredential('Name', 'id')` invocation, group by literal args,
 * and for groups with ≥2 occurrences hoist a `const xCred = newCredential(...)`
 * declaration above the workflow body and replace each occurrence with the const.
 *
 * Single-use credentials are left inline (current codegen behavior) — hoisting them
 * adds noise without readability gain.
 */
export function hoistSharedCredentials(body: string): string {
	// Two-arg form. Single-arg `newCredential('X')` is rare in real templates and
	// already concise enough; deduping it provides little benefit.
	const callPattern = /newCredential\('([^'\\]*)',\s*'([^'\\]*)'\)/g;

	const groups = new Map<string, { match: string; name: string; id: string; count: number }>();
	let m: RegExpExecArray | null;
	while ((m = callPattern.exec(body)) !== null) {
		const [match, name, id] = m;
		const key = `${name}::${id}`;
		const existing = groups.get(key);
		if (existing) {
			existing.count++;
		} else {
			groups.set(key, { match, name, id, count: 1 });
		}
	}

	const usedNames = collectExistingIdentifiers(body);
	const hoists: string[] = [];
	let result = body;

	// Hoist in stable order: by first-occurrence position in the body
	const dedupable = Array.from(groups.values())
		.filter((g) => g.count >= 2)
		.sort((a, b) => body.indexOf(a.match) - body.indexOf(b.match));

	for (const group of dedupable) {
		const constName = uniqueConstName(group.name, usedNames);
		hoists.push(`const ${constName} = ${group.match};`);
		// Exact-string replace; the match is a literal newCredential(...) call
		result = splitJoin(result, group.match, constName);
	}

	if (hoists.length === 0) return body;
	return `${hoists.join('\n')}\n\n${result}`;
}

function splitJoin(haystack: string, needle: string, replacement: string): string {
	return haystack.split(needle).join(replacement);
}

/**
 * Build a deterministic, readable `const` name from a credential display name.
 * `'OpenAI account'` → `openAiAccountCred`. Suffixes a number on collision.
 */
export function uniqueConstName(credName: string, used: Set<string>): string {
	const sanitised = credName
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	let camel: string;
	if (sanitised.length === 0) {
		camel = 'shared';
	} else {
		camel =
			sanitised[0].charAt(0).toLowerCase() +
			sanitised[0].slice(1) +
			sanitised
				.slice(1)
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
				.join('');
	}

	const base = `${camel}Cred`;
	let candidate = base;
	let i = 1;
	while (used.has(candidate)) {
		i++;
		candidate = `${base}${i}`;
	}
	used.add(candidate);
	return candidate;
}

/**
 * Collect identifier-shaped tokens already present in the body so newly hoisted
 * `const` names don't shadow existing locals.
 */
function collectExistingIdentifiers(body: string): Set<string> {
	const ids = new Set<string>();
	const pattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
	let m: RegExpExecArray | null;
	while ((m = pattern.exec(body)) !== null) ids.add(m[1]);
	return ids;
}
