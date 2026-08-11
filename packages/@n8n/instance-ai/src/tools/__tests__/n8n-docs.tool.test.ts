import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import {
	createN8nDocsTool,
	getDocsUrlCandidates,
	N8N_DOCS_REGISTRY_URL,
	normalizeDocsUrl,
	parseN8nDocsRegistry,
	rankN8nDocsEntries,
	resetN8nDocsRegistryCacheForTests,
	toPublicDocsUrl,
	type N8nDocsDocument,
	type N8nDocsMatch,
} from '../n8n-docs.tool';

const REGISTRY = `# n8n Docs

> Documentation for n8n.

## All documentation

- [Create and edit credentials](https://docs.n8n.io/build/understand-workflows/create-and-edit-credentials.md): Creating and editing credentials.
- [Gmail](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gmail.md): Learn how to use the Gmail node in n8n.
- [Figma credentials](https://docs.n8n.io/integrations/builtin/credentials/figma.md): Documentation for Figma credentials. Use these credentials to authenticate Figma in n8n.
- [Google: OAuth2 single service](https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service.md)
- [Microsoft credentials](https://docs.n8n.io/integrations/builtin/credentials/microsoft.md)
- [Slack credentials](https://docs.n8n.io/integrations/builtin/credentials/slack.md)
- [2.x](https://docs.n8n.io/release-notes.md)
`;

const GOOGLE_OAUTH_URL =
	'https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service.md';
const MICROSOFT_CREDENTIALS_URL =
	'https://docs.n8n.io/integrations/builtin/credentials/microsoft.md';
const SLACK_CREDENTIALS_URL = 'https://docs.n8n.io/integrations/builtin/credentials/slack.md';
const FIGMA_CREDENTIALS_URL = 'https://docs.n8n.io/integrations/builtin/credentials/figma.md';
const CREATE_EDIT_URL =
	'https://docs.n8n.io/build/understand-workflows/create-and-edit-credentials.md';
const GMAIL_NODE_URL = 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gmail.md';
const PUBLIC_GOOGLE_OAUTH_URL =
	'https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/';
const PUBLIC_MICROSOFT_CREDENTIALS_URL =
	'https://docs.n8n.io/integrations/builtin/credentials/microsoft/';
const PUBLIC_FIGMA_CREDENTIALS_URL = 'https://docs.n8n.io/integrations/builtin/credentials/figma/';
const PUBLIC_CREATE_EDIT_URL =
	'https://docs.n8n.io/build/understand-workflows/create-and-edit-credentials/';

interface N8nDocsToolResult {
	query?: string;
	intent?: string;
	url?: string;
	matches?: N8nDocsMatch[];
	documents?: N8nDocsDocument[];
	hint?: string;
	error?: string;
}

function createMockContext(): Pick<InstanceAiContext, 'logger'> {
	return {
		logger: {
			warn: vi.fn(),
			debug: vi.fn(),
		} as unknown as InstanceAiContext['logger'],
	};
}

function createResponse(url: string, text: string, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		url,
		headers: {
			get: vi.fn(() => null),
		},
		text: vi.fn(async () => await Promise.resolve(text)),
	} as unknown as Response;
}

function getFetchUrl(input: string | URL | Request) {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.toString();
	return input.url;
}

function stubFetchWithMap(responses: Record<string, string>) {
	const fetchMock = vi.fn(async (input: string | URL | Request) => {
		const url = getFetchUrl(input);
		const body = responses[url];
		if (body === undefined) throw new Error(`Unexpected fetch: ${url}`);
		return await Promise.resolve(createResponse(url, body));
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

describe('n8n-docs tool', () => {
	beforeEach(() => {
		resetN8nDocsRegistryCacheForTests();
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	afterEach(() => {
		resetN8nDocsRegistryCacheForTests();
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('instructs direct tool users to include source attribution', () => {
		const tool = createN8nDocsTool(createMockContext());

		expect(tool.description).toContain('Source: [Page title](page URL)');
		expect(tool.description).toContain('Sources:');
		expect(tool.description).toContain('using only returned page titles and URLs');
	});

	it('parses markdown registry links from llms.txt', () => {
		const registry = parseN8nDocsRegistry(REGISTRY, '2026-06-23T08:00:00.000Z');

		expect(registry.entries).toHaveLength(7);
		expect(registry.entries[0]).toEqual({
			title: 'Create and edit credentials',
			url: CREATE_EDIT_URL,
			path: '/build/understand-workflows/create-and-edit-credentials.md',
			section: 'All documentation',
		});
		expect(registry.byUrl.get(GOOGLE_OAUTH_URL)?.title).toBe('Google: OAuth2 single service');
		expect(registry.byUrl.get(FIGMA_CREDENTIALS_URL)?.title).toBe('Figma credentials');
	});

	it('normalizes docs URLs to markdown registry URLs', () => {
		expect(
			normalizeDocsUrl(
				'https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/',
			),
		).toBe(GOOGLE_OAUTH_URL);
		expect(normalizeDocsUrl('http://docs.n8n.io/credentials/')).toBeUndefined();
		expect(normalizeDocsUrl('https://example.com/credentials/')).toBeUndefined();
	});

	it('creates markdown candidates for public docs URLs', () => {
		expect(getDocsUrlCandidates(PUBLIC_FIGMA_CREDENTIALS_URL)).toEqual([FIGMA_CREDENTIALS_URL]);
		expect(getDocsUrlCandidates(GOOGLE_OAUTH_URL)).toContain(GOOGLE_OAUTH_URL);
		expect(getDocsUrlCandidates('https://example.com/credentials/')).toEqual([]);
	});

	it('formats markdown registry URLs as public docs URLs for source attribution', () => {
		expect(toPublicDocsUrl(GOOGLE_OAUTH_URL)).toBe(PUBLIC_GOOGLE_OAUTH_URL);
		expect(toPublicDocsUrl(PUBLIC_GOOGLE_OAUTH_URL)).toBe(PUBLIC_GOOGLE_OAUTH_URL);
	});

	it('ranks Gmail OAuth credential setup docs ahead of Gmail node docs', () => {
		const registry = parseN8nDocsRegistry(REGISTRY, '2026-06-23T08:00:00.000Z');

		const matches = rankN8nDocsEntries(registry.entries, {
			query: 'How do I set up Gmail OAuth2 API credentials?',
			intent: 'credential-setup',
			credentialType: 'gmailOAuth2Api',
			credentialDisplayName: 'Gmail OAuth2 API',
			nodeType: 'n8n-nodes-base.gmail',
		});

		expect(matches[0].url).toBe(GOOGLE_OAUTH_URL);
		expect(matches.findIndex((match) => match.url === GOOGLE_OAUTH_URL)).toBeLessThan(
			matches.findIndex((match) => match.url === GMAIL_NODE_URL),
		);
	});

	it('ranks credential docs by distinctive tokens instead of generic credential matches', () => {
		const registry = parseN8nDocsRegistry(REGISTRY, '2026-06-23T08:00:00.000Z');

		const matches = rankN8nDocsEntries(registry.entries, {
			query: 'How do I set up Slack credentials in n8n?',
			intent: 'credential-setup',
			credentialType: 'slackApi',
			credentialDisplayName: 'Slack API',
		});

		expect(matches[0].url).toBe(SLACK_CREDENTIALS_URL);
		expect(matches.findIndex((match) => match.url === SLACK_CREDENTIALS_URL)).toBeLessThan(
			matches.findIndex((match) => match.url === MICROSOFT_CREDENTIALS_URL),
		);
	});

	it('lookup reads Gmail OAuth docs and includes general credential setup docs', async () => {
		const fetchMock = stubFetchWithMap({
			[N8N_DOCS_REGISTRY_URL]: REGISTRY,
			[GOOGLE_OAUTH_URL]:
				'# Google: OAuth2 single service\n\nCopy the OAuth Redirect URL into Authorized redirect URIs.',
			[CREATE_EDIT_URL]:
				'# Create and edit credentials\n\nWhen you save a credential, n8n tests it.',
			[GMAIL_NODE_URL]: '# Gmail\n\nUse Gmail to send and receive email.',
		});
		const tool = createN8nDocsTool(createMockContext());

		const result = await executeTool<N8nDocsToolResult>(tool, {
			action: 'lookup',
			query: 'How do I set up Gmail OAuth2 API credentials?',
			intent: 'credential-setup',
			credentialType: 'gmailOAuth2Api',
			credentialDisplayName: 'Gmail OAuth2 API',
			oauthRedirectUrl: 'http://localhost:5678/rest/oauth2-credential/callback',
		});

		expect(fetchMock).toHaveBeenCalledWith(
			N8N_DOCS_REGISTRY_URL,
			expect.objectContaining({ redirect: 'follow' }),
		);
		expect(result.documents?.[0].title).toBe('Google: OAuth2 single service');
		expect(result.documents?.[0].url).toBe(PUBLIC_GOOGLE_OAUTH_URL);
		expect(result.documents?.some((doc) => doc.url === PUBLIC_CREATE_EDIT_URL)).toBe(true);
		expect(result.documents?.[0].content).toContain('<untrusted_data');
		expect(result.documents?.[0].content).toContain(`source="${PUBLIC_GOOGLE_OAUTH_URL}"`);
		expect(result.documents?.[0].content).toContain('OAuth Redirect URL');
	});

	it('lookup derives the query from credential context when query is omitted', async () => {
		stubFetchWithMap({
			[N8N_DOCS_REGISTRY_URL]: REGISTRY,
			[MICROSOFT_CREDENTIALS_URL]:
				'# Microsoft credentials\n\nCopy the OAuth Callback URL from your n8n credential.',
			[CREATE_EDIT_URL]: '# Create and edit credentials\n\nCredential setup modal guidance.',
		});
		const tool = createN8nDocsTool(createMockContext());

		const result = await executeTool<N8nDocsToolResult>(tool, {
			action: 'lookup',
			intent: 'credential-setup',
			credentialType: 'microsoftOutlookOAuth2Api',
			credentialDisplayName: 'Microsoft Outlook OAuth2 API',
			documentationUrl: 'https://docs.n8n.io/integrations/builtin/credentials/microsoft/',
			oauthRedirectUrl: 'http://localhost:5678/rest/oauth2-credential/callback',
		});

		expect(result.query).toBe('Microsoft Outlook OAuth2 API');
		expect(result.documents?.[0].url).toBe(PUBLIC_MICROSOFT_CREDENTIALS_URL);
		expect(result.documents?.[0].content).toContain('OAuth Callback URL');
		expect(result.documents?.some((document) => document.url === PUBLIC_CREATE_EDIT_URL)).toBe(
			true,
		);
	});

	it('lookup matches GitBook markdown credential docs from a public documentation URL', async () => {
		stubFetchWithMap({
			[N8N_DOCS_REGISTRY_URL]: REGISTRY,
			[FIGMA_CREDENTIALS_URL]:
				'# Figma credentials\n\nOpen the Figma developer apps page and add the OAuth Redirect URL.',
			[CREATE_EDIT_URL]: '# Create and edit credentials\n\nCredential setup modal guidance.',
		});
		const tool = createN8nDocsTool(createMockContext());

		const result = await executeTool<N8nDocsToolResult>(tool, {
			action: 'lookup',
			intent: 'credential-setup',
			credentialType: 'figmaOAuth2Api',
			credentialDisplayName: 'Figma OAuth2 API',
			documentationUrl: PUBLIC_FIGMA_CREDENTIALS_URL,
			maxPages: 2,
		});

		expect(result.matches?.[0].url).toBe(PUBLIC_FIGMA_CREDENTIALS_URL);
		expect(result.matches?.[0].reason).toContain('documentation URL match');
		expect(result.matches?.map((match) => match.url)).toEqual([
			PUBLIC_FIGMA_CREDENTIALS_URL,
			PUBLIC_CREATE_EDIT_URL,
		]);
		expect(result.documents?.[0].url).toBe(PUBLIC_FIGMA_CREDENTIALS_URL);
		expect(result.documents?.[1].url).toBe(PUBLIC_CREATE_EDIT_URL);
		expect(result.documents).toHaveLength(2);
		expect(result.documents?.[0].content).toContain('Figma developer apps');
	});

	it('read rejects URLs outside docs.n8n.io', async () => {
		stubFetchWithMap({ [N8N_DOCS_REGISTRY_URL]: REGISTRY });
		const tool = createN8nDocsTool(createMockContext());

		const result = await executeTool<N8nDocsToolResult>(tool, {
			action: 'read',
			url: 'https://example.com/credentials/',
		});

		expect(result.documents).toEqual([]);
		expect(result.error).toBe('URL is not an n8n docs registry entry.');
	});

	it('read requires a URL even though the provider schema is flattened', async () => {
		const tool = createN8nDocsTool(createMockContext());

		await expect(executeTool(tool, { action: 'read' })).rejects.toThrow(/url/i);
	});

	it('read rejects docs URLs not present in the registry', async () => {
		stubFetchWithMap({ [N8N_DOCS_REGISTRY_URL]: REGISTRY });
		const tool = createN8nDocsTool(createMockContext());

		const result = await executeTool<N8nDocsToolResult>(tool, {
			action: 'read',
			url: 'https://docs.n8n.io/not-in-registry/',
		});

		expect(result.documents).toEqual([]);
		expect(result.error).toBe('URL is not an n8n docs registry entry.');
	});

	it('read accepts a trailing-slash docs URL by normalizing it to markdown', async () => {
		const fetchMock = stubFetchWithMap({
			[N8N_DOCS_REGISTRY_URL]: REGISTRY,
			[GOOGLE_OAUTH_URL]: '# Google OAuth\n\nSetup steps.',
		});
		const tool = createN8nDocsTool(createMockContext());

		const result = await executeTool<N8nDocsToolResult>(tool, {
			action: 'read',
			url: 'https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/',
		});

		expect(fetchMock).toHaveBeenCalledWith(
			GOOGLE_OAUTH_URL,
			expect.objectContaining({ redirect: 'follow' }),
		);
		expect(result.url).toBe(PUBLIC_GOOGLE_OAUTH_URL);
		expect(result.documents?.[0].url).toBe(PUBLIC_GOOGLE_OAUTH_URL);
	});

	it('read accepts a public docs URL for a GitBook markdown registry entry', async () => {
		const fetchMock = stubFetchWithMap({
			[N8N_DOCS_REGISTRY_URL]: REGISTRY,
			[FIGMA_CREDENTIALS_URL]: '# Figma credentials\n\nOAuth2 setup steps.',
		});
		const tool = createN8nDocsTool(createMockContext());

		const result = await executeTool<N8nDocsToolResult>(tool, {
			action: 'read',
			url: PUBLIC_FIGMA_CREDENTIALS_URL,
		});

		expect(fetchMock).toHaveBeenCalledWith(
			FIGMA_CREDENTIALS_URL,
			expect.objectContaining({ redirect: 'follow' }),
		);
		expect(result.url).toBe(PUBLIC_FIGMA_CREDENTIALS_URL);
		expect(result.documents?.[0].url).toBe(PUBLIC_FIGMA_CREDENTIALS_URL);
	});

	it('uses stale cached registry when refresh fails', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-23T08:00:00.000Z'));
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(createResponse(N8N_DOCS_REGISTRY_URL, REGISTRY))
			.mockRejectedValueOnce(new Error('network down'));
		vi.stubGlobal('fetch', fetchMock);
		const tool = createN8nDocsTool(createMockContext());

		await executeTool<N8nDocsToolResult>(tool, {
			action: 'search',
			query: 'Gmail OAuth',
			intent: 'credential-setup',
		});

		vi.setSystemTime(new Date('2026-06-23T08:06:00.000Z'));
		const result = await executeTool<N8nDocsToolResult>(tool, {
			action: 'search',
			query: 'Gmail OAuth',
			intent: 'credential-setup',
		});

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(result.matches?.[0].url).toBe(PUBLIC_GOOGLE_OAUTH_URL);
		expect(result.hint).toContain('Using cached n8n docs registry');
	});

	it('returns a structured error when the registry cannot be fetched', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => await Promise.reject(new Error('offline'))),
		);
		const tool = createN8nDocsTool(createMockContext());

		const result = await executeTool<N8nDocsToolResult>(tool, {
			action: 'search',
			query: 'credentials',
		});

		expect(result.matches).toEqual([]);
		expect(result.error).toBe('offline');
		expect(result.hint).toContain('Could not load n8n docs registry');
	});

	it('truncates over-limit docs page content deterministically', async () => {
		stubFetchWithMap({
			[N8N_DOCS_REGISTRY_URL]: REGISTRY,
			[CREATE_EDIT_URL]: '# Create and edit credentials\n\n0123456789abcdefghijklmnopqrstuvwxyz',
		});
		const tool = createN8nDocsTool(createMockContext());

		const result = await executeTool<N8nDocsToolResult>(tool, {
			action: 'lookup',
			query: 'Create and edit credentials',
			documentationUrl:
				'https://docs.n8n.io/build/understand-workflows/create-and-edit-credentials/',
			maxPages: 1,
			maxContentLength: 20,
		});

		expect(result.documents?.[0].truncated).toBe(true);
		expect(result.documents?.[0].content).toContain('# Create and edit cr');
		expect(result.documents?.[0].content).not.toContain('abcdefghijklmnopqrstuvwxyz');
	});
});
