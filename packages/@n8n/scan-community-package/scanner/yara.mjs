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

const RULES_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'rules');

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

	const rulesets = fs
		.readdirSync(RULES_ROOT, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => e.name);
	for (const ruleset of rulesets) {
		const dir = path.join(RULES_ROOT, ruleset);
		for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.yar'))) {
			let source = fs.readFileSync(path.join(dir, file), 'utf8');
			// Read the rule's own name before inlining includes, or a helper rule from
			// the included file would be the first `rule` in the text.
			ruleNames.add(/^rule\s+(\w+)/m.exec(source)[1]);
			source = source.replace(/^include\s+"([^"]+)"\s*$/gm, (_, included) =>
				fs.readFileSync(path.join(dir, included), 'utf8'),
			);
			compiler.addSource(source);
		}
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

/** 1-based line and column of a byte offset. */
const positionAt = (content, offset) => {
	const before = content.subarray(0, offset).toString('utf8');
	const line = before.split('\n').length;
	const column = before.length - before.lastIndexOf('\n');
	return { line, column };
};

function* walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else if (entry.isFile()) yield full;
	}
}

/** Same shape as ESLint's "stylish" formatter, so all checks read alike. */
export const formatYaraFindings = (findings) => {
	const byFile = Map.groupBy(findings, (f) => f.file);
	const width = (values) => Math.max(...values.map((v) => v.length));
	const blocks = [...byFile].map(([file, rows]) => {
		const pos = rows.map((f) => `${f.line}:${f.column}`);
		const msg = rows.map((f) => f.message);
		const lines = rows.map(
			(f, i) => `  ${pos[i].padStart(width(pos))}  error  ${msg[i].padEnd(width(msg))}  ${f.rule}`,
		);
		return `${file}\n${lines.join('\n')}`;
	});
	const n = findings.length;
	return `${blocks.join('\n\n')}\n\n\u2716 ${n} problem${n === 1 ? '' : 's'} (${n} error${n === 1 ? '' : 's'}, 0 warnings)`;
};

/**
 * @param {string} packageDir extracted tarball contents (the `package/` root)
 * @returns {Promise<{ passed: boolean, summary: string, message?: string, details?: string, findings: Array<{ rule, file, line, column, message }> }>}
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
			const { line, column } =
				firstOffset === undefined ? { line: 1, column: 1 } : positionAt(content, firstOffset);
			findings.push({
				rule,
				file: relativePath,
				line,
				column,
				message: metadata.description ?? rule,
			});
		}
	}

	const summary = `${findings.length} error${findings.length === 1 ? '' : 's'}, 0 warnings`;
	return findings.length > 0
		? {
				passed: false,
				summary,
				message: 'YARA rule matches',
				details: formatYaraFindings(findings),
				findings,
			}
		: { passed: true, summary: '0 errors, 0 warnings', findings };
};
