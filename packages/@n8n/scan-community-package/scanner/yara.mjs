import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import init, { Compiler } from '@virustotal/yara-x';

/**
 * Scans an extracted package with YARA malware-detection rules, using YARA-X
 * compiled to WebAssembly (@virustotal/yara-x): no Python, no Docker, no native
 * module, so the scanner stays a single `npx` for node authors and CI alike.
 *
 * The ruleset is GuardDog's (github.com/DataDog/guarddog, Apache-2.0),
 * vendored under ./rules/guarddog. GuardDog itself is a Python tool and does
 * not run here; only its YARA rules do. Verified against `guarddog npm scan`
 * on real community packages with identical rule hits.
 *
 * Only `threat-*` rules count as findings. `capability-*` rules describe what
 * the code can do (network, fs, spawn) and are informational. GuardDog's
 * registry-metadata heuristics (typosquatting, provenance regression, …) are
 * Python and not ported.
 */

const RULES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'rules', 'guarddog');
const RULES_VERSION = fs.readFileSync(path.join(RULES_DIR, 'VERSION'), 'utf8').trim();
/** Upstream source of a rule: the patterns it matches and the reasoning behind them. */
const ruleUrl = (rule) =>
	`https://github.com/DataDog/guarddog/blob/${RULES_VERSION}/guarddog/analyzer/sourcecode/${rule}.yar`;

const globToRegExp = (glob) =>
	new RegExp(
		`^${glob
			.trim()
			.replace(/[.+^${}()|[\]\\]/g, '\\$&')
			.replace(/\*/g, '.*')}$`,
	);

let compiled;

/** Compiles the vendored rules once. Exported so tests can assert they all build. */
export const loadRules = async () => {
	if (compiled) return compiled;

	const require = createRequire(import.meta.url);
	const wasmPath = path.join(
		path.dirname(require.resolve('@virustotal/yara-x')),
		'yara_x_js_bg.wasm',
	);
	// The package's init() is written for browsers and fetch()es the wasm file.
	await init({ module_or_path: fs.readFileSync(wasmPath) });

	const compiler = new Compiler();
	const ruleNames = new Set();

	for (const file of fs.readdirSync(RULES_DIR).filter((f) => f.endsWith('.yar'))) {
		let source = fs.readFileSync(path.join(RULES_DIR, file), 'utf8');
		// Read the rule's own name before inlining includes, or a helper rule from
		// the included file would be the first `rule` in the text.
		ruleNames.add(/^rule\s+(\w+)/m.exec(source)[1]);
		source = source.replace(/^include\s+"([^"]+)"\s*$/gm, (_, included) =>
			fs.readFileSync(path.join(RULES_DIR, included), 'utf8'),
		);
		compiler.addSource(source);
	}

	compiled = { rules: compiler.build(), ruleNames };
	return compiled;
};

const metadataOf = (match) =>
	Object.fromEntries(match.metadata.map((m) => [m.identifier, m.value]));

const appliesTo = (metadata, relativePath) => {
	const include = metadata.path_include?.split(',').map(globToRegExp);
	const exclude = metadata.path_exclude?.split(',').map(globToRegExp) ?? [];
	const base = path.basename(relativePath);
	const matches = (patterns) => patterns.some((re) => re.test(relativePath) || re.test(base));
	return (!include || matches(include)) && !matches(exclude);
};

/** Line number and trimmed line text at a byte offset, for pointing at the match. */
const lineAt = (content, offset) => {
	const before = content.subarray(0, offset).toString('utf8');
	const line = before.split('\n').length;
	const start = before.lastIndexOf('\n') + 1;
	const end = content.indexOf('\n', offset);
	const text = content
		.subarray(start, end === -1 ? undefined : end)
		.toString('utf8')
		.trim();
	return { line, text: text.length > 160 ? `${text.slice(0, 157)}...` : text };
};

function* walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else if (entry.isFile()) yield full;
	}
}

export const formatYaraFindings = (findings) =>
	findings
		.map((f) =>
			[
				`${f.file}:${f.line}  ${f.rule}`,
				f.text && `    ${f.text}`,
				`    ${f.message}`,
				`    Rule: ${f.url}`,
			]
				.filter(Boolean)
				.join('\n'),
		)
		.join('\n\n');

/**
 * @param {string} packageDir extracted tarball contents (the `package/` root)
 * @returns {Promise<{ passed: boolean, summary: string, message?: string, details?: string, findings: Array<{ rule, file, line, text, message, url }> }>}
 */
export const runYaraRules = async (packageDir) => {
	const { rules, ruleNames } = await loadRules();
	const findings = [];

	for (const file of walk(packageDir)) {
		const relativePath = path.relative(packageDir, file).split(path.sep).join('/');
		const content = fs.readFileSync(file);

		for (const match of rules.scan(content).matches) {
			// Helper rules pulled in via `include` are not findings.
			if (!ruleNames.has(match.identifier)) continue;
			const rule = match.identifier.replace(/_/g, '-');
			if (!rule.startsWith('threat-')) continue;

			// The rules' path globs (e.g. `*/package.json`) were written for GuardDog,
			// which scans the tarball, whose paths start with `package/`.
			const metadata = metadataOf(match);
			if (!appliesTo(metadata, `package/${relativePath}`)) continue;

			const firstOffset = match.patterns
				.flatMap((p) => p.matches)
				.map((m) => m.offset)
				.sort((a, b) => a - b)[0];
			const { line, text } =
				firstOffset === undefined ? { line: 1, text: '' } : lineAt(content, firstOffset);
			findings.push({
				rule,
				file: relativePath,
				line,
				text,
				message: metadata.description ?? rule,
				url: ruleUrl(rule),
			});
		}
	}

	const summary = `${findings.length} finding${findings.length === 1 ? '' : 's'}`;
	return findings.length > 0
		? {
				passed: false,
				summary,
				message: 'YARA rule matches',
				details: formatYaraFindings(findings),
				findings,
			}
		: { passed: true, summary: 'no findings', findings };
};
