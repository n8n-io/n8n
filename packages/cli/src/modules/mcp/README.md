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

## Rate limiting

Two layers apply, and the second only ever tightens the first:

1. A flat per-IP limit on the whole endpoint (`N8N_MCP_SERVER_RATE_LIMIT`,
   default 100 per 5 minutes).
2. A tighter per-user, per-tool limit for the tools that trigger executions or
   heavy creation — `execute_workflow`, `test_workflow`,
   `create_workflow_from_code` — keyed off `Mcp-Name`
   (`N8N_MCP_SERVER_WRITE_TOOL_RATE_LIMIT`, default 60 per 5 minutes). Set it to
   `0` to disable. Both layers are enforced in production only, so local building
   is never throttled.

### Fronting the endpoint at the ingress

Because `Mcp-Name` is required and body-independent, an ingress can throttle the
expensive tools before a request ever reaches n8n. Example nginx config that lets
reads flow freely while capping the write tools:

```nginx
# Map the tool name to a limit key; only the write tools get a key, so reads are
# never counted against the zone.
map $http_mcp_name $mcp_write_tool {
    default          "";
    execute_workflow          $binary_remote_addr;
    test_workflow             $binary_remote_addr;
    create_workflow_from_code $binary_remote_addr;
}

limit_req_zone $mcp_write_tool zone=mcp_write:10m rate=12r/m;

location /mcp-server/http {
    limit_req zone=mcp_write burst=5 nodelay;
    proxy_pass http://n8n_upstream;
}
```

Keep the app-level limit in place as a backstop for deployments without such an
ingress.
