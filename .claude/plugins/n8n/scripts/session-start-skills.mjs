#!/usr/bin/env node

// SessionStart hook (prototype): surfaces the most useful / popular n8n skills.
//
// Ranking strategy:
//   1. If a local usage log exists (.claude/.skill-usage.local.json, written by
//      track-skill-usage-local.mjs), rank skills by invocation count — "popular".
//   2. Skills with no usage yet are ordered by a small curated "useful" list of
//      common entry points, then alphabetically.
//
// Output: prints SessionStart `additionalContext` JSON so the list is injected
// into the session, and a human-readable summary to stderr for the terminal.

import { readFileSync, readdirSync, existsSync, statSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = join(SCRIPT_DIR, '..'); // .claude/plugins/n8n
const SKILLS_DIR = join(PLUGIN_DIR, 'skills');
const REPO_ROOT = join(PLUGIN_DIR, '..', '..', '..'); // repo root
const USAGE_LOG = join(REPO_ROOT, '.claude', '.skill-usage.local.json');

const TOP_N = 8;

// Curated fallback ordering for a fresh checkout with no usage data yet.
const CURATED = [
	'create-pr',
	'linear-issue',
	'conventions',
	'human-like-code-review',
	'design-system',
	'db-migrations',
	'reproduce-bug',
	'create-issue',
];

/** Parse the `name` and `description` from a SKILL.md frontmatter block. */
function parseSkill(skillDir) {
	const mdPath = join(SKILLS_DIR, skillDir, 'SKILL.md');
	if (!existsSync(mdPath)) return null;

	const content = readFileSync(mdPath, 'utf8');
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return null;

	const frontmatter = match[1];
	// Some skills omit `name:` and rely on the directory name as the identifier.
	const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? `n8n:${skillDir}`;
	const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim();

	// First sentence of the description keeps the summary tight.
	const summary = (description ?? '').split(/(?<=\.)\s/)[0];
	return { id: skillDir, name, summary };
}

/** Read the local usage counts written by the PostToolUse tracker. */
function readUsage() {
	if (!existsSync(USAGE_LOG)) return {};
	try {
		return JSON.parse(readFileSync(USAGE_LOG, 'utf8'));
	} catch {
		return {}; // corrupt/partial write — treat as no data
	}
}

function discoverSkills() {
	if (!existsSync(SKILLS_DIR)) return [];
	return readdirSync(SKILLS_DIR)
		.filter((entry) => statSync(join(SKILLS_DIR, entry)).isDirectory())
		.map(parseSkill)
		.filter(Boolean);
}

function rank(skills, usage) {
	const countFor = (id) => usage[id] ?? usage[`n8n:${id}`] ?? 0;
	const curatedRank = (id) => {
		const idx = CURATED.indexOf(id);
		return idx === -1 ? CURATED.length : idx;
	};
	return [...skills].sort((a, b) => {
		const byUsage = countFor(b.id) - countFor(a.id);
		if (byUsage !== 0) return byUsage;
		const byCurated = curatedRank(a.id) - curatedRank(b.id);
		if (byCurated !== 0) return byCurated;
		return a.id.localeCompare(b.id);
	});
}

// Debug trace: confirms the hook actually fired (remove once verified).
try {
	const line = `${new Date().toISOString()} session-start-skills ran (pid ${process.pid})\n`;
	appendFileSync(join(REPO_ROOT, '.claude', '.skill-hook-debug.log'), line);
} catch {}

const usage = readUsage();
const hasUsageData = Object.keys(usage).length > 0;
const skills = discoverSkills();

if (skills.length === 0) {
	process.exit(0); // nothing to show; never block startup
}

const top = rank(skills, usage).slice(0, TOP_N);
const basis = hasUsageData ? 'by your local usage' : 'curated starting points';

const lines = top.map((s) => {
	const count = usage[s.id] ?? usage[`n8n:${s.id}`] ?? 0;
	const badge = hasUsageData && count > 0 ? ` (${count}×)` : '';
	return `- /${s.name.replace(/^n8n:/, 'n8n:')}${badge} — ${s.summary}`;
});

const heading = `Top ${top.length} n8n skills (${basis}), of ${skills.length} available:`;
const body = `${heading}\n${lines.join('\n')}`;

process.stdout.write(
	JSON.stringify({
		// Visible banner shown to the user in the chat.
		systemMessage: body,
		hookSpecificOutput: {
			hookEventName: 'SessionStart',
			// Silent context injection so the model also knows what's available.
			additionalContext: body,
		},
	}),
);
