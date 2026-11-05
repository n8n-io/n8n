import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

// The site runs from packages/@n8n/backend-docs-site, three levels below the repository root.
const REPO_DIR = resolve(process.cwd(), '../../..');

// Full team names. Other handles show in title case.
const TEAM_NAMES: Record<string, string> = {
	'core-execution': 'Core Execution',
	'core-application': 'Core Application',
	iam: 'Identity and Access',
	ligo: 'Lifecycle and Governance',
	'ai-assistant': 'AI Assistant',
};

export interface Owner {
	handle: string;
	name: string;
	url: string;
}

let rules: Array<{ pattern: string; team: string }> | undefined;

function loadRules() {
	rules ??= readFileSync(resolve(REPO_DIR, 'OWNERS'), 'utf8')
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith('#'))
		.map((line) => {
			const [pattern, team] = line.split(/\s+/);
			return { pattern, team };
		})
		// Only plain paths under docs/ can match a page. Glob rules elsewhere cannot.
		.filter(({ pattern, team }) => pattern.startsWith('docs/') && team?.startsWith('@'));
	return rules;
}

/** Returns the team that owns a page, with the last matching rule winning, as in OWNERS. */
export function ownerOf(filePath: string): Owner | undefined {
	const path = relative(REPO_DIR, resolve(process.cwd(), filePath)).split('\\').join('/');
	const match = loadRules()
		.filter(({ pattern }) => (pattern.endsWith('/') ? path.startsWith(pattern) : path === pattern))
		.at(-1);
	if (!match) return undefined;
	const handle = match.team.replace(/^@[^/]+\//, '');
	const name =
		TEAM_NAMES[handle] ??
		handle
			.split('-')
			.map((word) => (word === 'and' ? word : word[0].toUpperCase() + word.slice(1)))
			.join(' ');
	return { handle, name, url: `https://github.com/orgs/n8n-io/teams/${handle}` };
}
