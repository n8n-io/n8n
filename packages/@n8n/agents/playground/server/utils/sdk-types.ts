import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let cachedSdk: string | undefined;
let cachedZod: string | undefined;

const strip = (src: string) =>
	src
		.replace(/^import\s+.*;\s*$/gm, '')
		.replace(/^export\s*\{\s*\}\s*;\s*$/gm, '')
		.replace(/^export declare/gm, 'export')
		.trim();

/**
 * Read the real @n8n/agents .d.ts files from dist/ and bundle them into
 * a single declaration string. Used by both the /api/types endpoint (for
 * Monaco) and the builder agent (for its system prompt).
 */
export function getSdkTypeDeclarations(): string {
	if (cachedSdk) return cachedSdk;

	const distDir = join(process.cwd(), '..', 'dist');

	const fileNames = [
		'types/agent.d.ts',
		'types/tool.d.ts',
		'types/eval.d.ts',
		'types/event.d.ts',
		'types/guardrail.d.ts',
		'types/memory.d.ts',
		'types/provider.d.ts',
		'types/stream.d.ts',
		'types/tool.d.ts',
		'agent.d.ts',
		'evaluate.d.ts',
		'network.d.ts',
		'tool.d.ts',
		'message.d.ts',
	];

	const sections = fileNames.map((name) => {
		const content = readFileSync(join(distDir, name), 'utf-8');
		return `  // --- ${name} ---\n  ${strip(content).split('\n').join('\n  ')}`;
	});

	// Add the evals namespace manually — it's a re-export namespace that
	// can't be bundled from individual .d.ts files.
	const evalsNamespace = `  // --- evals namespace ---
  export namespace evals {
    function correctness(): Eval;
    function helpfulness(): Eval;
    function stringSimilarity(): Eval;
    function categorization(): Eval;
    function containsKeywords(): Eval;
    function jsonValidity(): Eval;
    function toolCallAccuracy(): Eval;
  }`;

	cachedSdk = `declare module '@n8n/agents' {\n  import type { z } from 'zod';\n\n${sections.join('\n\n')}\n\n${evalsNamespace}\n}`;

	return cachedSdk;
}

/**
 * Read the real zod .d.ts files from node_modules and bundle them into
 * a single ambient module declaration for Monaco.
 */
export function getZodTypeDeclarations(): string {
	if (cachedZod) return cachedZod;

	const zodDir = join(process.cwd(), 'node_modules', 'zod', 'dist', 'types', 'v3');

	try {
		// Read all .d.ts files in the zod v3 types directory
		const files = readdirSync(zodDir).filter((f) => f.endsWith('.d.ts'));
		const sections = files.map((name) => {
			const content = readFileSync(join(zodDir, name), 'utf-8');
			return strip(content);
		});

		// Wrap in a declare module block
		cachedZod = `declare module 'zod' {\n  ${sections.filter(Boolean).join('\n\n  ')}\n}`;
	} catch {
		// Fallback if zod types can't be read
		cachedZod = `declare module 'zod' { export const z: any; }`;
	}

	return cachedZod;
}
