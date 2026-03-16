# Web Research for Instance AI — Implementation Plan

## Design Philosophy

Steal the best ideas from Claude Code and Codex, avoid their mistakes:

- **From Claude Code**: Local content extraction (Readability + Turndown), lightweight model summarization for large pages, LRU caching
- **From Codex**: Simplicity — minimal tool surface, no over-abstraction
- **From n8n WebFetch spec**: Post-redirect SSRF checks, safety flags (`js_rendered_suspected`, `login_required`), GFM table support via `turndown-plugin-gfm`, PDF text extraction, max response size budgets
- **Neither Claude Code nor Codex did well**: Both treat web research as a flat tool. We add a research sub-agent for multi-step investigations (same pattern as our existing `build-workflow-with-agent`)

**Non-goals**: No browser automation (already handled by Chrome DevTools MCP), no provider abstraction layer (YAGNI — swap later if needed), no external dependency for content extraction.

---

## Architecture

```
Orchestrator
├── web-search    (direct tool — Brave Search API, returns snippets)
├── fetch-url     (direct tool — local HTTP + Readability + Turndown → markdown)
└── research-with-agent (orchestration tool — background sub-agent)
        └── Research Sub-Agent (max 12 steps)
            ├── web-search
            └── fetch-url
```

Two tools. One sub-agent. That's the entire surface.

### When the agent uses what


| User says                                                           | Agent does              | Why                                       |
| ------------------------------------------------------------------- | ----------------------- | ----------------------------------------- |
| "What auth does Notion use?"                                        | `web-search` (1 call)   | Snippet has the answer                    |
| "Show me the Stripe webhook docs"                                   | `fetch-url` on docs URL | Needs full page content                   |
| "Research how to build a Shopify→Slack inventory alert integration" | `research-with-agent`   | Multi-step: search, read docs, synthesize |


---

## 1. Service Interface

Add to `src/types.ts`:

```typescript
// ── Web Research ──

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
}

interface FetchedPage {
  url: string;
  finalUrl: string;   // after redirects (may differ from url)
  title: string;
  content: string;    // clean markdown
  truncated: boolean;
  contentLength: number;
  safetyFlags?: {
    jsRenderingSuspected?: boolean;  // page likely needs JS to render
    loginRequired?: boolean;         // paywall/login gate detected
  };
}

interface InstanceAiWebResearchService {
  search(query: string, options?: {
    maxResults?: number;        // default 5, max 20
    includeDomains?: string[];
    excludeDomains?: string[];
  }): Promise<WebSearchResponse>;

  fetchUrl(url: string, options?: {
    maxContentLength?: number;  // default 30_000 chars
    maxResponseBytes?: number;  // hard cap on HTTP response size, default 5MB
    timeoutMs?: number;         // default 30_000, max 120_000
  }): Promise<FetchedPage>;
}
```

Add `webResearchService` to `InstanceAiContext`.

Compared to v1 of this plan: no `StructuredExtraction`, no `searchDepth`, no `topic`, no `waitForSelector`, no `answer` field (Brave returns snippets, not AI answers — the agent synthesizes its own answers). The agent can reason over fetched markdown itself — it doesn't need a dedicated extraction tool.

---

## 2. Tools

### 2.1 `web-search`

**File:** `src/tools/web-research/web-search.tool.ts`

```typescript
export function createWebSearchTool(context: InstanceAiContext) {
  return createTool({
    id: 'web-search',
    description:
      'Search the web for information. Returns ranked results with titles, URLs, ' +
      'and snippets. Use for API docs, integration guides, error messages, and ' +
      'general technical questions.',
    inputSchema: z.object({
      query: z.string().describe(
        'Search query. Be specific — include service names, API versions, error codes.'
      ),
      maxResults: z.number().min(1).max(20).default(5).optional(),
      includeDomains: z.array(z.string()).optional().describe(
        'Restrict to domains, e.g. ["docs.stripe.com"]'
      ),
    }),
    outputSchema: z.object({
      query: z.string(),
      results: z.array(z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
        publishedDate: z.string().optional(),
      })),
    }),
    execute: async ({ query, maxResults, includeDomains }) => {
      return await context.webResearchService.search(query, {
        maxResults,
        includeDomains,
      });
    },
  });
}
```

### 2.2 `fetch-url`

**File:** `src/tools/web-research/fetch-url.tool.ts`

```typescript
export function createFetchUrlTool(context: InstanceAiContext) {
  return createTool({
    id: 'fetch-url',
    description:
      'Fetch a web page and extract its content as clean markdown. ' +
      'Use after web-search to read full documentation pages, API references, ' +
      'or guides. Large pages are automatically summarized.',
    inputSchema: z.object({
      url: z.string().url().describe('The URL to fetch'),
      maxContentLength: z.number().default(30_000).optional().describe(
        'Max chars to return. Lower = saves context. Default 30000.'
      ),
    }),
    outputSchema: z.object({
      url: z.string(),
      finalUrl: z.string(),
      title: z.string(),
      content: z.string(),
      truncated: z.boolean(),
      safetyFlags: z.object({
        jsRenderingSuspected: z.boolean().optional(),
        loginRequired: z.boolean().optional(),
      }).optional(),
    }),
    execute: async ({ url, maxContentLength }) => {
      return await context.webResearchService.fetchUrl(url, {
        maxContentLength,
      });
    },
  });
}
```

### 2.3 `research-with-agent`

**File:** `src/tools/orchestration/research-with-agent.tool.ts`

Same pattern as `build-workflow-with-agent` — spawns a background task, returns immediately.

```typescript
inputSchema: z.object({
  goal: z.string().describe(
    'What to research, e.g. "How does Shopify webhook authentication work ' +
    'and what scopes are needed for inventory updates?"'
  ),
  constraints: z.string().optional().describe(
    'Constraints, e.g. "Focus on REST API, not GraphQL"'
  ),
})

outputSchema: z.object({
  taskId: z.string(),
})
```

**Research sub-agent prompt** (`src/tools/orchestration/research-agent-prompt.ts`):

```markdown
You are a web research agent. Research the given topic thoroughly and
produce a clear, cited answer.

## Method
1. Break the goal into 2-4 specific search queries
2. Execute searches, review snippets to identify the most relevant URLs
3. Fetch the 2-3 most relevant pages for full content
4. Synthesize findings into a coherent answer

## Rules
- Cite every claim as [title](url)
- If sources conflict, note the discrepancy explicitly
- If information is not found, say so — never fabricate
- Prefer official documentation over blog posts or forums
- Maximum 5 fetched pages per research session
- End with a "## Sources" section listing all referenced URLs
```

**Max steps:** 12 (plan → 3 searches → 3 fetches → synthesis, with room for iteration)

---

## 3. Adapter Implementation

**File:** `packages/cli/src/modules/instance-ai/web-research/`

No provider abstraction. Two concrete implementations, directly in the adapter.

### 3.1 Search: Brave Search API

One HTTP GET. Same provider Claude Code uses under the hood.

```typescript
// web-research/brave-search.ts

const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

export async function braveSearch(
  apiKey: string,
  query: string,
  options: { maxResults?: number; includeDomains?: string[]; excludeDomains?: string[] },
): Promise<WebSearchResponse> {
  // Domain filtering via query syntax (Brave's native approach)
  let searchQuery = query;
  if (options.includeDomains?.length) {
    const siteFilter = options.includeDomains.map((d) => `site:${d}`).join(' OR ');
    searchQuery = `${query} (${siteFilter})`;
  }
  if (options.excludeDomains?.length) {
    searchQuery += options.excludeDomains.map((d) => ` -site:${d}`).join('');
  }

  const params = new URLSearchParams({
    q: searchQuery,
    count: String(options.maxResults ?? 5),
  });

  const response = await fetch(`${BRAVE_SEARCH_URL}?${params}`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    throw new OperationalError(`Brave search failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    query,
    results: (data.web?.results ?? []).map((r: BraveResult) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      publishedDate: r.age, // relative date like "2 days ago"
    })),
  };
}
```

**Why Brave Search:**

- Same search provider Claude Code uses (battle-tested at scale by Anthropic)
- Independent index (35B+ pages, not a Google/Bing wrapper)
- $5/month free credits (~1,000 queries) with attribution requirement; $5/1K requests after that
- Simple API: single GET, API key via header
- Privacy-first: no tracking, no data collection
- Domain filtering via standard `site:` query syntax

### 3.2 Content Extraction: Local Pipeline (Claude Code's Approach)

**Zero external API dependency.** Fetch the page ourselves, extract with Readability, convert with Turndown. This runs everywhere — Cloud, self-hosted, air-gapped.

```typescript
// web-research/fetch-and-extract.ts

import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';
import { gfm } from '@joplin/turndown-plugin-gfm';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});
turndown.use(gfm); // GFM tables, strikethrough, task lists

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB hard cap
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;

// Heuristics for safety flags
const LOGIN_SIGNALS = ['sign in', 'log in', 'subscribe', 'paywall', 'create an account'];
const JS_RENDER_SIGNALS = ['<noscript', 'enable javascript', 'app-root', '__NEXT_DATA__'];

export async function fetchAndExtract(
  url: string,
  options: { maxContentLength?: number; maxResponseBytes?: number; timeoutMs?: number },
): Promise<FetchedPage> {
  const timeoutMs = Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
  const maxBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES;

  // 1. Fetch (follow redirects — we check final URL for SSRF after)
  const response = await fetch(url, {
    headers: { 'User-Agent': 'n8n-instance-ai/1.0' },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new OperationalError(`Failed to fetch ${url}: ${response.status}`);
  }

  // 2. Post-redirect SSRF check — block if redirected to a private network
  const finalUrl = response.url;
  if (finalUrl !== url) {
    await assertPublicUrl(finalUrl);
  }

  // 3. Enforce max response size
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > maxBytes) {
    throw new OperationalError(`Response too large: ${contentLength} bytes (max ${maxBytes})`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const rawText = await response.text();

  if (rawText.length > maxBytes) {
    throw new OperationalError(`Response body too large: ${rawText.length} bytes (max ${maxBytes})`);
  }

  // 4. PDF support — extract text from PDF content
  if (contentType.includes('application/pdf')) {
    const pdfText = await extractPdfText(rawText);
    const maxLen = options.maxContentLength ?? 30_000;
    return {
      url, finalUrl, title: url,
      content: truncate(pdfText, maxLen),
      truncated: pdfText.length > maxLen,
      contentLength: pdfText.length,
    };
  }

  // 5. Plain text / markdown — pass through
  if (contentType.includes('text/plain') || contentType.includes('text/markdown')) {
    const maxLen = options.maxContentLength ?? 30_000;
    return {
      url, finalUrl, title: url,
      content: truncate(rawText, maxLen),
      truncated: rawText.length > maxLen,
      contentLength: rawText.length,
    };
  }

  // 6. Detect safety flags from raw HTML before extraction
  const htmlLower = rawText.toLowerCase();
  const safetyFlags = {
    jsRenderingSuspected: JS_RENDER_SIGNALS.some((s) => htmlLower.includes(s)),
    loginRequired: LOGIN_SIGNALS.some((s) => htmlLower.includes(s)),
  };

  // 7. Extract main content (strips nav, sidebar, footer, ads)
  const { document } = parseHTML(rawText);
  const reader = new Readability(document);
  const article = reader.parse();

  if (!article) {
    throw new OperationalError(`Could not extract content from ${url}`);
  }

  // 8. Convert to markdown (with GFM table support)
  const markdown = turndown.turndown(article.content);
  const maxLen = options.maxContentLength ?? 30_000;

  // 9. Refine safety flags — if extracted content is very short vs raw HTML, likely JS-rendered
  if (markdown.length < 200 && rawText.length > 10_000) {
    safetyFlags.jsRenderingSuspected = true;
  }

  return {
    url, finalUrl,
    title: article.title,
    content: truncate(markdown, maxLen),
    truncated: markdown.length > maxLen,
    contentLength: markdown.length,
    safetyFlags,
  };
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\n\n[... truncated at ' + maxLength + ' chars]';
}
```

**Why local instead of Jina Reader:**

- Zero external dependency — works everywhere, no API key needed for fetching
- Same approach Claude Code uses (Turndown), proven at scale
- No per-request cost for fetching (only search costs money)
- Full control over extraction pipeline
- Trade-off: no JS rendering. For JS-heavy SPAs, the agent gets a degraded result. This is acceptable — most documentation sites render server-side, and the browser MCP handles interactive pages.

### 3.3 Content Summarization for Large Pages

Stolen directly from Claude Code. When fetched content exceeds a threshold, compress it with a lightweight model call before returning to the agent.

```typescript
// web-research/summarize-content.ts

const SUMMARIZE_THRESHOLD = 15_000; // chars — above this, summarize

export async function maybeSummarize(
  page: FetchedPage,
  generateFn: (prompt: string) => Promise<string>,
): Promise<FetchedPage> {
  if (page.contentLength <= SUMMARIZE_THRESHOLD) {
    return page; // Small enough to pass through directly
  }

  const summary = await generateFn(
    `You are a technical documentation summarizer. Summarize the following ` +
    `web page content, preserving:\n` +
    `- API endpoints and methods\n` +
    `- Authentication requirements\n` +
    `- Code examples (keep them verbatim)\n` +
    `- Configuration options\n` +
    `- Error codes and their meanings\n\n` +
    `Discard: navigation, marketing copy, unrelated sidebar content.\n\n` +
    `--- PAGE CONTENT ---\n${page.content}`
  );

  return {
    ...page,
    content: summary,
    contentLength: summary.length,
    truncated: true,
  };
}
```

The `generateFn` is injected by the adapter — it calls whatever lightweight model is available (Haiku-equivalent). This keeps the web-research module model-agnostic per ADR-002.

**Why this matters:** A typical docs page is 40-80K chars. Without summarization, that eats the agent's entire context window on one page. With it, the agent gets a 3-5K char summary that preserves the technical content. This is the single biggest quality-of-life improvement over a naive implementation.

### 3.4 Caching

In-memory LRU cache at the adapter layer. Prevents redundant API calls when the agent searches for the same thing twice in one conversation (common during iterative debugging).

```typescript
// web-research/cache.ts

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(
    private maxSize: number = 100,
    private ttlMs: number = 15 * 60 * 1000, // 15 minutes
  ) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.cache.size >= this.maxSize) {
      // Delete oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
```

Two caches:

- `searchCache: LRUCache<WebSearchResponse>` — keyed by `query + JSON.stringify(options)`
- `fetchCache: LRUCache<FetchedPage>` — keyed by URL

### 3.5 SSRF Protection

Block requests to private/internal networks. This is critical for Cloud.

```typescript
// web-research/ssrf-guard.ts

import { URL } from 'node:url';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

const BLOCKED_RANGES = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^169\.254\./, /^0\./, /^::1$/, /^fe80:/i, /^fc00:/i, /^fd00:/i,
];

export async function assertPublicUrl(url: string): Promise<void> {
  const parsed = new URL(url);

  // Block non-HTTP(S) schemes
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new OperationalError(`Blocked: non-HTTP scheme ${parsed.protocol}`);
  }

  // Resolve hostname to IP and check against blocked ranges
  const hostname = parsed.hostname;
  const ip = isIP(hostname) ? hostname : (await lookup(hostname)).address;

  for (const range of BLOCKED_RANGES) {
    if (range.test(ip)) {
      throw new OperationalError(`Blocked: ${hostname} resolves to private IP`);
    }
  }
}
```

Called before every `fetch()` in the content extraction pipeline.

---

## 4. Wiring It Together

### 4.1 Adapter Service

In `instance-ai.adapter.service.ts`, add to `createContext()`:

```typescript
webResearchService: {
  search: async (query, options) => {
    const cacheKey = query + JSON.stringify(options ?? {});
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    const result = await braveSearch(config.braveSearchApiKey, query, options ?? {});
    searchCache.set(cacheKey, result);
    return result;
  },

  fetchUrl: async (url, options) => {
    await assertPublicUrl(url);

    const cached = fetchCache.get(url);
    if (cached) return cached;

    const page = await fetchAndExtract(url, options ?? {});
    const result = await maybeSummarize(page, generateWithLightModel);
    fetchCache.set(url, result);
    return result;
  },
},
```

### 4.2 Tool Registration

In `src/tools/index.ts`, add to `createAllTools()`:

```typescript
'web-search': createWebSearchTool(context),
'fetch-url': createFetchUrlTool(context),
```

Both tools are visible to the orchestrator and all sub-agents. No special filtering needed.

### 4.3 Orchestration Registration

In `src/agent/instance-agent.ts`, add `research-with-agent` to orchestration tools alongside `build-workflow-with-agent` and `manage-data-tables-with-agent`.

### 4.4 Conditional Registration

If no Brave Search API key is configured:

- `web-search` is **not registered** (same pattern as browser MCP tools being conditional)
- `fetch-url` **still works** (no API key needed — local HTTP fetch)
- `research-with-agent` is **not registered** (depends on search)

The agent gracefully degrades: it can still fetch known URLs but can't search.

### 4.5 System Prompt Update

Add to `src/agent/system-prompt.ts`:

```markdown
## Web Research

You have access to web search and URL fetching tools.

**Use `web-search` when you need to:**
- Look up API documentation or integration guides
- Find error message explanations
- Verify authentication methods or API endpoints
- Research services you're building workflows for

**Use `fetch-url` when you need to:**
- Read full documentation pages found via search
- Get detailed API reference content from a known URL

**Use `research-with-agent` when:**
- The research requires multiple searches and page reads
- You need to synthesize information from several sources
- The user's question requires deep investigation

**Do NOT use web research when:**
- You already know the answer with high confidence
- The question is about n8n internals (use best-practices or node tools instead)
- The user is asking about their specific workflow data (use execution/workflow tools)
```

---

## 5. Configuration

Two environment variables. That's it.

```
INSTANCE_AI_BRAVE_SEARCH_API_KEY=BSA-xxx   # Required for web-search. No key = search disabled.
INSTANCE_AI_SUMMARIZE_MODEL=haiku          # Optional. Model for large-page summarization. Default: cheapest available.
```

Content extraction (Readability + Turndown) needs no configuration — it's a local pipeline.

**On n8n Cloud:** n8n provides a default Brave Search key so search works out of the box. Operators can override with their own key for higher rate limits.

**Self-hosted:** Operator provides their own Brave Search key ($5/month free credits ≈ 1,000 queries, then $5/1K requests). Content extraction works immediately with no key.

**Air-gapped:** Search is unavailable. `fetch-url` works for internal URLs (after SSRF check allows the configured network range).

---

## 6. Safety


| Concern                                   | Mitigation                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **SSRF**                                  | DNS resolution + IP range check before every fetch. Blocks private ranges, link-local, loopback.                                                       |
| **Prompt injection from fetched content** | Content is summarized by a lightweight model before entering the main agent's context (same defense as Claude Code). Raw HTML never reaches the agent. |
| **Rate limiting**                         | Adapter-level: 30 searches/min, 15 fetches/min per user. Prevents runaway sub-agents.                                                                  |
| **Context flooding**                      | Content > 15K chars auto-summarized. Hard cap at 30K chars per fetch. Research sub-agent limited to 5 page fetches.                                    |
| **Cost control**                          | LRU cache (15-min TTL, 100 entries) deduplicates repeated searches/fetches. Research sub-agent capped at 12 steps.                                     |
| **Untrusted content**                     | `<script>`, `<style>`, `<iframe>` stripped by Readability before Turndown conversion.                                                                  |


---

## 7. New Dependencies


| Package                | Purpose                              | Size   | Required? |
| ---------------------- | ------------------------------------ | ------ | --------- |
| `@mozilla/readability` | Extract main content from HTML       | ~50KB  | Yes       |
| `turndown`             | HTML → Markdown                      | ~30KB  | Yes       |
| `linkedom`             | Lightweight DOM (no Puppeteer/JSDOM) | ~200KB | Yes       |


All three are well-maintained, widely used, and have no native/binary dependencies. Total added: ~280KB. Zero external API dependency for content extraction.

---

## 8. File Changes

### New Files (in `packages/@n8n/instance-ai`)

```
src/tools/web-research/
├── web-search.tool.ts
├── fetch-url.tool.ts
└── index.ts
src/tools/orchestration/
├── research-with-agent.tool.ts     (new)
└── research-agent-prompt.ts        (new)
```

### New Files (in `packages/cli`)

```
src/modules/instance-ai/web-research/
├── brave-search.ts
├── fetch-and-extract.ts
├── summarize-content.ts
├── ssrf-guard.ts
├── cache.ts
└── index.ts
```

### Modified Files


| File                                      | Change                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `instance-ai/src/types.ts`                | Add `WebSearch*` types + `InstanceAiWebResearchService` + update `InstanceAiContext`            |
| `instance-ai/src/tools/index.ts`          | Register `web-search` and `fetch-url`                                                           |
| `instance-ai/src/agent/instance-agent.ts` | Register `research-with-agent` in orchestration tools; conditional registration when no API key |
| `instance-ai/src/agent/system-prompt.ts`  | Add web research usage guidelines                                                               |
| `cli/.../instance-ai.adapter.service.ts`  | Wire `webResearchService` with Brave Search + local pipeline + cache                            |


---

## 9. Testing

### Unit Tests


| Test                        | What                                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| `web-search.tool.test.ts`   | Schema validation, service delegation                                     |
| `fetch-url.tool.test.ts`    | Schema validation, service delegation                                     |
| `brave-search.test.ts`      | Mock HTTP, verify request/response mapping, error handling                |
| `fetch-and-extract.test.ts` | Real HTML → markdown conversion, truncation logic, plain text passthrough |
| `ssrf-guard.test.ts`        | Private IPs blocked, public IPs allowed, DNS resolution tested            |
| `summarize-content.test.ts` | Below-threshold passthrough, above-threshold calls model                  |
| `cache.test.ts`             | LRU eviction, TTL expiry, cache hits                                      |


### Adapter Tests


| Test                           | What                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `web-research-adapter.test.ts` | End-to-end: search → cache → return, fetch → extract → summarize → cache → return |
| Conditional registration       | No API key → search tool absent, fetch tool present                               |


---

## 10. Implementation Phases

### Phase 1 — Search (standalone value)

- Types in `types.ts`
- `web-search` tool
- `braveSearch()` adapter function
- SSRF guard
- Cache
- System prompt update
- Tests

### Phase 2 — Fetch (standalone value)

- `fetch-url` tool
- `fetchAndExtract()` local pipeline
- `maybeSummarize()` with lightweight model
- Tests

### Phase 3 — Research Agent

- `research-with-agent` orchestration tool
- Research sub-agent prompt
- Tests

Each phase ships independently. Phase 1 alone is useful (agent can search and read snippets). Phase 2 adds deep reading. Phase 3 adds autonomous multi-step research.

---

## Appendix: Comparison with Prior Art


| Aspect                  | Claude Code                                    | Codex                              | This Plan                                                     |
| ----------------------- | ---------------------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| Search                  | Server-side (Brave)                            | Server-side (OpenAI Responses API) | Server-side (Brave Search API)                                |
| Content fetch           | Client-side (Axios + Turndown)                 | Server-side (OpenAI `OpenPage`)    | Server-side from n8n backend (fetch + Readability + Turndown) |
| Summarization           | Secondary Haiku call                           | None (Responses API compaction)    | Secondary lightweight model call                              |
| JS rendering            | No                                             | Yes (server-side)                  | No (browser MCP handles interactive pages)                    |
| Caching                 | 15-min LRU, 50MB                               | Cached vs Live mode                | 15-min LRU, 100 entries                                       |
| External deps for fetch | None (local Turndown)                          | None (server-side)                 | None (local Readability + Turndown)                           |
| Multi-step research     | No (flat tools only)                           | No                                 | Yes (background research sub-agent)                           |
| Works on Cloud          | WebSearch US-only, WebFetch from local machine | Yes (fully server-side)            | Yes (all server-side from n8n backend)                        |
| Works air-gapped        | No                                             | No                                 | Partial (fetch-url works, search doesn't)                     |


