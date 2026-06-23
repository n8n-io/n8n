import { normalizeDocsUrl, type N8nDocsRegistryEntry } from './registry';
import type { N8nDocsLookupInput, N8nDocsSearchInput } from './schemas';

const CREDENTIAL_SETUP_DOC_PATH = '/credentials/add-edit-credentials/index.md';
const GOOGLE_SERVICE_TOKENS = new Set([
	'gmail',
	'google',
	'calendar',
	'contacts',
	'docs',
	'drive',
	'sheets',
	'slides',
	'tasks',
	'workspace',
	'gsuite',
]);
const STOPWORDS = new Set([
	'a',
	'an',
	'and',
	'api',
	'for',
	'how',
	'i',
	'in',
	'is',
	'it',
	'n8n',
	'of',
	'on',
	'or',
	'set',
	'setup',
	'the',
	'to',
	'up',
	'use',
	'with',
]);

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
	for (const value of values) {
		if (!value) continue;
		for (const token of normalizeTokenSource(value).match(/[a-z0-9]+/g) ?? []) {
			if (token.length < 2 || STOPWORDS.has(token) || seen.has(token)) continue;
			seen.add(token);
			tokens.push(token);
		}
	}
	return tokens;
}

function includesAll(value: string, tokens: string[]): boolean {
	return tokens.length > 0 && tokens.every((token) => value.includes(token));
}

function pathStartsWith(entry: N8nDocsRegistryEntry, prefix: string): boolean {
	return entry.path.startsWith(prefix);
}

function isCredentialSetupIntent(intent: string | undefined): boolean {
	return intent === 'credential-setup';
}

function inferGoogleCredential(tokens: string[]): boolean {
	return tokens.some((token) => GOOGLE_SERVICE_TOKENS.has(token));
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

function scoreEntry(entry: N8nDocsRegistryEntry, input: RankInput): N8nDocsMatch | undefined {
	const reasons: string[] = [];
	let score = 0;
	const normalizedDocumentationUrl = input.documentationUrl
		? normalizeDocsUrl(input.documentationUrl)
		: undefined;

	if (normalizedDocumentationUrl && normalizedDocumentationUrl === entry.url) {
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
		if (title.includes(token)) score += 12;
		if (path.includes(token)) score += 5;
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
		if (pathStartsWith(entry, '/integrations/builtin/credentials/')) {
			score += 90;
			reasons.push('credential docs');
		}

		if (entry.path === CREDENTIAL_SETUP_DOC_PATH) {
			score += 55;
			reasons.push('general credential setup docs');
		}

		if (pathStartsWith(entry, '/integrations/builtin/app-nodes/')) {
			score -= 25;
		}

		const googleCredential = inferGoogleCredential([...queryTokens, ...credentialTokens]);
		if (googleCredential && path.includes('/credentials/google/')) {
			score += 110;
			reasons.push('Google credential setup docs');
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
	return entries
		.map((entry) => scoreEntry(entry, input))
		.filter((match): match is N8nDocsMatch => match !== undefined)
		.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export function pickLookupMatches(matches: N8nDocsMatch[], maxPages: number): N8nDocsMatch[] {
	if (matches.length <= maxPages) return matches;

	const picked: N8nDocsMatch[] = [];
	const generalCredentialSetup = matches.find((match) => match.path === CREDENTIAL_SETUP_DOC_PATH);

	for (const match of matches) {
		if (picked.length >= maxPages) break;
		if (match.path === CREDENTIAL_SETUP_DOC_PATH) continue;
		picked.push(match);
	}

	if (generalCredentialSetup && !picked.some((match) => match.url === generalCredentialSetup.url)) {
		if (picked.length >= maxPages) picked.pop();
		picked.push(generalCredentialSetup);
	}

	return picked;
}
