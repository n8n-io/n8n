# Instance MCP server

Serves the instance-level MCP endpoint at `POST /mcp-server/http`. It speaks the
2026-07-28 protocol revision and, through the SDK's stateless legacy fallback,
still serves 2025-era clients on the same endpoint.

## Routing headers (2026-07-28)

The revision requires two headers on every Streamable HTTP `POST` so that
gateways, load balancers, and WAFs can route and rate-limit without parsing the
JSON-RPC body:

- `Mcp-Method` — the JSON-RPC method (e.g. `tools/call`, `tools/list`,
  `server/discover`).
- `Mcp-Name` — for `tools/call`, the tool being called (e.g. `execute_workflow`).

The SDK validates these against the parsed body and rejects a disagreement with
`HeaderMismatchError` (`-32020`), so a client cannot mislabel the header to route
around a rule keyed on it. Browser-based clients can only send these when they
are in the CORS allow-list, which is why `setCorsHeaders` advertises
`MCP-Protocol-Version`, `Mcp-Method`, and `Mcp-Name`.
