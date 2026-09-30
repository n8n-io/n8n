import { readFileSync } from 'node:fs';
import {
	GROUPS_FILE,
	OWNERS_FILE,
	parseGroupsContent,
	parseOwnersContent,
	parseOwnersFile,
	teamHandleToSlug,
} from './owners.mjs';

const ORG = 'n8n-io';
const API_URL = process.env.GITHUB_API_URL ?? 'https://api.github.com';

/**
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<Set<string>>}
 */
export async function fetchTeamSlugs(fetchImpl = fetch) {
	const slugs = new Set();

	for (let page = 1; ; page++) {
		const response = await fetchImpl(
			`${API_URL}/orgs/${ORG}/teams?per_page=100&page=${page}`,
			{
				headers: {
					Accept: 'application/vnd.github+json',
					...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
				},
			},
		);

		if (!response.ok) {
			throw new Error(`GitHub teams API returned ${response.status}: ${await response.text()}`);
		}

		const teams = await response.json();
		for (const team of teams) slugs.add(team.slug);
		if (teams.length < 100) return slugs;
	}
}

/**
 * @param {Set<string>} availableTeamSlugs
 * @returns {string[]}
 */
export function findMissingTeamSlugs(availableTeamSlugs, owners = parseOwnersFile(), groups = parseGroupsContent(readFileSync(GROUPS_FILE, 'utf8'))) {
	const referencedSlugs = new Set();

	for (const entry of owners) {
		for (const team of entry.teams) {
			referencedSlugs.add(teamHandleToSlug(team));
		}
	}

	for (const teams of groups.values()) {
		for (const team of teams) referencedSlugs.add(teamHandleToSlug(team));
	}

	return [...referencedSlugs].filter((slug) => !availableTeamSlugs.has(slug)).sort();
}

async function main() {
	const groups = parseGroupsContent(readFileSync(process.env.GROUPS_FILE ?? GROUPS_FILE, 'utf8'));
	const owners = parseOwnersContent(
		readFileSync(process.env.OWNERS_FILE ?? OWNERS_FILE, 'utf8'),
		groups,
	);
	const missing = findMissingTeamSlugs(await fetchTeamSlugs(), owners, groups);
	if (missing.length > 0) {
		throw new Error(`OWNERS references GitHub teams that do not exist: ${missing.join(', ')}`);
	}

	console.log('All OWNERS team slugs exist in the n8n-io GitHub organization.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main().catch((error) => {
		console.error(error.message);
		process.exit(1);
	});
}
