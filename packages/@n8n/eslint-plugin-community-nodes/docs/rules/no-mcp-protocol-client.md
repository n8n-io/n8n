# Disallow MCP JSON-RPC clients in community node packages (`@n8n/community-nodes/no-mcp-protocol-client`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

n8n includes an MCP Client node. Use the vendor's REST API for a community node.
Model the resources and operations on that API. If the vendor has no REST API,
the package is not currently eligible for verification.

This rule checks all `.ts` files, including helpers. It reports these object properties:

- `jsonrpc` with the string value `'2.0'`.
- `method` with the string value `tools/call`, `tools/list`, `initialize`,
  `resources/list`, `resources/read`, `prompts/list`, `prompts/get`, or
  `notifications/initialized`.
- The header keys `Mcp-Session-Id` and `MCP-Protocol-Version`. Header names are case-insensitive.
- `protocolVersion` when the same file has a matching `jsonrpc` or `method` property.

The rule does not match URLs, display text, option values, aliases, or comments.
A REST endpoint can use an `mcp.` hostname or an `/mcp` path.
A vendor-side bridge that exposes only REST still needs manual review.

## Examples

### Incorrect

```typescript
const request = {
  headers: { 'Mcp-Session-Id': sessionId },
  body: {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name: 'createImage', arguments: { imageUrl } },
  },
};
```

### Correct

```typescript
const request = {
  method: 'POST',
  url: 'https://mcp.example.com/v1/images',
  body: { imageUrl },
};
```
