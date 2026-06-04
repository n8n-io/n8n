#!/usr/bin/env node

// PostToolUse hook (prototype): increments a local, per-skill usage counter.
// Feeds the popularity ranking in session-start-skills.mjs.
//
// Writes to .claude/.skill-usage.local.json (gitignored — machine-local data).
// Receives JSON on stdin: { "tool_input": { "skill": "n8n:foo" }, ... }

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..', '..', '..', '..');
const USAGE_LOG = join(REPO_ROOT, '.claude', '.skill-usage.local.json');

const input = await new Promise((resolve) => {
	let data = '';
	process.stdin.on('data', (chunk) => (data += chunk));
	process.stdin.on('end', () => resolve(data));
});

let skillName;
try {
	skillName = JSON.parse(input)?.tool_input?.skill;
} catch {
	process.exit(0);
}
if (!skillName) process.exit(0);

// Normalize "n8n:foo" / "n8n-foo" -> "foo" so it keys to the skill directory.
const id = skillName.replace(/^n8n[:-]/, '');

let counts = {};
if (existsSync(USAGE_LOG)) {
	try {
		counts = JSON.parse(readFileSync(USAGE_LOG, 'utf8'));
	} catch {
		counts = {};
	}
}

counts[id] = (counts[id] ?? 0) + 1;

try {
	writeFileSync(USAGE_LOG, `${JSON.stringify(counts, null, 2)}\n`);
} catch {
	// Never block tool use on a write failure.
}
