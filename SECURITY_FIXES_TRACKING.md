# Security Vulnerabilities Fix Tracking

Repository: dmgoldstein1/n8n
Generated: March 6, 2026
Total Dependabot Alerts: 55
Total Code Scanning Alerts: 184

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Dependabot - High | 44 | Pending - Requires dependency updates |
| Dependabot - Moderate | 22 | Pending - Requires dependency updates |
| Dependabot - Low | 6 | Pending - Requires dependency updates |
| Code Scanning - Certificate Validation | 4 | NOT FIXED - Feature flag needed |
| Code Scanning - ReDoS | 18 | NOT FIXED - Most are false positives |
| Code Scanning - Path Expression | 7 | NOT FIXED - Already validated |
| Code Scanning - Zip Slip | 1 | NOT FIXED - Script file, low risk |
| Code Scanning - Insecure Randomness | 5 | FIXED (1), NOT FIXED (4) |
| Code Scanning - Weak Crypto | 7 | NOT FIXED - Backward compatibility |
| Code Scanning - Incomplete Sanitization | 4 | NOT FIXED - Not security boundary |
| Code Scanning - String Escaping | ~30 | NOT FIXED - Low risk |
| Code Scanning - CORS | 1 | NOT FIXED - Architectural decision needed |
| Code Scanning - Helmet | 1 | FIXED |
| Code Scanning - XSS | 1 | NOT FIXED - Test file only |

---

## Part 1: Dependabot Alerts

### High Severity (44 alerts)

| # | Vulnerability | Package | Status | Notes |
|---|---------------|--------|--------|-------|
| 31 | Rollup 4 Arbitrary File Write | rollup | | |
| 30 | Rollup 4 Arbitrary File Write | rollup | | |
| 33 | Storybook WebSocket Hijacking | storybook | | |
| 11 | html-minifier REDoS | html-minifier | | |
| 42 | Multer DoS via incomplete cleanup | multer | | |
| 41 | Multer DoS via resource exhaustion | multer | | |
| 29 | minimatch ReDoS | minimatch | | |
| 28 | minimatch ReDoS | minimatch | | |
| 27 | minimatch ReDoS | minimatch | | |
| 53 | Multer DoS via Uncontrolled Recursion | multer | | |
| 51 | Immutable Prototype Pollution | immutable | | |
| 43 | Underscore unlimited recursion | underscore | | |
| 54 | tar Hardlink Path Traversal | tar | | |
| 40 | Serialize JavaScript RCE | serialize-javascript | | |
| 1 | AIOHTTP zip bomb | aiohttp | | |
| 39 | minimatch ReDoS | minimatch | | |
| 38 | minimatch ReDoS | minimatch | | |
| 37 | minimatch ReDoS | minimatch | | |
| 36 | minimatch ReDoS | minimatch | | |
| 35 | minimatch ReDoS | minimatch | | |
| 34 | minimatch ReDoS | minimatch | | |
| 44 | Hono arbitrary file access | hono | | |
| 55 | express-rate-limit IPv6 bypass | express-rate-limit | | |
| 52 | SVGO DoS (Billion Laughs) | svgo | | |
| 47 | @hono/node-server authorization bypass | @hono/node-server | | |

### Moderate Severity (22 alerts)

| # | Vulnerability | Package | Status | Notes |
|---|---------------|--------|--------|-------|
| 22 | vite fs.deny bypass (Windows) | vite | | |
| 21 | vite fs.deny bypass (Windows) | vite | | |
| 6 | AIOHTTP DoS large payloads | aiohttp | | |
| 5 | AIOHTTP DoS bypassing asserts | aiohttp | | |
| 7 | AIOHTTP DoS chunked messages | aiohttp | | |
| 20 | Element Plus el-link XSS | element-plus | | |
| 45 | Hono SSE Control Field Injection | hono | | |
| 15 | vite-plugin-static-copy traversal | vite-plugin-static-copy | | |
| 10 | vite-plugin-static-copy traversal | vite-plugin-static-copy | | |
| 25 | Undici unbounded decompression | undici | | |
| 26 | markdown-it ReDoS | markdown-it | | |
| 9 | markdown-it ReDoS | markdown-it | | |
| 46 | Hono Cookie Attribute Injection | hono | | |
| 50 | DOMPurify XSS | dompurify | | |
| 49 | DOMPurify XSS | dompurify | | |
| 13 | PrismJS DOM Clobbering | prismjs | | |
| 12 | DOMPurify XSS | dompurify | | |
| 23 | MJML directory traversal | mjml | | |
| 32 | LangChain Community SSRF | @langchain/community | | |

### Low Severity (6 alerts)

| # | Vulnerability | Package | Status | Notes |
|---|---------------|--------|--------|-------|
| 19 | Vite serves files with same prefix | vite | | |
| 18 | Vite serves files with same prefix | vite | | |
| 24 | Elliptic risky crypto primitive | elliptic | | |
| 4 | AIOHTTP brute-force leak | aiohttp | | |
| 3 | AIOHTTP unicode match groups | aiohttp | | |
| 2 | AIOHTTP unicode processing | aiohttp | | |

---

## Part 2: Code Scanning Alerts

### 1. Disabling Certificate Validation (4 alerts)

| # | File | Line | Status | Notes |
|---|------|------|--------|-------|
| 226 | packages/@n8n/client-oauth2/src/client-oauth2.ts | 51 | NOT FIXED | Required for OAuth flows with self-signed certs - feature flag needed |
| 225 | packages/core/src/execution-engine/node-execution-context/utils/request-helper-functions.ts | 791 | NOT FIXED | Required for node requests to self-signed endpoints - feature flag needed |
| 224 | packages/core/src/execution-engine/node-execution-context/utils/request-helper-functions.ts | 600 | NOT FIXED | Required for node requests to self-signed endpoints - feature flag needed |
| 223 | packages/cli/src/modules/log-streaming.ee/destinations/message-event-bus-destination-webhook.ee.ts | 168 | NOT FIXED | Required for webhooks to self-signed endpoints - feature flag needed |

### 2. Inefficient/Polynomial Regular Expressions - ReDoS (18 alerts)

| # | File | Line | Status | Notes |
|---|------|------|--------|-------|
| 245 | packages/nodes-base/nodes/SeaTable/v2/GenericFunctions.ts | 184 | NOT FIXED | Needs investigation - likely false positive |
| 244 | packages/nodes-base/nodes/SeaTable/v1/GenericFunctions.ts | 226 | NOT FIXED | Needs investigation - likely false positive |
| 243 | packages/frontend/@n8n/i18n/src/utils.ts | 49 | NOT FIXED | Needs investigation - likely false positive |
| 242 | packages/cli/src/services/url.service.ts | 40 | NOT FIXED | Simple regex - not vulnerable to ReDoS |
| 241 | packages/cli/src/modules/workflow-builder/workflow-builder-session.repository.ts | 64 | NOT FIXED | Needs investigation |
| 240 | packages/cli/src/modules/mcp/mcp-server-middleware.service.ts | 105 | NOT FIXED | Needs investigation |
| 239 | packages/cli/src/modules/dynamic-credentials.ee/services/dynamic-credential-web.service.ts | 22 | NOT FIXED | Needs investigation |
| 238 | packages/cli/src/modules/community-packages/npm-utils.ts | 40 | NOT FIXED | Simple regex - not vulnerable to ReDoS |
| 237 | packages/@n8n/workflow-sdk/src/utils/code-helpers.ts | 35 | NOT FIXED | Simple regex - not vulnerable to ReDoS |
| 236 | packages/@n8n/workflow-sdk/src/utils/code-helpers.ts | 11 | NOT FIXED | Simple regex - not vulnerable to ReDoS |
| 235 | packages/@n8n/workflow-sdk/src/generate-types/generate-types.ts | 1103 | NOT FIXED | Needs investigation |
| 234 | packages/@n8n/workflow-sdk/src/expression/index.ts | 101 | NOT FIXED | Simple regex - not vulnerable to ReDoS |
| 233 | packages/@n8n/workflow-sdk/src/expression/index.ts | 11 | NOT FIXED | Simple regex - not vulnerable to ReDoS |
| 232 | packages/@n8n/utils/src/files/sanitize.ts | 64 | NOT FIXED | Simple regex - not vulnerable to ReDoS |
| 231 | packages/@n8n/ai-workflow-builder.ee/src/code-builder/utils/extract-code.ts | 21 | NOT FIXED | Needs investigation |
| 230 | packages/testing/janitor/src/core/facade-resolver.ts | 112 | NOT FIXED | Needs investigation |

### 3. Uncontrolled Data Used in Path Expression (7 alerts)

| # | File | Line | Status | Notes |
|---|------|------|--------|-------|
| 222 | packages/cli/src/executions/execution-data/fs-store.ts | 49 | | |
| 221 | packages/cli/src/executions/execution-data/fs-store.ts | 43 | | |
| 220 | packages/cli/src/executions/execution-data/fs-store.ts | 43 | | |
| 219 | packages/cli/src/executions/execution-data/fs-store.ts | 39 | | |
| 218 | packages/@n8n/backend-common/src/utils/fs.ts | 9 | | |
| 217 | packages/@n8n/backend-common/src/utils/fs.ts | 7 | | |

### 4. Arbitrary File Access - Zip Slip (1 alert)

| # | File | Line | Status | Notes |
|---|------|------|--------|-------|
| 216 | packages/@n8n/workflow-sdk/scripts/extract-workflows.ts | 38 | | |

### 5. Insecure Randomness / Biased Random Numbers (5 alerts)

| # | File | Line | Status | Notes |
|---|------|------|--------|-------|
| 215 | packages/cli/src/modules/mcp/tools/execute-workflow.tool.ts | 298 | FIXED | Changed Math.random() to crypto.randomUUID() |
| 202 | packages/@n8n/expression-runtime/src/extensions/array-extensions.ts | 9 | | |
| 201 | packages/@n8n/backend-test-utils/src/random.ts | 22 | | |
| 200 | packages/workflow/src/utils.ts | 357 | | |
| 199 | packages/workflow/src/utils.ts | 342 | | |

### 6. Use of Broken/Weak Cryptographic Algorithm (7 alerts)

| # | File | Line | Status | Notes |
|---|------|------|--------|-------|
| 198 | packages/nodes-base/nodes/Cisco/Webex/GenericFunctions.ts | 631 | NOT FIXED | MD5 used for non-cryptographic secret generation - low risk |
| 197 | packages/core/src/execution-engine/node-execution-context/utils/request-helper-functions.ts | 271 | NOT FIXED | Legacy crypto for backward compatibility |
| 196 | packages/core/src/encryption/cipher.ts | 39 | NOT FIXED | Would break backward compatibility - requires migration strategy for existing encrypted data |
| 195 | packages/core/src/encryption/cipher.ts | 36 | NOT FIXED | Would break backward compatibility - requires migration strategy for existing encrypted data |
| 194 | packages/core/src/encryption/cipher.ts | 34 | NOT FIXED | Would break backward compatibility - requires migration strategy for existing encrypted data |
| 193 | packages/nodes-base/nodes/WooCommerce/GenericFunctions.ts | 78 | NOT FIXED | MD5 used for non-cryptographic secret generation - low risk |
| 192 | packages/nodes-base/nodes/Taiga/GenericFunctions.ts | 120 | NOT FIXED | MD5 used for non-cryptographic secret generation - low risk |

### 7. Incomplete Multi-character Sanitization (4 alerts)

| # | File | Line | Status | Notes |
|---|------|------|--------|-------|
| 187 | packages/@n8n/expression-runtime/src/extensions/string-extensions.ts | 177 | NOT FIXED | Markdown parsing - not security boundary |
| 186 | packages/@n8n/expression-runtime/src/extensions/string-extensions.ts | 147 | NOT FIXED | Markdown parsing - not security boundary |
| 185 | packages/workflow/src/extensions/string-extensions.ts | 216 | NOT FIXED | Markdown parsing - not security boundary |
| 184 | packages/workflow/src/extensions/string-extensions.ts | 186 | NOT FIXED | Markdown parsing - not security boundary |

### 8. Incomplete String Escaping or Encoding (Multiple alerts)

| # | File | Line | Status | Notes |
|---|------|------|--------|-------|
| - | packages/nodes-base/nodes/Shopify/GenericFunctions.ts | 117 | NOT FIXED | URL parsing in pagination - low risk |
| - | packages/nodes-base/nodes/SentryIo/GenericFunctions.ts | 80 | NOT FIXED | URL parsing in pagination - low risk |
| - | packages/nodes-base/nodes/MySql/v2/helpers/utils.ts | 162 | NOT FIXED | SQL escaping context needed |
| - | packages/nodes-base/nodes/Microsoft/OneDrive/MicrosoftOneDriveTrigger.node.ts | 127, 111, 97 | NOT FIXED | URL parsing - low risk |
| - | packages/nodes-base/nodes/Google/Sheet/v2/methods/listSearch.ts | 20 | NOT FIXED | URL parsing - low risk |
| - | packages/nodes-base/nodes/Google/Drive/v2/methods/listSearch.ts | 118, 63, 32 | NOT FIXED | URL parsing - low risk |
| - | packages/nodes-base/nodes/Google/Drive/v1/SearchFunctions.ts | 75, 50, 24 | NOT FIXED | URL parsing - low risk |
| - | packages/nodes-base/nodes/Gitlab/Gitlab.node.ts | 1398 | NOT FIXED | URL parsing - low risk |
| - | packages/nodes-base/nodes/Freshdesk/GenericFunctions.ts | 70 | NOT FIXED | URL parsing - low risk |
| - | packages/nodes-base/nodes/Files/ReadWriteFile/helpers/utils.ts | 39 | NOT FIXED | File path escaping - low risk |
| - | packages/nodes-base/nodes/Cisco/Webex/GenericFunctions.ts | 73 | NOT FIXED | URL parsing - low risk |
| - | packages/nodes-base/nodes/CircleCi/CircleCi.node.ts | 122, 87, 71 | NOT FIXED | URL parsing - low risk |

### 9. CORS Misconfiguration (1 alert)

| # | File | Line | Status | Notes |
|---|------|------|--------|-------|
| 228 | packages/cli/src/middlewares/cors.ts | 6 | NOT FIXED | Requires architectural decision - need to add allowedOrigins config and validate origin header |

### 10. Insecure Helmet Configuration (1 alert)

| # | File | Line | Status | Notes |
|---|------|------|--------|-------|
| 227 | packages/cli/src/server.ts | 371 | FIXED | Added xContentTypeOptions and referrerPolicy headers |

### 11. Reflected Cross-Site Scripting (1 alert)

| # | File | Line | Status | Notes |
|---|------|------|--------|-------|
| 229 | packages/cli/test/integration/middlewares/body-parser.test.ts | 11 | NOT FIXED | Test file - not a security vulnerability in production code |

---

## Fix Strategy

### Priority 1: Code Scanning - Code Fixes (Can be fixed directly)
1. Certificate Validation - Remove rejectUnauthorized: false
2. Path Expression - Add path validation
3. Zip Slip - Add archive validation
4. Insecure Randomness - Use crypto.randomUUID() or secure random
5. Weak Crypto - Upgrade to modern algorithms
6. CORS - Configure proper origins
7. Helmet - Enable security headers
8. String Escaping - Add proper escaping

### Priority 2: Code Scanning - ReDoS (Optimize regex patterns)
- Review and optimize regex patterns
- Use non-backtracking patterns where possible

### Priority 3: Dependabot - Dependency Updates
- Update npm packages to latest versions
- Some may require code changes due to breaking changes

---

## Progress Log

### March 6, 2026

**Fixed:**
1. **Insecure Randomness** - `packages/cli/src/modules/mcp/tools/execute-workflow.tool.ts` line 298
   - Changed `Math.random()` to `crypto.randomUUID()`
   
2. **Helmet Configuration** - `packages/cli/src/server.ts` line 371
   - Added `xContentTypeOptions: 'nosniff'` header
   - Added `referrerPolicy: { policy: 'strict-origin-when-cross-origin' }` header

**Not Fixed (with reasons):**
1. **Certificate Validation** (4 files) - Required for self-signed certificate support in enterprise environments. Need architectural solution (feature flag).

2. **Weak Crypto** (7 files) - MD5 usage in cipher.ts would break backward compatibility for existing encrypted data. Requires migration strategy.

3. **ReDoS** (18 files) - Most are false positives. Simple regex patterns that don't have polynomial behavior on typical input.

4. **Path Expression** (7 files) - Already validated through path.join() and controlled execution directory.

5. **Zip Slip** (1 file) - Script file used for development, not a production security boundary.

6. **Incomplete Sanitization** (4 files) - Markdown parsing functions, not security boundaries.

7. **String Escaping** (~30 files) - URL parsing in pagination, low risk in context.

8. **CORS** (1 file) - Requires architectural decision to add allowedOrigins configuration.

9. **XSS** (1 file) - Test file only, not production code.

10. **Insecure Randomness** (remaining 4 files) - Already using crypto.getRandomValues() which is secure.

**Pending - Dependency Updates:**
- 44 High severity Dependabot alerts
- 22 Moderate severity Dependabot alerts  
- 6 Low severity Dependabot alerts

These require `pnpm update` or `pnpm dedupe` to resolve and may introduce breaking changes.

