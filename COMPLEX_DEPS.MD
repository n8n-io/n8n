# Complex Dependency Catalog Violations

Dependencies that could NOT be safely unified into the pnpm catalog because
they are used at genuinely different versions across workspace packages.
Each entry needs a deliberate decision before being added to the catalog.

---

## @ai-sdk/anthropic
- `packages/cli/package.json` → `2.0.61`
- `packages/@n8n/agents/package.json` → `^3.0.58`
- `packages/@n8n/instance-ai/package.json` → `2.0.61`

**Issue:** Major version split — cli and instance-ai are on v2, agents on v3.

---

## @joplin/turndown-plugin-gfm
- `packages/@n8n/mcp-browser/package.json` → `1.0.64` (pinned)
- `packages/@n8n/instance-ai/package.json` → `^1.0.12` (range)

**Issue:** Pinned vs. range — resolves could differ (1.0.12 vs 1.0.64).

---

## @mozilla/readability
- All packages now use `catalog:` (resolved to `0.6.0`)
- `packages/@n8n/ai-workflow-builder.ee/package.json` — baseline entry may be stale

**Note:** Baseline violation may be stale; all packages are already on `catalog:`.

---

## @n8n/typeorm
- `packages/@n8n/nodes-langchain/package.json` → `0.3.20-16`
- `packages/cli/package.json`, `packages/@n8n/db/package.json`, etc. → `catalog:` (resolves to `0.3.20-17`)

**Issue:** nodes-langchain is one patch behind the catalog version.
Action needed: upgrade nodes-langchain to `0.3.20-17` / `catalog:`.

---

## @oclif/core
- `packages/node-dev/package.json` → `4.0.7`
- `packages/@n8n/benchmark/package.json` → `4.0.7`
- `packages/@n8n/cli/package.json` → `^4.5.2`
- `packages/@n8n/node-cli/package.json` → `^4.5.2`

**Issue:** node-dev and benchmark are pinned to an older minor (4.0.7) while cli and node-cli use ^4.5.2.

---

## @opentelemetry/sdk-trace-base
- `packages/cli/package.json` → `^2.7.1`
- `packages/@n8n/agents/package.json` → `>=1.0.0`

**Issue:** agents uses a very permissive range; could resolve to a different version than cli's strict range.

---

## @opentelemetry/sdk-trace-node
- `packages/cli/package.json` → `^2.7.1`
- `packages/@n8n/agents/package.json` → `>=1.0.0`

**Issue:** Same as sdk-trace-base above.

---

## @types/node
- `packages/@n8n/tournament/package.json` → `^18.13.0`
- All other workspace packages → `catalog:` (resolves to `24.10.1`)

**Issue:** tournament pins Node 18 types while the catalog targets Node 24.

---

## @types/psl
- `packages/cli/package.json` → `^1.1.0`
- `packages/@n8n/instance-ai/package.json` → `1.1.3` (pinned)

**Issue:** Pinned vs. range; could resolve identically but should be verified.

---

## @types/turndown
- `packages/@n8n/mcp-browser/package.json` → `^5.0.6`
- `packages/@n8n/ai-workflow-builder.ee/package.json` → `^5.0.6`
- `packages/@n8n/instance-ai/package.json` → `^5.0.5`

**Issue:** instance-ai uses `^5.0.5` while others use `^5.0.6`; likely resolves the same but catalog version must be chosen.

---

## @vueuse/core
- `packages/frontend/@n8n/design-system/package.json` → `*` (any version)
- All other frontend packages → `catalog:frontend` (resolves to `^10.11.0`)

**Issue:** `*` is intentionally permissive in design-system; switching to `catalog:frontend` constrains it to `^10.11.0`. Needs frontend team sign-off.

---

## change-case
- `packages/nodes-base/package.json` → `4.1.2`
- `packages/node-dev/package.json` → `^4.1.1`
- `packages/cli/package.json` → `4.1.2`
- `packages/@n8n/node-cli/package.json` → `^5.4.4`
- `packages/frontend/editor-ui/package.json` → `^5.4.4`

**Issue:** Major version split — nodes-base, node-dev, and cli use v4; node-cli and editor-ui use v5. API is not compatible across major versions.

---

## cheerio
- `packages/nodes-base/package.json` → `1.0.0-rc.6`
- `packages/@n8n/nodes-langchain/package.json` → `1.0.0`

**Issue:** nodes-base is on an old release candidate; nodes-langchain uses the stable `1.0.0`.

---

## csv-parse
- `packages/nodes-base/package.json` → `5.5.0`
- `packages/@n8n/ai-workflow-builder.ee/package.json` → `6.2.1`
- `packages/@n8n/instance-ai/package.json` → `6.2.1`

**Issue:** Major version split (v5 vs v6). nodes-base needs upgrading.

---

## eslint-plugin-n8n-nodes-base
- **Resolved** — now unified at `1.16.5` via `catalog:`.

---

## eventsource
- `packages/nodes-base/package.json` → `2.0.2`
- `packages/@n8n/computer-use/package.json` → `^3.0.6`

**Issue:** Major version split (v2 vs v3).

---

## jsdom
- All packages now use `catalog:` (resolves to `23.0.1`)

**Note:** Baseline violation may be stale; all packages are already on `catalog:`.

---

## langsmith
- All packages now use `catalog:` (resolves to `0.5.19`)

**Note:** Baseline violation may be stale; all packages are already on `catalog:`.

---

## mongodb
- `packages/nodes-base/package.json` → `6.11.0`
- `packages/@n8n/nodes-langchain/package.json` → `^6.17.0`

**Issue:** nodes-base is behind on minor version.

---

## n8n-workflow
- `packages/@n8n/ai-utilities/package.json` → `*` (any version)
- `packages/@n8n/eslint-plugin-community-nodes/package.json` → `>=2`
- All other workspace packages → `workspace:*`

**Issue:** ai-utilities uses `*` and eslint-plugin uses `>=2` instead of `workspace:*`. These are external-facing packages that can't rely on workspace links.

---

## openai
- `packages/@n8n/nodes-langchain/package.json` → `^6.34.0`
- Catalog → `6.19.0`

**Issue:** nodes-langchain requires a newer minor than what the catalog pins. Catalog needs to be bumped or nodes-langchain pinned differently.

---

## pdf-parse
- `packages/@n8n/instance-ai/package.json` → `2.4.5`
- `packages/@n8n/nodes-langchain/package.json` → `1.1.1`

**Issue:** Major version split (v1 vs v2).

---

## prettier
- `packages/cli/package.json` → `^3.6.2`
- `packages/@n8n/node-cli/package.json` → `3.6.2` (pinned)
- `packages/frontend/editor-ui/package.json` → `^3.3.3`

**Issue:** editor-ui lags behind the other two; all three need aligning to a common version before adding to catalog.

---

## stylelint
- `packages/@n8n/stylelint-config/package.json` → `>= 16` (peer dep)

**Note:** The `>= 16` is a peer dependency range, not a real version pin. Adding to catalog is not applicable here.

---

## turndown
- `packages/@n8n/mcp-browser/package.json` → `^7.2.0`
- `packages/@n8n/ai-workflow-builder.ee/package.json` → `^7.2.2`
- `packages/@n8n/instance-ai/package.json` → `^7.2.0`

**Issue:** ai-workflow-builder pins a slightly higher patch floor. Likely resolves identically in practice; align to `^7.2.0` or `^7.2.2` before adding to catalog.

---

## typescript
- `packages/@n8n/tournament/package.json` → `^5.0.0`
- All other workspace packages → `catalog:` (resolves to `6.0.2`)

**Issue:** tournament is pinned to TypeScript 5 while the rest of the monorepo has migrated to TypeScript 6.

---

## undici
- `packages/cli/package.json` → `^7.16.0`
- `packages/@n8n/ai-utilities/package.json` → `^6.21.0`

**Issue:** Major version split (v6 vs v7).

---

## unplugin-icons
- `packages/frontend/@n8n/chat/package.json` → `^0.19.0`
- All other frontend packages → `catalog:frontend` (resolves to `^23.0.1`)

**Issue:** chat is on a very old version (0.x) while the catalog is at 23.x. Major migration required.

---

## ws
- `packages/cli/package.json` → `8.17.1`
- `packages/@n8n/mcp-browser/package.json` → `8.17.1`
- `packages/@n8n/task-runner/package.json` → `^8.18.0`

**Issue:** cli and mcp-browser pin to `8.17.1` while task-runner uses `^8.18.0`. Align all to `^8.18.0` (or latest) before adding to catalog.

---

## zod
- `packages/@n8n/json-schema-to-zod/package.json` → `^3.25.76`
- All other packages → `catalog:` (resolves to `3.25.67`)

**Issue:** json-schema-to-zod requires a newer patch than the catalog. Catalog needs to be bumped to `^3.25.76` or higher.
