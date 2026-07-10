#!/usr/bin/env node
/**
 * SPIKE: stamp `boundaries: { type, scope }` into every workspace package.json,
 * then validate the real workspace dependency graph against the module-boundary
 * matrices. Run from the repo root: `node packages/@n8n/eslint-config/scripts/spike-apply-boundaries.mjs`
 *
 * Not production code — this is the throwaway harness that answers "what breaks
 * if we adopt the tags in the table". The real tag source would be a generator
 * wired into the eslint config; here we embed the mapping so it stays reviewable.
 *
 * NOTE: uses key `boundaries`, NOT `n8n` — the `n8n` key is already taken by
 * node/credential registration in nodes-base et al.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// name -> [type, scope]. Mirrors the assessment table (extended type set).
const TAGS = {
	// shared
	'@n8n/utils': ['util', 'shared'],
	'@n8n/constants': ['util', 'shared'],
	'@n8n/errors': ['util', 'shared'],
	'@n8n/di': ['util', 'shared'],
	'@n8n/decorators': ['util', 'shared'],
	'@n8n/config': ['util', 'shared'],
	'@n8n/permissions': ['util', 'shared'],
	'@n8n/i18n': ['util', 'shared'],
	'@n8n/json-schema-to-zod': ['util', 'shared'],
	'@n8n/api-types': ['data-access', 'shared'],
	// workflow-engine
	'n8n-workflow': ['runtime', 'workflow-engine'],
	'n8n-core': ['runtime', 'workflow-engine'],
	'@n8n/engine': ['runtime', 'workflow-engine'],
	'@n8n/expression-runtime': ['runtime', 'workflow-engine'],
	'@n8n/scheduler': ['util', 'workflow-engine'],
	'@n8n/tournament': ['util', 'workflow-engine'],
	'@n8n/task-runner': ['app', 'workflow-engine'],
	'@n8n/workflow-sdk': ['sdk', 'workflow-engine'],
	// nodes
	'n8n-nodes-base': ['nodes', 'nodes'],
	'@n8n/n8n-nodes-langchain': ['nodes', 'nodes'],
	'@n8n/ai-node-sdk': ['sdk', 'nodes'],
	'@n8n/ai-utilities': ['util', 'nodes'],
	'@n8n/extension-sdk': ['sdk', 'nodes'],
	'@n8n/create-node': ['tooling', 'nodes'],
	'@n8n/node-cli': ['tooling', 'nodes'],
	'n8n-node-dev': ['tooling', 'nodes'],
	'@n8n/scan-community-package': ['tooling', 'nodes'],
	'@n8n/eslint-plugin-community-nodes': ['tooling', 'nodes'],
	// ai
	'@n8n/instance-ai': ['feature', 'ai'],
	'@n8n/ai-workflow-builder': ['feature', 'ai'],
	'@n8n/agents': ['sdk', 'ai'],
	'@n8n/computer-use': ['app', 'ai'],
	'@n8n/mcp-apps': ['feature', 'ai'],
	'@n8n/mcp-browser': ['util', 'ai'],
	'@n8n/mcp-browser-extension': ['app', 'ai'],
	'@n8n/chat-hub': ['feature', 'ai'],
	'@n8n/chat': ['feature', 'ai'],
	// editor (frontend)
	'n8n-editor-ui': ['app', 'editor'],
	'@n8n/design-system': ['ui', 'editor'],
	'@n8n/stores': ['data-access', 'editor'],
	'@n8n/rest-api-client': ['data-access', 'editor'],
	'@n8n/composables': ['util', 'editor'],
	'@n8n/codemirror-lang': ['util', 'editor'],
	'@n8n/codemirror-lang-html': ['util', 'editor'],
	'@n8n/codemirror-lang-sql': ['util', 'editor'],
	// persistence
	'@n8n/db': ['data-access', 'persistence'],
	'@n8n/typeorm': ['util', 'persistence'],
	'@n8n/crdt': ['util', 'persistence'],
	// platform (backend server)
	n8n: ['app', 'platform'],
	'@n8n/cli': ['app', 'platform'],
	'@n8n/backend-common': ['util', 'platform'],
	'@n8n/backend-network': ['data-access', 'platform'],
	'@n8n/local-gateway': ['app', 'platform'],
	'@n8n/syslog-client': ['util', 'platform'],
	'@n8n/imap': ['util', 'platform'],
	'@n8n/client-oauth2': ['util', 'platform'],
	// insights
	'@n8n/n8n-extension-insights': ['feature', 'insights'],
	// tooling
	'@n8n/eslint-config': ['tooling', 'tooling'],
	'@n8n/typescript-config': ['tooling', 'tooling'],
	'@n8n/vitest-config': ['tooling', 'tooling'],
	'@n8n/stylelint-config': ['tooling', 'tooling'],
	'@n8n/storybook': ['tooling', 'tooling'],
	'@n8n/code-health': ['tooling', 'tooling'],
	'@n8n/test-impact': ['tooling', 'tooling'],
	'@n8n/playwright-janitor': ['tooling', 'tooling'],
	'n8n-playwright': ['tooling', 'tooling'],
	'n8n-containers': ['tooling', 'tooling'],
	'@n8n/performance': ['tooling', 'tooling'],
	'@n8n/n8n-benchmark': ['tooling', 'tooling'],
	'@n8n/backend-test-utils': ['tooling', 'tooling'],
	'@n8n/rules-engine': ['tooling', 'tooling'],
};

const ALL = [
	'app', 'feature', 'runtime', 'nodes', 'sdk', 'data-access', 'domain-ui', 'ui', 'util', 'tooling',
];
const ALLOWED_TYPES = {
	app: ALL,
	tooling: ALL,
	feature: ['data-access', 'domain-ui', 'ui', 'util', 'sdk'],
	runtime: ['runtime', 'data-access', 'util'],
	nodes: ['nodes', 'runtime', 'data-access', 'sdk', 'util'],
	sdk: ['sdk', 'runtime', 'data-access', 'util'],
	'data-access': ['data-access', 'util'],
	'domain-ui': ['domain-ui', 'ui', 'util'],
	ui: ['ui', 'util'],
	util: ['util'],
};
const SCOPE_EXEMPT_TYPES = new Set(['app', 'tooling']);
const SHARED_SCOPES = new Set(['shared', 'tooling']);

// --- discover package.json files ---
const roots = [
	'packages',
	'packages/@n8n',
	'packages/frontend',
	'packages/frontend/@n8n',
	'packages/extensions',
	'packages/testing',
];
const pkgFiles = [];
for (const root of roots) {
	if (!existsSync(root)) continue;
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const pj = join(root, entry.name, 'package.json');
		if (existsSync(pj)) pkgFiles.push(pj);
	}
}

// --- stamp tags (textual insert to keep diffs to one line) ---
const byName = {};
let stamped = 0;
const untagged = [];
for (const pj of pkgFiles) {
	const raw = readFileSync(pj, 'utf8');
	const pkg = JSON.parse(raw);
	byName[pkg.name] = { pj, pkg };
	const tag = TAGS[pkg.name];
	if (!tag) { untagged.push(pkg.name); continue; }
	const [type, scope] = tag;
	if (raw.includes('"boundaries"')) { stamped++; continue; }
	const insert = `  "boundaries": { "type": "${type}", "scope": "${scope}" },\n`;
	writeFileSync(pj, raw.replace(/^{\n/, `{\n${insert}`));
	stamped++;
}

// --- validate the runtime dependency graph ---
const names = new Set(Object.keys(byName));
const typeViol = [];
const scopeViol = [];
for (const [name, { pkg }] of Object.entries(byName)) {
	const tag = TAGS[name];
	if (!tag) continue;
	const [fromType, fromScope] = tag;
	for (const dep of Object.keys(pkg.dependencies ?? {})) {
		if (!names.has(dep) || dep === name) continue;
		const toTag = TAGS[dep];
		if (!toTag) continue;
		const [toType, toScope] = toTag;
		if (!ALLOWED_TYPES[fromType].includes(toType)) {
			typeViol.push(`${name} (${fromType}) -> ${dep} (${toType})`);
			continue;
		}
		const scopeOk =
			SCOPE_EXEMPT_TYPES.has(fromType) ||
			fromScope === toScope ||
			SHARED_SCOPES.has(toScope);
		if (!scopeOk) scopeViol.push(`${name} [${fromScope}] -> ${dep} [${toScope}]`);
	}
}

console.log(`\n=== stamped ${stamped}/${pkgFiles.length} package.json files ===`);
if (untagged.length) console.log(`untagged (no mapping): ${untagged.join(', ')}`);
console.log(`\n=== TYPE violations (${typeViol.length}) ===`);
typeViol.sort().forEach((v) => console.log('  ' + v));
console.log(`\n=== SCOPE violations (${scopeViol.length}) — need explicit opt-in ===`);
scopeViol.sort().forEach((v) => console.log('  ' + v));
