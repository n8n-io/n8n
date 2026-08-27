/**
 * Validates `cubic.yaml` against cubic's published schema and the limits it
 * enforces silently.
 *
 * cubic drops custom rules past the agent cap and truncates any rule past the
 * character ceiling without reporting either, and it never resolves a repo path
 * mentioned in prose — only `file_paths` entries. A rule that trips any of these
 * simply stops running, which is invisible until someone counts review comments.
 *
 * The schema is vendored rather than fetched so the check has no network
 * dependency. `--refresh` pulls the current copy from cubic.dev and exits without
 * validating — a refreshed schema that rejects the config should surface as a red
 * check on the refresh PR, not as a failure that stops the PR being opened.
 *
 * Exit codes:
 *   0 – config is valid
 *   1 – config has at least one violation
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';
import { parse } from 'yaml';

/** https://docs.cubic.dev/ai-review/custom-agents — only the first N agents take effect. */
export const MAX_CUBIC_AGENTS = 5;

/** Description plus linked file contents; characters past this are dropped from the prompt. */
export const MAX_RULE_CHARS = 10_000;

/** Fraction of the ceiling at which a rule is reported as close to silent truncation. */
export const WARN_RATIO = 0.8;

/** Every markdown file here must be linked by some agent, or it silently does nothing. */
export const RULES_DIR = '.agents/review-rules';

/** Vendored copy of the schema the `# yaml-language-server:` directive points at. */
export const SCHEMA_PATH = '.github/scripts/quality/cubic-config.schema.json';

export const SCHEMA_URL = 'https://www.cubic.dev/schema/cubic-repository-config.schema.json';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Characters, not bytes — cubic's ceiling is a character count, and a byte count
 * overstates it for any non-ASCII content (an em dash is 3 bytes, one character).
 * `.length` counts UTF-16 code units, matching how the description is measured.
 *
 * @param {string} path - repo-relative
 * @returns {number} character count, or -1 when the path does not resolve
 */
export function fileCharacters(path) {
	try {
		return readFileSync(join(REPO_ROOT, path), 'utf8').length;
	} catch {
		return -1;
	}
}

/**
 * Validate against cubic's own schema. Catches what the hand-written checks below
 * cannot: a mistyped key inside `reviews` / `pr_descriptions` / `issues` (all
 * `additionalProperties: false`), a bad enum value, a wrong type.
 *
 * @param {unknown} config
 * @param {object} schema
 * @returns {string[]}
 */
export function schemaErrors(config, schema) {
	const ajv = new Ajv({ allErrors: true, strict: false });
	const validate = ajv.compile(schema);
	if (validate(config)) return [];

	return (validate.errors ?? []).map((error) => {
		const path = error.instancePath || '/';
		const { allowedValues, additionalProperty } = error.params ?? {};

		if (additionalProperty) {
			return `${path} has an unknown key \`${additionalProperty}\`.`;
		}

		const allowed = allowedValues ? ` (allowed: ${allowedValues.join(', ')})` : '';
		return `${path} ${error.message}${allowed}`;
	});
}

/**
 * Markdown rule files on disk, repo-relative, excluding the README.
 *
 * @returns {string[]}
 */
function ruleFiles() {
	try {
		return readdirSync(join(REPO_ROOT, RULES_DIR), { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
			.map((entry) => relative(REPO_ROOT, join(entry.parentPath, entry.name)))
			.sort();
	} catch {
		return [];
	}
}

/**
 * @param {any} config - parsed cubic.yaml
 * @param {(path: string) => number} charsIn - characters in a linked file, -1 if missing
 * @param {string[]} [onDisk] - rule files that must each be linked by some agent
 * @returns {{ violations: string[], warnings: string[], ruleLengths: Record<string, number> }}
 */
export function checkConfig(config, charsIn, onDisk = []) {
	const violations = [];
	/** @type { string[] } */
	const warnings = [];
	/** @type { Record<string, number> } */
	const ruleLengths = {}
	const linked = new Set();

	if (config?.version !== 1) {
		violations.push(`\`version\` must be 1, found ${JSON.stringify(config?.version)}.`);
	}

	const rules = config?.reviews?.custom_rules ?? [];
	if (!Array.isArray(rules)) {
		violations.push('`reviews.custom_rules` must be a list.');
		return { violations, warnings, ruleLengths };
	}

	if (rules.length > MAX_CUBIC_AGENTS) {
		const dropped = rules.slice(MAX_CUBIC_AGENTS).map((rule) => rule?.name ?? '(unnamed)');
		violations.push(
			`${rules.length} custom rules defined but only the first ${MAX_CUBIC_AGENTS} take effect. ` +
				`These never run: ${dropped.join(', ')}. Merge related rules instead of appending.`,
		);
	}

	rules.forEach((rule, index) => {
		const label = rule?.name ? `"${rule.name}"` : `rule #${index + 1}`;

		if (!rule?.name) {
			violations.push(`${label} has no \`name\`.`);
		}

		const description = rule?.description ?? '';
		const filePaths = rule?.file_paths ?? [];

		if (!description && filePaths.length === 0) {
			violations.push(`${label} needs a \`description\`, \`file_paths\`, or both.`);
		}

		let total = description.length;
		for (const path of filePaths) {
			linked.add(path);
			const chars = charsIn(path);
			if (chars < 0) {
				violations.push(`${label} links \`${path}\`, which does not exist.`);
				continue;
			}
			total += chars;
		}

		if (total > MAX_RULE_CHARS) {
			violations.push(
				`${label} is ${total.toLocaleString()} characters; everything past ` +
					`${MAX_RULE_CHARS.toLocaleString()} is dropped from the review prompt.`,
			);
		} else if (total > MAX_RULE_CHARS * WARN_RATIO) {
			warnings.push(
				`${label} is at ${Math.round((total / MAX_RULE_CHARS) * 100)}% of the ` +
					`${MAX_RULE_CHARS.toLocaleString()}-character ceiling. Trim it before adding more.`,
			);
		}

		ruleLengths[label] = total
	});

	for (const path of onDisk) {
		if (!linked.has(path)) {
			violations.push(`\`${path}\` is not linked by any agent, so it is never applied.`);
		}
	}

	return { violations, warnings, ruleLengths };
}

async function refreshSchema() {
	const response = await fetch(SCHEMA_URL);
	if (!response.ok) {
		console.error(`Could not fetch ${SCHEMA_URL}: HTTP ${response.status}`);
		process.exit(1);
	}
	const schema = await response.json();
	writeFileSync(join(REPO_ROOT, SCHEMA_PATH), `${JSON.stringify(schema, null, '\t')}\n`);
	console.log(`Refreshed ${SCHEMA_PATH} from ${SCHEMA_URL}.`);
}

async function main() {
	if (process.argv.includes('--refresh')) {
		await refreshSchema();
		return;
	}

	const config = parse(readFileSync(join(REPO_ROOT, 'cubic.yaml'), 'utf8'));
	const schema = JSON.parse(readFileSync(join(REPO_ROOT, SCHEMA_PATH), 'utf8'));

	const { violations, warnings, ruleLengths } = checkConfig(config, fileCharacters, ruleFiles());
	violations.unshift(...schemaErrors(config, schema));

	console.log("Rule sizes:")
	for (const [label, ruleLength] of Object.entries(ruleLengths)) {
		console.log(`	${label}: ${ruleLength} characters (${Math.floor(ruleLength / MAX_RULE_CHARS * 100)}%)`);
	}

	for (const warning of warnings) {
		console.log(`::warning file=cubic.yaml::${warning}`);
	}

	if (violations.length === 0) {
		console.log(
			`cubic.yaml is valid (${config.reviews?.custom_rules?.length ?? 0}/${MAX_CUBIC_AGENTS} agents).`,
		);
		return;
	}

	for (const violation of violations) {
		console.log(`::error file=cubic.yaml::${violation}`);
	}
	process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
