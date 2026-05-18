# MCP Server Support — Anthropic Node (n8n)

## Status

**4 Commits lokal fertig, Push blockiert (403 Proxy-Fehler)**

Branch: `claude/add-mcp-server-support-0ylTe`
Basis: `master` (ef3c3e0f)

Patch-Datei zum Anwenden: `/tmp/mcp-server-support.patch`

---

## Patch anwenden (lokaler Einstieg)

```bash
# Im n8n-Root:
git checkout -b claude/add-mcp-server-support-0ylTe
git am /tmp/mcp-server-support.patch
```

Oder mit `git apply` (ohne Commit-Metadaten):
```bash
git apply /tmp/mcp-server-support.patch
```

---

## Was wurde implementiert

### Ziel
"Enable MCP Servers (Beta)"-Toggle im Anthropic-Node, der bei Aktivierung:
1. Ein `mcp_servers`-Array in den Request-Body injiziert
2. Für jeden Server einen `mcp_toolset`-Eintrag im `tools`-Array ergänzt (Pflicht laut API)
3. Den Beta-Header `mcp-client-2025-11-20` setzt

### Geänderte Dateien

#### `packages/@n8n/nodes-langchain/nodes/vendors/Anthropic/transport/index.ts`
- `mcpClient?: boolean` zu `enableAnthropicBetas` hinzugefügt
- Beta-Header-Mapping: `mcp-client-2025-11-20` (nicht das veraltete `mcp-client-2025-04-04`)

#### `packages/@n8n/nodes-langchain/nodes/vendors/Anthropic/helpers/interfaces.ts`
- `mcp_toolset`-Variante zur `Tool`-Union hinzugefügt:
  ```typescript
  | { type: 'mcp_toolset'; mcp_server_name: string }
  ```

#### `packages/@n8n/nodes-langchain/nodes/vendors/Anthropic/actions/text/message.operation.ts`
- UI-Properties in `Options`-Collection:
	- `enableMcpServers` (boolean, default `false`)
	- `mcpServers` (fixedCollection, multipleValues, nur sichtbar wenn Toggle ON)
		- Felder pro Server: `name` (required), `url` (required), `authorizationToken` (password, optional)
- `MessageOptions`-Interface erweitert
- Body-Logik:
	- `mcp_servers`-Array aus konfigurierten Servern
	- `mcp_toolset`-Einträge in `tools`-Array (je ein Eintrag pro Server, referenziert per `name`)
- `mcpClient`-Flag in beiden `enableAnthropicBetas`-Aufrufen (Initial-Request + Tool-Loop)

#### `packages/@n8n/nodes-langchain/nodes/vendors/Anthropic/transport/index.test.ts`
- 2 neue Tests:
	- `mcp-client-2025-11-20` Header bei `mcpClient: true`
	- Kombiniert mit `codeExecution`

#### `packages/@n8n/nodes-langchain/nodes/vendors/Anthropic/actions/text/message.operation.test.ts` *(neu)*
- **Vitest** (nicht Jest) — `vi.mock`, `vi.hoisted`, `vi.importActual`, `vitest-mock-extended`
- 8 Tests:
	- Toggle OFF: kein `mcp_servers`, kein `mcp_toolset`
	- Toggle ON: `mcp_servers`-Array korrekt
	- `mcp_toolset`-Injection pro Server
	- Mehrere Server gleichzeitig
	- `authorization_token` weggelassen wenn leer
	- `mcpClient`-Beta gesetzt
	- Kompatibel mit `codeExecution`-Beta

#### `packages/@n8n/nodes-langchain/vitest.config.ts` *(neu)*
- Minimaler Vitest-Config mit `@utils`-Alias

---

## API-Referenz (Anthropic Docs)

Doku: https://platform.claude.com/docs/en/agents-and-tools/mcp-connector

**Request-Struktur:**
```json
{
  "mcp_servers": [
    { "type": "url", "name": "my-server", "url": "https://mcp.example.com/sse", "authorization_token": "..." }
  ],
  "tools": [
    { "type": "mcp_toolset", "mcp_server_name": "my-server" }
  ]
}
```

**Validierungsregeln:**
- Jeder Server in `mcp_servers` muss von genau einem `mcp_toolset` in `tools` referenziert werden
- Beta-Header: `mcp-client-2025-11-20` (Vorgänger `mcp-client-2025-04-04` ist deprecated)

---

## Tests ausführen

```bash
cd packages/@n8n/nodes-langchain

# Transport-Tests (Jest)
pnpm test transport/index.test.ts

# Operation-Tests (Vitest)
# Benötigt den vitest-Binary aus einem anderen Package:
../../@n8n/cli/node_modules/.bin/vitest run \
  nodes/vendors/Anthropic/actions/text/message.operation.test.ts

# Typecheck
pnpm typecheck
```

> **Hinweis:** `vitest-mock-extended` ist in `node_modules/` via Symlink verknüpft
> (zeigt auf `.pnpm/vitest-mock-extended@3.1.0_.../node_modules/vitest-mock-extended`).
> Nach einem frischen `pnpm install` wird der Symlink durch pnpm verwaltet — das Package
> muss ggf. als `devDependency` in `packages/@n8n/nodes-langchain/package.json` eingetragen
> werden.

---
