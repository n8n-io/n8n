/**
 * Coverage check: do our curated templates cover the patterns real users ask for?
 *
 * Uses the existing instance-ai eval prompt corpus as a held-out test set.
 * For each eval prompt, we extract a small keyword bag (filtered tokens from
 * the prompt + the prompt's structural tags) and look for any manifest entry
 * whose name+description+nodes+tags blob matches ≥2 keywords. Coverage = %
 * of prompts with at least one match.
 *
 * This is intentionally a smoke test — keyword overlap will miss semantic
 * matches and over-credit name overlap. The real signal lives in Phase 3
 * telemetry on `Builder template read`. Coverage just stops us shipping a
 * curated set with obvious gaps.
 *
 * Usage: pnpm criteria:coverage
 */
import * as fs from 'fs';
import * as path from 'path';

const MANIFEST_PATH = path.resolve(__dirname, '../examples/manifest.json');
const EVAL_DIR = path.resolve(__dirname, '../../instance-ai/evaluations/data/workflows');
const REPORT_PATH = path.resolve(__dirname, '../examples/_coverage-report.json');

const COVERAGE_TARGET = 0.7;
const MIN_KEYWORD_MATCHES = 3;

/**
 * Words too generic to be useful matches. We want integration names, action
 * verbs specific to a domain, and trigger types — not "send", "http", "node",
 * "data", which appear in nearly every workflow.
 */
const STOPWORDS = new Set([
	// Articles, conjunctions, prepositions
	'a',
	'an',
	'and',
	'are',
	'as',
	'at',
	'be',
	'but',
	'by',
	'for',
	'from',
	'has',
	'have',
	'i',
	'if',
	'in',
	'is',
	'it',
	'its',
	'me',
	'my',
	'of',
	'on',
	'or',
	'so',
	'the',
	'their',
	'them',
	'this',
	'that',
	'to',
	'was',
	'we',
	'were',
	'will',
	'with',
	'into',
	'over',
	'under',
	'they',
	'one',
	'two',
	'three',
	'been',
	'being',
	// Generic shape verbs
	'create',
	'use',
	'used',
	'using',
	'should',
	'can',
	'configure',
	'set',
	'setup',
	'send',
	'sent',
	'sends',
	'sending',
	'fetch',
	'fetches',
	'fetching',
	'do',
	'done',
	'add',
	'adds',
	'adding',
	'get',
	'got',
	'gets',
	'getting',
	'make',
	'makes',
	// Workflow-shape generic
	'workflow',
	'workflows',
	'node',
	'nodes',
	'data',
	'request',
	'response',
	'message',
	'messages',
	'item',
	'items',
	'value',
	'values',
	'field',
	'fields',
	'result',
	'results',
	'name',
	'names',
	'http',
	'https',
	'api',
	'url',
	'auth',
	'options',
	'parameters',
	'credentials',
	'credential',
	'output',
	'input',
	'call',
	'calls',
	'com',
	'org',
	'net',
	// Submission/contact tokens (too generic)
	'submit',
	'submitted',
	'submission',
	'submissions',
	'submits',
	'complete',
	'completely',
	'possible',
	'help',
	'please',
	'thanks',
	'don',
	'all',
	'every',
	'each',
	'when',
	'then',
	'how',
	'what',
	'about',
	'via',
	'out',
	'ask',
	// Single chars from contractions
	't',
	'm',
	's',
	're',
	've',
	'll',
	'd',
]);

interface ManifestWorkflow {
	id: number;
	slug: string;
	name: string;
	description: string;
	nodes: string[];
	tags: string[];
	triggerType: string;
	hasAI: boolean;
}

interface ManifestFile {
	workflows: ManifestWorkflow[];
}

interface EvalPrompt {
	prompt: string;
	complexity?: string;
	tags?: string[];
	triggerType?: string;
}

interface PromptCoverageResult {
	prompt_file: string;
	prompt: string;
	keywords: string[];
	matched: boolean;
	top_match: { slug: string; matches: number; matched_keywords: string[] } | null;
}

export function extractKeywords(text: string, extraTags: string[] = []): string[] {
	const tokens = text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, ' ')
		.split(/\s+/)
		.filter((t) => t.length >= 3 && !STOPWORDS.has(t));
	const tagTokens = extraTags
		.flatMap((t) => t.toLowerCase().split(/[-\s]+/))
		.filter((t) => t.length >= 3 && !STOPWORDS.has(t));
	const dedup = new Set<string>([...tokens, ...tagTokens]);
	return Array.from(dedup);
}

export function matchPrompt(
	keywords: string[],
	workflow: ManifestWorkflow,
): { matches: number; matchedKeywords: string[] } {
	const haystack = [
		workflow.name,
		workflow.description,
		workflow.nodes.join(' '),
		workflow.tags.join(' '),
		workflow.triggerType,
	]
		.join(' ')
		.toLowerCase();

	const matched: string[] = [];
	for (const k of keywords) {
		if (haystack.includes(k.toLowerCase())) matched.push(k);
	}
	return { matches: matched.length, matchedKeywords: matched };
}

function loadEvalPrompts(): Array<{ filename: string; data: EvalPrompt }> {
	if (!fs.existsSync(EVAL_DIR)) {
		throw new Error(`Eval directory not found at ${EVAL_DIR}`);
	}
	const files = fs.readdirSync(EVAL_DIR).filter((f) => f.endsWith('.json'));
	return files.map((f) => ({
		filename: f,
		data: JSON.parse(fs.readFileSync(path.join(EVAL_DIR, f), 'utf-8')) as EvalPrompt,
	}));
}

function loadManifest(): ManifestFile {
	if (!fs.existsSync(MANIFEST_PATH)) {
		throw new Error(
			`Manifest not found at ${MANIFEST_PATH}. Run \`pnpm regenerate-examples\` first.`,
		);
	}
	return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as ManifestFile;
}

function main() {
	const manifest = loadManifest();
	const prompts = loadEvalPrompts();

	const results: PromptCoverageResult[] = [];
	for (const { filename, data } of prompts) {
		const keywords = extractKeywords(data.prompt, data.tags ?? []);
		let bestMatch: { slug: string; matches: number; matched_keywords: string[] } | null = null;
		for (const wf of manifest.workflows) {
			const m = matchPrompt(keywords, wf);
			if (m.matches >= MIN_KEYWORD_MATCHES) {
				if (!bestMatch || m.matches > bestMatch.matches) {
					bestMatch = { slug: wf.slug, matches: m.matches, matched_keywords: m.matchedKeywords };
				}
			}
		}
		results.push({
			prompt_file: filename,
			prompt: data.prompt.slice(0, 200),
			keywords,
			matched: bestMatch !== null,
			top_match: bestMatch,
		});
	}

	const covered = results.filter((r) => r.matched).length;
	const ratio = covered / results.length;

	const report = {
		generatedAt: new Date().toISOString(),
		total_prompts: results.length,
		covered,
		uncovered: results.length - covered,
		coverage: Number(ratio.toFixed(3)),
		target: COVERAGE_TARGET,
		passed: ratio >= COVERAGE_TARGET,
		results,
	};

	fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

	console.log(
		`Coverage: ${covered}/${results.length} (${(ratio * 100).toFixed(0)}%) — target ${(COVERAGE_TARGET * 100).toFixed(0)}%`,
	);
	console.log(`Status: ${ratio >= COVERAGE_TARGET ? 'PASS' : 'TUNE'}`);
	console.log(`Wrote ${path.relative(process.cwd(), REPORT_PATH)}\n`);

	const uncovered = results.filter((r) => !r.matched);
	if (uncovered.length > 0) {
		console.log('Uncovered prompts:');
		for (const r of uncovered) {
			console.log(`  - ${r.prompt_file}: "${r.prompt.slice(0, 80)}..."`);
		}
	}
}

if (require.main === module) {
	try {
		main();
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}
