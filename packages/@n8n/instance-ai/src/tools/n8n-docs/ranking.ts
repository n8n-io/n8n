import { getDocsUrlCandidates, type N8nDocsRegistryEntry } from './registry';
import type { N8nDocsLookupInput, N8nDocsSearchInput } from './schemas';

const CREDENTIAL_SETUP_DOC_PATH = '/build/understand-workflows/create-and-edit-credentials.md';
const MEANINGFUL_TOKEN_WEIGHT = 2;

type LookupLikeInput = Pick<
	N8nDocsLookupInput | N8nDocsSearchInput,
	'query' | 'credentialDisplayName' | 'credentialType' | 'documentationUrl' | 'nodeType'
>;

type RankInput = Pick<
	N8nDocsLookupInput | N8nDocsSearchInput,
	'query' | 'intent' | 'credentialType' | 'credentialDisplayName' | 'documentationUrl' | 'nodeType'
>;

export interface N8nDocsMatch extends N8nDocsRegistryEntry {
	score: number;
	reason: string;
}

type TokenWeights = ReadonlyMap<string, number>;

function normalizeTokenSource(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/oauth\s*2/gi, 'oauth2')
		.toLowerCase();
}

function tokenize(...values: Array<string | undefined>): string[] {
	const seen = new Set<string>();
	const tokens: string[] = [];
	const addToken = (token: string) => {
		if (token.length < 2 || seen.has(token)) return;
		seen.add(token);
		tokens.push(token);
	};

	for (const value of values) {
		if (!value) continue;
		for (const token of normalizeTokenSource(value).match(/[a-z0-9]+/g) ?? []) {
			addToken(token);

			const versionedToken = /^([a-z]+)[0-9]+$/.exec(token);
			if (versionedToken) addToken(versionedToken[1]);
		}
	}
	return tokens;
}

function getTokenWeights(entries: N8nDocsRegistryEntry[]): TokenWeights {
	const documentFrequencies = new Map<string, number>();

	for (const entry of entries) {
		const tokens = new Set(tokenize(entry.title, entry.path));
		for (const token of tokens) {
			documentFrequencies.set(token, (documentFrequencies.get(token) ?? 0) + 1);
		}
	}

	const weights = new Map<string, number>();
	for (const [token, count] of documentFrequencies) {
		weights.set(token, Math.log((entries.length + 1) / (count + 1)) + 1);
	}

	return weights;
}

function getTokenWeight(tokenWeights: TokenWeights, token: string): number {
	return tokenWeights.get(token) ?? 1;
}

function includesAll(value: string, tokens: string[]): boolean {
	return tokens.length > 0 && tokens.every((token) => value.includes(token));
}

function hasMeaningfulTokenMatch(
	value: string,
	tokens: string[],
	tokenWeights: TokenWeights,
): boolean {
	return tokens.some(
		(token) =>
			value.includes(token) && getTokenWeight(tokenWeights, token) >= MEANINGFUL_TOKEN_WEIGHT,
	);
}

function pathStartsWith(entry: N8nDocsRegistryEntry, prefix: string): boolean {
	return entry.path.startsWith(prefix);
}

function isCredentialSetupIntent(intent: string | undefined): boolean {
	return intent === 'credential-setup';
}

function isGeneralCredentialSetupDocs(entry: N8nDocsRegistryEntry): boolean {
	return entry.path === CREDENTIAL_SETUP_DOC_PATH;
}

export function getLookupQuery(input: LookupLikeInput): string {
	return (
		input.query ??
		input.credentialDisplayName ??
		input.credentialType ??
		input.nodeType ??
		input.documentationUrl ??
		''
	);
}

function scoreEntry(
	entry: N8nDocsRegistryEntry,
	input: RankInput,
	tokenWeights: TokenWeights,
): N8nDocsMatch | undefined {
	const reasons: string[] = [];
	let score = 0;
	const documentationUrlCandidates = input.documentationUrl
		? new Set(getDocsUrlCandidates(input.documentationUrl))
		: undefined;
	const isDocumentationUrlMatch = documentationUrlCandidates?.has(entry.url) ?? false;

	if (isDocumentationUrlMatch) {
		score += 500;
		reasons.push('documentation URL match');
	}

	const query = getLookupQuery(input);
	const queryTokens = tokenize(query);
	const credentialTokens = tokenize(input.credentialType, input.credentialDisplayName);
	const nodeTokens = tokenize(input.nodeType);
	const allTokens = [...new Set([...queryTokens, ...credentialTokens, ...nodeTokens])];
	const title = normalizeTokenSource(entry.title);
	const path = normalizeTokenSource(entry.path);
	const titleAndPath = `${title} ${path}`;

	for (const token of allTokens) {
		const tokenWeight = getTokenWeight(tokenWeights, token);
		if (title.includes(token)) score += 12 * tokenWeight;
		if (path.includes(token)) score += 5 * tokenWeight;
	}

	const normalizedQuery = normalizeTokenSource(query).trim();
	if (normalizedQuery && title.includes(normalizedQuery)) {
		score += 40;
		reasons.push('title phrase match');
	}

	if (queryTokens.length > 0 && includesAll(titleAndPath, queryTokens)) {
		score += 30;
		reasons.push('query token match');
	}

	if (credentialTokens.length > 0 && includesAll(titleAndPath, credentialTokens)) {
		score += 30;
		reasons.push('credential token match');
	}

	if (isCredentialSetupIntent(input.intent)) {
		if (
			pathStartsWith(entry, '/integrations/builtin/credentials/') &&
			(isDocumentationUrlMatch || hasMeaningfulTokenMatch(titleAndPath, allTokens, tokenWeights))
		) {
			score += 90;
			reasons.push('credential docs');
		}

		if (isGeneralCredentialSetupDocs(entry)) {
			score += 55;
			reasons.push('general credential setup docs');
		}

		if (pathStartsWith(entry, '/integrations/builtin/app-nodes/')) {
			score -= 25;
		}

		if (credentialTokens.includes('oauth') || credentialTokens.includes('oauth2')) {
			if (title.includes('oauth') || path.includes('oauth')) {
				score += 45;
				reasons.push('OAuth docs');
			}
		}
	}

	if (
		!/release-notes|breaking-changes/.test(normalizedQuery) &&
		entry.path.includes('/release-notes/')
	) {
		score -= 30;
	}

	if (score <= 0) return undefined;

	return {
		...entry,
		score,
		reason: reasons.length > 0 ? reasons.join(', ') : 'text match',
	};
}

export function rankN8nDocsEntries(
	entries: N8nDocsRegistryEntry[],
	input: RankInput,
): N8nDocsMatch[] {
	const tokenWeights = getTokenWeights(entries);

	return entries
		.map((entry) => scoreEntry(entry, input, tokenWeights))
		.filter((match): match is N8nDocsMatch => match !== undefined)
		.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export function pickLookupMatches(matches: N8nDocsMatch[], maxPages: number): N8nDocsMatch[] {
	if (matches.length <= maxPages) return matches;

	const generalCredentialSetup = matches.find(isGeneralCredentialSetupDocs);
	if (!generalCredentialSetup || maxPages <= 1) return matches.slice(0, maxPages);

	const firstMatch = matches.find((match) => !isGeneralCredentialSetupDocs(match));
	if (!firstMatch) return matches.slice(0, maxPages);

	const picked = [firstMatch];

	if (generalCredentialSetup && !picked.some((match) => match.url === generalCredentialSetup.url)) {
		picked.push(generalCredentialSetup);
	}

	return picked.slice(0, maxPages);
}
